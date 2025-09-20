/**
 * Metadata Service
 * 
 * Implements file and directory metadata retrieval with security validation.
 * Provides comprehensive metadata operations with caching and optimization.
 */

import { File, FileData } from '../models/File';
import { Directory, DirectoryData } from '../models/Directory';
import { PermissionInfo } from '../models/PermissionInfo';
import { Configuration } from '../models/Configuration';
import { PathValidationService } from './PathValidationService';
import { PermissionService } from './PermissionService';
import { AuditLoggingService } from './AuditLoggingService';

export interface MetadataOptions {
  includeContentHash?: boolean;
  includePermissions?: boolean;
  includeSymlinkTarget?: boolean;
  includeFileTypes?: boolean;
  includeSize?: boolean;
  includeTimestamps?: boolean;
  includeOwnerInfo?: boolean;
  recursive?: boolean;
  maxDepth?: number;
}

export interface MetadataResult {
  path: string;
  type: 'file' | 'directory' | 'symlink' | 'unknown';
  exists: boolean;
  accessible: boolean;
  metadata: File | Directory | null;
  error?: string;
  executionTime: number;
  cacheHit: boolean;
}

export interface BatchMetadataResult {
  results: MetadataResult[];
  totalResults: number;
  successfulResults: number;
  failedResults: number;
  executionTime: number;
  cacheHit: boolean;
}

export interface MetadataStats {
  totalRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  mostRequestedPaths: Array<{ path: string; count: number }>;
  metadataTypes: Map<string, number>;
}

export class MetadataService {
  private config: Configuration;
  private pathValidationService: PathValidationService;
  private permissionService: PermissionService;
  private auditLoggingService: AuditLoggingService;
  private metadataCache: Map<string, MetadataResult> = new Map();
  private stats: Map<string, number> = new Map();

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
   * Gets metadata for a single file or directory
   */
  async getMetadata(
    path: string,
    options: MetadataOptions = {},
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<MetadataResult> {
    const startTime = Date.now();
    
    try {
      // Validate path
      const pathValidation = this.pathValidationService.validatePathForOperation(
        path,
        'read'
      );

      if (!pathValidation.isValid) {
        await this.auditLoggingService.logFailure(
          context.userId,
          context.clientId,
          context.clientType,
          'get_metadata',
          pathValidation.errorCode || 'PATH_VALIDATION_FAILED',
          pathValidation.errorMessage || 'Path validation failed',
          Date.now() - startTime,
          { targetPath: path }
        );

        return {
          path,
          type: 'unknown',
          exists: false,
          accessible: false,
          metadata: null,
          error: pathValidation.errorMessage || 'Path validation failed',
          executionTime: Date.now() - startTime,
          cacheHit: false,
        };
      }

      const validatedPath = pathValidation.canonicalPath!;

      // Check permissions
      const permissionCheck = await this.permissionService.checkPermission({
        userId: context.userId,
        userGroups: [],
        clientId: context.clientId,
        clientType: context.clientType,
        operation: 'read',
        targetPath: validatedPath,
      });

      if (!permissionCheck.allowed) {
        await this.auditLoggingService.logFailure(
          context.userId,
          context.clientId,
          context.clientType,
          'get_metadata',
          permissionCheck.errorCode || 'PERMISSION_DENIED',
          permissionCheck.reason || 'Permission denied',
          Date.now() - startTime,
          { targetPath: validatedPath }
        );

        return {
          path: validatedPath,
          type: 'unknown',
          exists: true,
          accessible: false,
          metadata: null,
          error: permissionCheck.reason || 'Permission denied',
          executionTime: Date.now() - startTime,
          cacheHit: false,
        };
      }

      // Check cache
      const cacheKey = this.generateCacheKey(validatedPath, options);
      const cachedResult = this.metadataCache.get(cacheKey);
      
      if (cachedResult && !this.isCacheExpired(cacheKey)) {
        cachedResult.cacheHit = true;
        cachedResult.executionTime = Date.now() - startTime;
        
        await this.auditLoggingService.logSuccess(
          context.userId,
          context.clientId,
          context.clientType,
          'get_metadata',
          Date.now() - startTime,
          { targetPath: validatedPath, cacheHit: true }
        );

        return cachedResult;
      }

      // Get metadata
      const result = await this.performMetadataRetrieval(validatedPath, options);
      result.executionTime = Date.now() - startTime;
      result.cacheHit = false;

      // Cache the result
      this.cacheResult(cacheKey, result);

      // Update statistics
      this.updateStats(validatedPath, result.executionTime, result.exists);

      // Log success
      await this.auditLoggingService.logSuccess(
        context.userId,
        context.clientId,
        context.clientType,
        'get_metadata',
        result.executionTime,
        {
          targetPath: validatedPath,
          type: result.type,
          exists: result.exists,
          accessible: result.accessible,
        }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.auditLoggingService.logFailure(
        context.userId,
        context.clientId,
        context.clientType,
        'get_metadata',
        'METADATA_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        duration,
        { targetPath: path }
      );

      return {
        path,
        type: 'unknown',
        exists: false,
        accessible: false,
        metadata: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: duration,
        cacheHit: false,
      };
    }
  }

  /**
   * Gets metadata for multiple paths in batch
   */
  async getBatchMetadata(
    paths: string[],
    options: MetadataOptions = {},
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<BatchMetadataResult> {
    const startTime = Date.now();
    
    try {
      // Process paths in parallel
      const results = await Promise.all(
        paths.map(path => this.getMetadata(path, options, context))
      );

      const successfulResults = results.filter(r => r.exists && r.accessible).length;
      const failedResults = results.length - successfulResults;

      const batchResult: BatchMetadataResult = {
        results,
        totalResults: results.length,
        successfulResults,
        failedResults,
        executionTime: Date.now() - startTime,
        cacheHit: results.some(r => r.cacheHit),
      };

      // Log batch operation
      await this.auditLoggingService.logSuccess(
        context.userId,
        context.clientId,
        context.clientType,
        'get_batch_metadata',
        batchResult.executionTime,
        {
          totalPaths: paths.length,
          successfulResults,
          failedResults,
        }
      );

      return batchResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.auditLoggingService.logFailure(
        context.userId,
        context.clientId,
        context.clientType,
        'get_batch_metadata',
        'BATCH_METADATA_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        duration,
        { totalPaths: paths.length }
      );

      throw error;
    }
  }

  /**
   * Gets metadata for all items in a directory
   */
  async getDirectoryMetadata(
    directoryPath: string,
    options: MetadataOptions = {},
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<BatchMetadataResult> {
    const startTime = Date.now();
    
    try {
      // First, get the directory metadata
      const directoryMetadata = await this.getMetadata(directoryPath, options, context);
      
      if (!directoryMetadata.exists || !directoryMetadata.accessible) {
        throw new Error('Directory not accessible');
      }

      // Simulate getting all items in the directory
      const mockItems = this.generateMockDirectoryItems(directoryPath);
      const itemPaths = mockItems.map(item => item.path);

      // Get metadata for all items
      const results = await this.getBatchMetadata(itemPaths, options, context);

      // Add directory metadata to results
      results.results.unshift(directoryMetadata);
      results.totalResults += 1;
      results.successfulResults += 1;

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.auditLoggingService.logFailure(
        context.userId,
        context.clientId,
        context.clientType,
        'get_directory_metadata',
        'DIRECTORY_METADATA_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        duration,
        { targetPath: directoryPath }
      );

      throw error;
    }
  }

  /**
   * Gets metadata statistics
   */
  getMetadataStats(): MetadataStats {
    const totalRequests = Array.from(this.stats.values()).reduce((sum, count) => sum + count, 0);
    const responseTimes: number[] = []; // Would need to track actual response times
    const averageResponseTime = responseTimes.length > 0 ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

    return {
      totalRequests,
      averageResponseTime,
      cacheHitRate: 0, // Would need to track cache hits
      errorRate: 0, // Would need to track errors
      mostRequestedPaths: [], // Would need to track this
      metadataTypes: new Map([
        ['file', 0],
        ['directory', 0],
        ['symlink', 0],
        ['unknown', 0],
      ]),
    };
  }

  /**
   * Clears metadata cache
   */
  clearCache(path?: string): void {
    if (path) {
      // Clear cache for specific path
      const pathPrefix = path + '|';
      for (const key of this.metadataCache.keys()) {
        if (key.startsWith(pathPrefix)) {
          this.metadataCache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.metadataCache.clear();
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

    for (const result of this.metadataCache.values()) {
      totalAccess++;
      if (result.cacheHit) {
        totalHits++;
      }
      memoryUsage += JSON.stringify(result).length;
    }

    return {
      size: this.metadataCache.size,
      hitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
      memoryUsage,
    };
  }

  // Private methods

  private async performMetadataRetrieval(
    path: string,
    options: MetadataOptions
  ): Promise<MetadataResult> {
    // This is a simulation - in a real implementation, this would read from the file system
    try {
      // Simulate file system metadata retrieval
      const mockStats = this.generateMockStats(path);
      const mockPermissions = PermissionInfo.createFromStats(mockStats);
      
      // Determine if it's a file or directory
      const isDirectory = Math.random() > 0.7; // 30% chance of being a directory
      const isSymlink = Math.random() > 0.9; // 10% chance of being a symlink
      
      let metadata: File | Directory | null = null;
      let type: 'file' | 'directory' | 'symlink' | 'unknown' = 'unknown';

      if (isDirectory) {
        type = 'directory';
        metadata = Directory.createFromFileSystem(
          path,
          mockStats,
          mockPermissions,
          Math.floor(Math.random() * 100),
          Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 1000000)
        );
      } else {
        type = 'file';
        metadata = File.createFromFileSystem(
          path,
          mockStats,
          mockPermissions,
          this.getContentType(path),
          'utf-8'
        );
      }

      if (isSymlink) {
        type = 'symlink';
        // Add symlink target if requested
        if (options.includeSymlinkTarget) {
          metadata = File.createFromFileSystem(
            path,
            { ...mockStats, isSymbolicLink: () => true, targetPath: '/target/path' },
            mockPermissions,
            this.getContentType(path),
            'utf-8'
          );
        }
      }

      return {
        path,
        type,
        exists: true,
        accessible: true,
        metadata,
        executionTime: 0, // Will be set by caller
        cacheHit: false,
      };
    } catch (error) {
      return {
        path,
        type: 'unknown',
        exists: false,
        accessible: false,
        metadata: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: 0, // Will be set by caller
        cacheHit: false,
      };
    }
  }

  private generateMockStats(path: string): any {
    return {
      size: Math.floor(Math.random() * 10000) + 100,
      mtime: new Date(),
      birthtime: new Date(),
      ctime: new Date(),
      mode: 0o644,
      uid: 1000,
      gid: 1000,
      isSymbolicLink: () => false,
    };
  }

  private generateMockDirectoryItems(directoryPath: string): Array<{ path: string; type: string }> {
    const items = [];
    
    // Generate mock files
    for (let i = 0; i < 10; i++) {
      items.push({
        path: `${directoryPath}/file_${i}.txt`,
        type: 'file',
      });
    }

    // Generate mock subdirectories
    for (let i = 0; i < 3; i++) {
      items.push({
        path: `${directoryPath}/subdir_${i}`,
        type: 'directory',
      });
    }

    return items;
  }

  private getContentType(path: string): string {
    const extension = PathValidationService.getFileExtension(path);
    
    const contentTypes: Record<string, string> = {
      txt: 'text/plain',
      json: 'application/json',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      xml: 'application/xml',
      yaml: 'application/yaml',
      yml: 'application/yaml',
      md: 'text/markdown',
      csv: 'text/csv',
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
    };

    return contentTypes[extension] || 'application/octet-stream';
  }

  private generateCacheKey(path: string, options: MetadataOptions): string {
    const key = {
      path,
      includeContentHash: options.includeContentHash,
      includePermissions: options.includePermissions,
      includeSymlinkTarget: options.includeSymlinkTarget,
      includeFileTypes: options.includeFileTypes,
      includeSize: options.includeSize,
      includeTimestamps: options.includeTimestamps,
      includeOwnerInfo: options.includeOwnerInfo,
      recursive: options.recursive,
      maxDepth: options.maxDepth,
    };

    return JSON.stringify(key);
  }

  private isCacheExpired(cacheKey: string): boolean {
    // Simple cache expiration - in a real implementation, this would be more sophisticated
    return false;
  }

  private cacheResult(cacheKey: string, result: MetadataResult): void {
    // Simple caching - in a real implementation, this would use a proper cache with TTL
    this.metadataCache.set(cacheKey, result);
    
    // Limit cache size
    if (this.metadataCache.size > 1000) {
      const firstKey = this.metadataCache.keys().next().value;
      this.metadataCache.delete(firstKey);
    }
  }

  private updateStats(path: string, executionTime: number, exists: boolean): void {
    // Update statistics
    const pathKey = `path:${path}`;
    const currentCount = this.stats.get(pathKey) || 0;
    this.stats.set(pathKey, currentCount + 1);

    const timeKey = 'execution_time';
    const currentTime = this.stats.get(timeKey) || 0;
    this.stats.set(timeKey, currentTime + executionTime);

    const existsKey = exists ? 'exists' : 'not_exists';
    const currentExists = this.stats.get(existsKey) || 0;
    this.stats.set(existsKey, currentExists + 1);
  }
}
