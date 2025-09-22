/**
 * File Search Service
 *
 * Implements file search functionality with security validation.
 * Provides efficient file searching with content and metadata filtering.
 */
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
    mostSearchedPaths: Array<{
        path: string;
        count: number;
    }>;
    mostSearchedQueries: Array<{
        query: string;
        count: number;
    }>;
    searchTypes: Map<string, number>;
}
export declare class FileSearchService {
    private config;
    private pathValidationService;
    private permissionService;
    private auditLoggingService;
    private searchCache;
    private searchStats;
    constructor(config: Configuration, pathValidationService: PathValidationService, permissionService: PermissionService, auditLoggingService: AuditLoggingService);
    /**
     * Searches for files and directories
     */
    searchFiles(options: SearchOptions, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<SearchResults>;
    /**
     * Searches for files by name pattern
     */
    searchByName(namePattern: string, searchPath: string, options: Partial<SearchOptions> | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<SearchResults>;
    /**
     * Searches for files by content
     */
    searchByContent(contentQuery: string, searchPath: string, options: Partial<SearchOptions> | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<SearchResults>;
    /**
     * Searches for files by metadata
     */
    searchByMetadata(metadataQuery: string, searchPath: string, options: Partial<SearchOptions> | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<SearchResults>;
    /**
     * Gets search statistics
     */
    getSearchStats(): SearchStats;
    /**
     * Clears search cache
     */
    clearCache(searchPath?: string): void;
    /**
     * Gets cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
        memoryUsage: number;
    };
    private validateSearchOptions;
    private performSearch;
    private generateMockSearchResults;
    private filterSearchResults;
    private sortSearchResults;
    private calculateMatchScore;
    private generateCacheKey;
    private isCacheExpired;
    private cacheResult;
    private updateSearchStats;
}
//# sourceMappingURL=FileSearchService.d.ts.map