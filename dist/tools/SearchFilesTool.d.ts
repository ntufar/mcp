/**
 * Search Files Tool
 *
 * MCP tool for searching files by name, content, or metadata.
 * Implements comprehensive search functionality with security validation.
 */
import { PathValidationService } from '../services/PathValidationService';
import { PermissionService } from '../services/PermissionService';
import { AuditLoggingService } from '../services/AuditLoggingService';
import { Configuration } from '../models/Configuration';
export interface SearchFilesToolOptions {
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
export interface SearchFilesToolResult {
    success: boolean;
    results: any[];
    totalResults: number;
    searchTime: number;
    query: string;
    searchPath: string;
    hasMore: boolean;
    cacheHit: boolean;
    memoryOptimized: boolean;
    error?: string;
}
export declare class SearchFilesTool {
    private fileSearchService;
    constructor(config: Configuration, pathValidationService: PathValidationService, permissionService: PermissionService, auditLoggingService: AuditLoggingService);
    /**
     * Searches for files
     */
    execute(options: SearchFilesToolOptions, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<SearchFilesToolResult>;
    /**
     * Searches files by name pattern
     */
    searchByName(namePattern: string, searchPath: string, options: Partial<SearchFilesToolOptions> | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<SearchFilesToolResult>;
    /**
     * Searches files by content
     */
    searchByContent(contentQuery: string, searchPath: string, options: Partial<SearchFilesToolOptions> | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<SearchFilesToolResult>;
    /**
     * Searches files by metadata
     */
    searchByMetadata(metadataQuery: string, searchPath: string, options: Partial<SearchFilesToolOptions> | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<SearchFilesToolResult>;
    /**
     * Gets search statistics
     */
    getSearchStats(): any;
    /**
     * Clears search cache
     */
    clearCache(searchPath?: string): void;
    /**
     * Gets cache statistics
     */
    getCacheStats(): any;
    /**
     * Validates tool options
     */
    private validateOptions;
    /**
     * Gets tool metadata
     */
    static getMetadata(): any;
}
//# sourceMappingURL=SearchFilesTool.d.ts.map