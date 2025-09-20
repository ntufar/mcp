/**
 * Directory Service
 * 
 * Implements directory listing and management with security validation.
 * Provides efficient directory traversal with caching and streaming.
 */

import { Directory, DirectoryData } from '../models/Directory';
import { File, FileData } from '../models/File';
import { PermissionInfo } from '../models/PermissionInfo';
import { Configuration } from '../models/Configuration';
import { PathValidationService } from './PathValidationService';
import { PermissionService } from './PermissionService';
import { AuditLoggingService } from './AuditLoggingService';

export interface DirectoryListingOptions {
  includeHidden?: boolean;
  maxDepth?: number;
  sortBy?: 'name' | 'size' | 'modified' | 'type';
  sortOrder?: 'asc' | 'desc';
  maxResults?: number;
  includeMetadata?: boolean;
  followSymbolicLinks?: boolean;
}

export interface DirectoryListingResult {
  path: string;
  directories: Directory[];
  files: File[];
  totalDirectories: number;
  totalFiles: number;
  totalSize: number;
  maxDepthReached: boolean;
  hasMore: boolean;
  executionTime: number;
  cacheHit: boolean;
  memoryOptimized: boolean;
}

export interface DirectoryStats {
  path: string;
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  averageFileSize: number;
  largestFile?: File;
  newestFile?: File;
  oldestFile?: File;
  fileTypes: Map<string, number>;
  depth: number;
  lastModified: Date;
}

export class DirectoryService {
  private config: Configuration;
  private pathValidationService: PathValidationService;
  private permissionService: PermissionService;
  private auditLoggingService: AuditLoggingService;
  private cache: Map<string, DirectoryListingResult> = new Map();

  constructor(
    config: Configuration,
    pathValidationService: PathValidationService,
    permissionService: PermissionService,
    auditLoggingService: AuditLoggingService
  ) {
    this.config = config;
    this.pathValidationService = pathValidationService;
    this.permissionService = permissionService;
    this.auditLoggingService = auditLoggingService;
  }

  /**
   * Lists directory contents with security validation
   */
  async listDirectory(
    path: string,
    options: DirectoryListingOptions = {},
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<DirectoryListingResult> {
    const startTime = Date.now();
    
    try {
      // Validate path
      const pathValidation = this.pathValidationService.validatePathForOperation(
        path,
        'list',
        {
          allowSymbolicLinks: options.followSymbolicLinks,
          maxDepth: options.maxDepth,
        }
      );

      if (!pathValidation.isValid) {
        await this.auditLoggingService.logFailure(
          context.userId,
          context.clientId,
          context.clientType,
          'list_directory',
          pathValidation.errorCode || 'PATH_VALIDATION_FAILED',
          pathValidation.errorMessage || 'Path validation failed',
          Date.now() - startTime,
          { targetPath: path }
        );

        throw new Error(pathValidation.errorMessage || 'Path validation failed');
      }

      const validatedPath = pathValidation.canonicalPath!;

      // Check permissions
      const permissionCheck = await this.permissionService.checkPermission({
        userId: context.userId,
        userGroups: [],
        clientId: context.clientId,
        clientType: context.clientType,
        operation: 'list',
        targetPath: validatedPath,
      });

      if (!permissionCheck.allowed) {
        await this.auditLoggingService.logFailure(
          context.userId,
          context.clientId,
          context.clientType,
          'list_directory',
          permissionCheck.errorCode || 'PERMISSION_DENIED',
          permissionCheck.reason || 'Permission denied',
          Date.now() - startTime,
          { targetPath: validatedPath }
        );

        throw new Error(permissionCheck.reason || 'Permission denied');
      }

      // Check cache
      const cacheKey = this.generateCacheKey(validatedPath, options);
      const cachedResult = this.cache.get(cacheKey);
      
      if (cachedResult && !this.isCacheExpired(cacheKey)) {
        cachedResult.cacheHit = true;
        cachedResult.executionTime = Date.now() - startTime;
        
        await this.auditLoggingService.logSuccess(
          context.userId,
          context.clientId,
          context.clientType,
          'list_directory',
          Date.now() - startTime,
          { targetPath: validatedPath, cacheHit: true }
        );

        return cachedResult;
      }

      // Perform directory listing
      const result = await this.performDirectoryListing(validatedPath, options);
      result.executionTime = Date.now() - startTime;
      result.cacheHit = false;

      // Cache the result
      this.cacheResult(cacheKey, result);

      // Log success
      await this.auditLoggingService.logSuccess(
        context.userId,
        context.clientId,
        context.clientType,
        'list_directory',
        result.executionTime,
        {
          targetPath: validatedPath,
          totalDirectories: result.totalDirectories,
          totalFiles: result.totalFiles,
          resultCount: result.directories.length + result.files.length,
        }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.auditLoggingService.logFailure(
        context.userId,
        context.clientId,
        context.clientType,
        'list_directory',
        'DIRECTORY_LISTING_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        duration,
        { targetPath: path }
      );

      throw error;
    }
  }

  /**
   * Gets directory statistics
   */
  async getDirectoryStats(
    path: string,
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<DirectoryStats> {
    const startTime = Date.now();
    
    try {
      // Validate path
      const pathValidation = this.pathValidationService.validatePathForOperation(path, 'list');
      if (!pathValidation.isValid) {
        throw new Error(pathValidation.errorMessage || 'Path validation failed');
      }

      // Check permissions
      const permissionCheck = await this.permissionService.checkPermission({
        userId: context.userId,
        userGroups: [],
        clientId: context.clientId,
        clientType: context.clientType,
        operation: 'list',
        targetPath: pathValidation.canonicalPath!,
      });

      if (!permissionCheck.allowed) {
        throw new Error(permissionCheck.reason || 'Permission denied');
      }

      // Get directory listing for stats
      const listing = await this.performDirectoryListing(pathValidation.canonicalPath!, {
        includeHidden: true,
        includeMetadata: true,
      });

      // Calculate statistics
      const stats = this.calculateDirectoryStats(listing);

      // Log success
      await this.auditLoggingService.logSuccess(
        context.userId,
        context.clientId,
        context.clientType,
        'get_directory_stats',
        Date.now() - startTime,
        { targetPath: pathValidation.canonicalPath! }
      );

      return stats;
    } catch (error) {
      await this.auditLoggingService.logFailure(
        context.userId,
        context.clientId,
        context.clientType,
        'get_directory_stats',
        'STATS_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        Date.now() - startTime,
        { targetPath: path }
      );

      throw error;
    }
  }

  /**
   * Streams directory contents for large directories
   */
  async* streamDirectoryListing(
    path: string,
    options: DirectoryListingOptions = {},
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): AsyncGenerator<DirectoryListingResult, void, unknown> {
    const startTime = Date.now();
    
    try {
      // Validate path
      const pathValidation = this.pathValidationService.validatePathForOperation(path, 'list');
      if (!pathValidation.isValid) {
        throw new Error(pathValidation.errorMessage || 'Path validation failed');
      }

      // Check permissions
      const permissionCheck = await this.permissionService.checkPermission({
        userId: context.userId,
        userGroups: [],
        clientId: context.clientId,
        clientType: context.clientType,
        operation: 'list',
        targetPath: pathValidation.canonicalPath!,
      });

      if (!permissionCheck.allowed) {
        throw new Error(permissionCheck.reason || 'Permission denied');
      }

      // Stream directory contents in batches
      const batchSize = options.maxResults || 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const batchOptions = {
          ...options,
          maxResults: batchSize,
          offset,
        };

        const batch = await this.performDirectoryListing(
          pathValidation.canonicalPath!,
          batchOptions
        );

        batch.hasMore = batch.directories.length + batch.files.length === batchSize;
        batch.executionTime = Date.now() - startTime;

        yield batch;

        hasMore = batch.hasMore;
        offset += batchSize;

        // Memory optimization: limit total results
        if (offset > 50000) {
          break;
        }
      }

      // Log success
      await this.auditLoggingService.logSuccess(
        context.userId,
        context.clientId,
        context.clientType,
        'stream_directory_listing',
        Date.now() - startTime,
        { targetPath: pathValidation.canonicalPath! }
      );
    } catch (error) {
      await this.auditLoggingService.logFailure(
        context.userId,
        context.clientId,
        context.clientType,
        'stream_directory_listing',
        'STREAM_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        Date.now() - startTime,
        { targetPath: path }
      );

      throw error;
    }
  }

  /**
   * Clears directory cache
   */
  clearCache(path?: string): void {
    if (path) {
      // Clear cache for specific path
      const pathPrefix = path + '|';
      for (const key of this.cache.keys()) {
        if (key.startsWith(pathPrefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.cache.clear();
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
  } {
    let totalHits = 0;
    let totalAccess = 0;
    let memoryUsage = 0;

    for (const result of this.cache.values()) {
      totalAccess++;
      if (result.cacheHit) {
        totalHits++;
      }
      memoryUsage += JSON.stringify(result).length;
    }

    return {
      size: this.cache.size,
      hitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
      memoryUsage,
    };
  }

  // Private methods

  private async performDirectoryListing(
    path: string,
    options: DirectoryListingOptions
  ): Promise<DirectoryListingResult> {
    // This is a simulation - in a real implementation, this would use the file system
    const directories: Directory[] = [];
    const files: File[] = [];
    let totalSize = 0;
    let maxDepthReached = false;

    // Simulate directory listing
    const mockEntries = this.generateMockEntries(path, options);
    
    for (const entry of mockEntries) {
      if (entry.isDirectory) {
        const directory = Directory.createFromFileSystem(
          entry.path,
          entry.stats,
          entry.permissions,
          entry.fileCount || 0,
          entry.subdirectoryCount || 0,
          entry.totalSize || 0
        );
        directories.push(directory);
      } else {
        const file = File.createFromFileSystem(
          entry.path,
          entry.stats,
          entry.permissions,
          entry.contentType,
          entry.encoding
        );
        files.push(file);
        totalSize += file.size;
      }
    }

    // Apply sorting
    this.sortEntries(directories, files, options.sortBy, options.sortOrder);

    // Apply result limits
    const maxResults = options.maxResults || 1000;
    const hasMore = directories.length + files.length > maxResults;
    
    if (hasMore) {
      directories.splice(maxResults);
      files.splice(Math.max(0, maxResults - directories.length));
    }

    return {
      path,
      directories,
      files,
      totalDirectories: directories.length,
      totalFiles: files.length,
      totalSize,
      maxDepthReached,
      hasMore,
      executionTime: 0, // Will be set by caller
      cacheHit: false,
      memoryOptimized: false,
    };
  }

  private generateMockEntries(path: string, options: DirectoryListingOptions): any[] {
    // This is a simulation - in a real implementation, this would read from the file system
    const entries = [];
    
    // Generate some mock directories
    for (let i = 0; i < 5; i++) {
      entries.push({
        path: `${path}/dir_${i}`,
        isDirectory: true,
        stats: {
          mtime: new Date(),
          birthtime: new Date(),
          ctime: new Date(),
          isSymbolicLink: () => false,
        },
        permissions: PermissionInfo.createFromStats({
          mode: 0o755,
          uid: 1000,
          gid: 1000,
        }),
        fileCount: Math.floor(Math.random() * 100),
        subdirectoryCount: Math.floor(Math.random() * 10),
        totalSize: Math.floor(Math.random() * 1000000),
      });
    }

    // Generate some mock files
    for (let i = 0; i < 20; i++) {
      entries.push({
        path: `${path}/file_${i}.txt`,
        isDirectory: false,
        stats: {
          size: Math.floor(Math.random() * 10000),
          mtime: new Date(),
          birthtime: new Date(),
          ctime: new Date(),
          isSymbolicLink: () => false,
        },
        permissions: PermissionInfo.createFromStats({
          mode: 0o644,
          uid: 1000,
          gid: 1000,
        }),
        contentType: 'text/plain',
        encoding: 'utf-8',
      });
    }

    return entries;
  }

  private sortEntries(
    directories: Directory[],
    files: File[],
    sortBy?: string,
    sortOrder?: string
  ): void {
    const order = sortOrder === 'desc' ? -1 : 1;

    const sortFunction = (a: any, b: any) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'modified':
          aValue = a.modifiedTime.getTime();
          bValue = b.modifiedTime.getTime();
          break;
        case 'type':
          aValue = a.contentType || 'directory';
          bValue = b.contentType || 'directory';
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return -1 * order;
      if (aValue > bValue) return 1 * order;
      return 0;
    };

    directories.sort(sortFunction);
    files.sort(sortFunction);
  }

  private calculateDirectoryStats(listing: DirectoryListingResult): DirectoryStats {
    const fileTypes = new Map<string, number>();
    let totalFileSize = 0;
    let largestFile: File | undefined;
    let newestFile: File | undefined;
    let oldestFile: File | undefined;

    for (const file of listing.files) {
      // Count file types
      const extension = file.getExtension();
      const count = fileTypes.get(extension) || 0;
      fileTypes.set(extension, count + 1);

      // Track largest file
      if (!largestFile || file.size > largestFile.size) {
        largestFile = file;
      }

      // Track newest file
      if (!newestFile || file.modifiedTime > newestFile.modifiedTime) {
        newestFile = file;
      }

      // Track oldest file
      if (!oldestFile || file.modifiedTime < oldestFile.modifiedTime) {
        oldestFile = file;
      }

      totalFileSize += file.size;
    }

    const averageFileSize = listing.files.length > 0 ? totalFileSize / listing.files.length : 0;

    return {
      path: listing.path,
      totalFiles: listing.totalFiles,
      totalDirectories: listing.totalDirectories,
      totalSize: listing.totalSize,
      averageFileSize,
      largestFile,
      newestFile,
      oldestFile,
      fileTypes,
      depth: this.pathValidationService.getPathDepth(listing.path),
      lastModified: newestFile?.modifiedTime || new Date(),
    };
  }

  private generateCacheKey(path: string, options: DirectoryListingOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${path}|${optionsStr}`;
  }

  private isCacheExpired(cacheKey: string): boolean {
    // Simple cache expiration - in a real implementation, this would be more sophisticated
    return false;
  }

  private cacheResult(cacheKey: string, result: DirectoryListingResult): void {
    // Simple caching - in a real implementation, this would use a proper cache with TTL
    this.cache.set(cacheKey, result);
    
    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}
