/**
 * File Search Service
 * 
 * Implements file search functionality with security validation.
 * Provides efficient file searching with content and metadata filtering.
 */

import { File, FileData } from '../models/File';
import { Directory, DirectoryData } from '../models/Directory';
import { Configuration } from '../models/Configuration';
import { PathValidationService } from './PathValidationService';
import { PermissionService } from './PermissionService';
import { AuditLoggingService } from './AuditLoggingService';

export interface SearchOptions {
  query: string;
  searchPath: string;
  includeContent?: boolean;
  includeMetadata?: boolean;
  maxResults?: number;
  fileTypes?: string[];
  minSize?: number;
  maxSize?: number;
  dateFrom?: Date;
  dateTo?: Date;
  caseSensitive?: boolean;
  useRegex?: boolean;
  recursive?: boolean;
  maxDepth?: number;
}

export interface SearchResult {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size: number;
  modifiedTime: Date;
  contentType?: string;
  matchType: 'name' | 'content' | 'metadata';
  matchScore: number;
  matchedContent?: string;
  lineNumber?: number;
  context?: string;
}

export interface SearchResults {
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  query: string;
  searchPath: string;
  hasMore: boolean;
  cacheHit: boolean;
  memoryOptimized: boolean;
}

export interface SearchStats {
  totalSearches: number;
  averageSearchTime: number;
  mostSearchedPaths: Array<{ path: string; count: number }>;
  mostSearchedQueries: Array<{ query: string; count: number }>;
  searchTypes: Map<string, number>;
}

export class FileSearchService {
  private config: Configuration;
  private pathValidationService: PathValidationService;
  private permissionService: PermissionService;
  private auditLoggingService: AuditLoggingService;
  private searchCache: Map<string, SearchResults> = new Map();
  private searchStats: Map<string, number> = new Map();

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
   * Searches for files and directories
   */
  async searchFiles(
    options: SearchOptions,
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<SearchResults> {
    const startTime = Date.now();
    
    try {
      // Validate search path
      const pathValidation = this.pathValidationService.validatePathForOperation(
        options.searchPath,
        'list'
      );

      if (!pathValidation.isValid) {
        await this.auditLoggingService.logFailure(
          context.userId,
          context.clientId,
          context.clientType,
          'search_files',
          pathValidation.errorCode || 'PATH_VALIDATION_FAILED',
          pathValidation.errorMessage || 'Path validation failed',
          Date.now() - startTime,
          { targetPath: options.searchPath, searchQuery: options.query }
        );

        throw new Error(pathValidation.errorMessage || 'Path validation failed');
      }

      const validatedSearchPath = pathValidation.canonicalPath!;

      // Check permissions
      const permissionCheck = await this.permissionService.checkPermission({
        userId: context.userId,
        userGroups: [],
        clientId: context.clientId,
        clientType: context.clientType,
        operation: 'list',
        targetPath: validatedSearchPath,
      });

      if (!permissionCheck.allowed) {
        await this.auditLoggingService.logFailure(
          context.userId,
          context.clientId,
          context.clientType,
          'search_files',
          permissionCheck.errorCode || 'PERMISSION_DENIED',
          permissionCheck.reason || 'Permission denied',
          Date.now() - startTime,
          { targetPath: validatedSearchPath, searchQuery: options.query }
        );

        throw new Error(permissionCheck.reason || 'Permission denied');
      }

      // Validate search options
      this.validateSearchOptions(options);

      // Check cache
      const cacheKey = this.generateCacheKey(options);
      const cachedResult = this.searchCache.get(cacheKey);
      
      if (cachedResult && !this.isCacheExpired(cacheKey)) {
        cachedResult.cacheHit = true;
        cachedResult.searchTime = Date.now() - startTime;
        
        await this.auditLoggingService.logSuccess(
          context.userId,
          context.clientId,
          context.clientType,
          'search_files',
          Date.now() - startTime,
          { 
            targetPath: validatedSearchPath, 
            searchQuery: options.query,
            cacheHit: true,
            resultCount: cachedResult.totalResults
          }
        );

        return cachedResult;
      }

      // Perform search
      const result = await this.performSearch(options);
      result.searchTime = Date.now() - startTime;
      result.cacheHit = false;

      // Cache the result
      this.cacheResult(cacheKey, result);

      // Update search statistics
      this.updateSearchStats(options, result);

      // Log success
      await this.auditLoggingService.logSuccess(
        context.userId,
        context.clientId,
        context.clientType,
        'search_files',
        result.searchTime,
        {
          targetPath: validatedSearchPath,
          searchQuery: options.query,
          resultCount: result.totalResults,
        }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.auditLoggingService.logFailure(
        context.userId,
        context.clientId,
        context.clientType,
        'search_files',
        'SEARCH_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        duration,
        { targetPath: options.searchPath, searchQuery: options.query }
      );

      throw error;
    }
  }

  /**
   * Searches for files by name pattern
   */
  async searchByName(
    namePattern: string,
    searchPath: string,
    options: Partial<SearchOptions> = {},
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<SearchResults> {
    const searchOptions: SearchOptions = {
      query: namePattern,
      searchPath,
      includeContent: false,
      includeMetadata: false,
      ...options,
    };

    return this.searchFiles(searchOptions, context);
  }

  /**
   * Searches for files by content
   */
  async searchByContent(
    contentQuery: string,
    searchPath: string,
    options: Partial<SearchOptions> = {},
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<SearchResults> {
    const searchOptions: SearchOptions = {
      query: contentQuery,
      searchPath,
      includeContent: true,
      includeMetadata: false,
      ...options,
    };

    return this.searchFiles(searchOptions, context);
  }

  /**
   * Searches for files by metadata
   */
  async searchByMetadata(
    metadataQuery: string,
    searchPath: string,
    options: Partial<SearchOptions> = {},
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<SearchResults> {
    const searchOptions: SearchOptions = {
      query: metadataQuery,
      searchPath,
      includeContent: false,
      includeMetadata: true,
      ...options,
    };

    return this.searchFiles(searchOptions, context);
  }

  /**
   * Gets search statistics
   */
  getSearchStats(): SearchStats {
    const totalSearches = Array.from(this.searchStats.values()).reduce((sum, count) => sum + count, 0);
    const searchTimes: number[] = []; // Would need to track actual search times
    const averageSearchTime = searchTimes.length > 0 ? searchTimes.reduce((sum, time) => sum + time, 0) / searchTimes.length : 0;

    return {
      totalSearches,
      averageSearchTime,
      mostSearchedPaths: [], // Would need to track this
      mostSearchedQueries: [], // Would need to track this
      searchTypes: new Map([
        ['name', 0],
        ['content', 0],
        ['metadata', 0],
      ]),
    };
  }

  /**
   * Clears search cache
   */
  clearCache(searchPath?: string): void {
    if (searchPath) {
      // Clear cache for specific path
      const pathPrefix = searchPath + '|';
      for (const key of this.searchCache.keys()) {
        if (key.startsWith(pathPrefix)) {
          this.searchCache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.searchCache.clear();
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

    for (const result of this.searchCache.values()) {
      totalAccess++;
      if (result.cacheHit) {
        totalHits++;
      }
      memoryUsage += JSON.stringify(result).length;
    }

    return {
      size: this.searchCache.size,
      hitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
      memoryUsage,
    };
  }

  // Private methods

  private validateSearchOptions(options: SearchOptions): void {
    if (!options.query || typeof options.query !== 'string') {
      throw new Error('Search query is required');
    }

    if (options.query.length === 0) {
      throw new Error('Search query cannot be empty');
    }

    if (options.query.length > 1000) {
      throw new Error('Search query too long (max 1000 characters)');
    }

    if (!options.searchPath || typeof options.searchPath !== 'string') {
      throw new Error('Search path is required');
    }

    if (options.maxResults !== undefined && (options.maxResults < 1 || options.maxResults > 10000)) {
      throw new Error('Max results must be between 1 and 10000');
    }

    if (options.maxDepth !== undefined && (options.maxDepth < 1 || options.maxDepth > 20)) {
      throw new Error('Max depth must be between 1 and 20');
    }

    if (options.minSize !== undefined && options.minSize < 0) {
      throw new Error('Min size cannot be negative');
    }

    if (options.maxSize !== undefined && options.maxSize < 0) {
      throw new Error('Max size cannot be negative');
    }

    if (options.minSize !== undefined && options.maxSize !== undefined && options.minSize > options.maxSize) {
      throw new Error('Min size cannot be greater than max size');
    }

    if (options.dateFrom && options.dateTo && options.dateFrom > options.dateTo) {
      throw new Error('Date from cannot be after date to');
    }
  }

  private async performSearch(options: SearchOptions): Promise<SearchResults> {
    // This is a simulation - in a real implementation, this would perform actual file system search
    const results: SearchResult[] = [];
    const maxResults = options.maxResults || 100;
    const searchDepth = options.maxDepth || 10;

    // Generate mock search results
    const mockResults = this.generateMockSearchResults(options, maxResults, searchDepth);
    
    // Filter results based on options
    const filteredResults = this.filterSearchResults(mockResults, options);
    
    // Sort results by relevance
    const sortedResults = this.sortSearchResults(filteredResults, options.query);

    // Apply result limit
    const limitedResults = sortedResults.slice(0, maxResults);

    return {
      results: limitedResults,
      totalResults: limitedResults.length,
      searchTime: 0, // Will be set by caller
      query: options.query,
      searchPath: options.searchPath,
      hasMore: sortedResults.length > maxResults,
      cacheHit: false,
      memoryOptimized: false,
    };
  }

  private generateMockSearchResults(
    options: SearchOptions,
    maxResults: number,
    searchDepth: number
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const basePath = options.searchPath;
    const query = options.query.toLowerCase();

    // Generate mock files and directories
    for (let i = 0; i < Math.min(maxResults * 2, 200); i++) {
      const fileName = `file_${i}_${query}_test.txt`;
      const filePath = `${basePath}/${fileName}`;
      
      // Simulate name matching
      if (fileName.toLowerCase().includes(query)) {
        results.push({
          path: filePath,
          name: fileName,
          type: 'file',
          size: Math.floor(Math.random() * 10000) + 100,
          modifiedTime: new Date(),
          contentType: 'text/plain',
          matchType: 'name',
          matchScore: this.calculateMatchScore(fileName, query),
          matchedContent: options.includeContent ? `Mock content containing ${query}` : undefined,
        });
      }

      // Simulate directory matching
      if (i % 10 === 0) {
        const dirName = `dir_${i}_${query}_folder`;
        const dirPath = `${basePath}/${dirName}`;
        
        if (dirName.toLowerCase().includes(query)) {
          results.push({
            path: dirPath,
            name: dirName,
            type: 'directory',
            size: 0,
            modifiedTime: new Date(),
            matchType: 'name',
            matchScore: this.calculateMatchScore(dirName, query),
          });
        }
      }
    }

    // Simulate content matching
    if (options.includeContent) {
      for (let i = 0; i < 50; i++) {
        const fileName = `content_file_${i}.txt`;
        const filePath = `${basePath}/${fileName}`;
        
        // Simulate content match
        if (Math.random() > 0.7) {
          results.push({
            path: filePath,
            name: fileName,
            type: 'file',
            size: Math.floor(Math.random() * 5000) + 100,
            modifiedTime: new Date(),
            contentType: 'text/plain',
            matchType: 'content',
            matchScore: this.calculateMatchScore(`content with ${query}`, query),
            matchedContent: `This file contains the search term "${query}" in its content.`,
            lineNumber: Math.floor(Math.random() * 100) + 1,
            context: `Line ${Math.floor(Math.random() * 100) + 1}: ...text before ${query} text after...`,
          });
        }
      }
    }

    return results;
  }

  private filterSearchResults(results: SearchResult[], options: SearchOptions): SearchResult[] {
    return results.filter(result => {
      // Filter by file types
      if (options.fileTypes && options.fileTypes.length > 0) {
        const extension = PathValidationService.getFileExtension(result.path);
        if (!options.fileTypes.includes(extension)) {
          return false;
        }
      }

      // Filter by size
      if (options.minSize !== undefined && result.size < options.minSize) {
        return false;
      }

      if (options.maxSize !== undefined && result.size > options.maxSize) {
        return false;
      }

      // Filter by date
      if (options.dateFrom && result.modifiedTime < options.dateFrom) {
        return false;
      }

      if (options.dateTo && result.modifiedTime > options.dateTo) {
        return false;
      }

      return true;
    });
  }

  private sortSearchResults(results: SearchResult[], query: string): SearchResult[] {
    return results.sort((a, b) => {
      // Sort by match score (higher is better)
      if (a.matchScore !== b.matchScore) {
        return b.matchScore - a.matchScore;
      }

      // Then by match type (name matches are more relevant than content matches)
      const typeOrder = { 'name': 0, 'metadata': 1, 'content': 2 };
      if (typeOrder[a.matchType] !== typeOrder[b.matchType]) {
        return typeOrder[a.matchType] - typeOrder[b.matchType];
      }

      // Then by file type (files before directories)
      if (a.type !== b.type) {
        return a.type === 'file' ? -1 : 1;
      }

      // Finally by name
      return a.name.localeCompare(b.name);
    });
  }

  private calculateMatchScore(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match gets highest score
    if (textLower === queryLower) {
      return 100;
    }

    // Starts with query gets high score
    if (textLower.startsWith(queryLower)) {
      return 90;
    }

    // Contains query gets medium score
    if (textLower.includes(queryLower)) {
      return 70;
    }

    // Fuzzy matching for partial matches
    let score = 0;
    let queryIndex = 0;
    
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        score += 10;
        queryIndex++;
      }
    }

    // Normalize score based on query length
    return Math.min(score, 60);
  }

  private generateCacheKey(options: SearchOptions): string {
    const key = {
      query: options.query,
      searchPath: options.searchPath,
      includeContent: options.includeContent,
      includeMetadata: options.includeMetadata,
      maxResults: options.maxResults,
      fileTypes: options.fileTypes,
      minSize: options.minSize,
      maxSize: options.maxSize,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      caseSensitive: options.caseSensitive,
      useRegex: options.useRegex,
      recursive: options.recursive,
      maxDepth: options.maxDepth,
    };

    return JSON.stringify(key);
  }

  private isCacheExpired(cacheKey: string): boolean {
    // Simple cache expiration - in a real implementation, this would be more sophisticated
    return false;
  }

  private cacheResult(cacheKey: string, result: SearchResults): void {
    // Simple caching - in a real implementation, this would use a proper cache with TTL
    this.searchCache.set(cacheKey, result);
    
    // Limit cache size
    if (this.searchCache.size > 1000) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
  }

  private updateSearchStats(options: SearchOptions, result: SearchResults): void {
    // Update search statistics
    const searchKey = `${options.searchPath}:${options.query}`;
    const currentCount = this.searchStats.get(searchKey) || 0;
    this.searchStats.set(searchKey, currentCount + 1);
  }
}
