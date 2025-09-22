/**
 * List Directory Tool
 *
 * MCP tool for listing directory contents with comprehensive filtering and sorting.
 * Implements security validation and audit logging.
 */
import { PathValidationService } from '../services/PathValidationService';
import { PermissionService } from '../services/PermissionService';
import { AuditLoggingService } from '../services/AuditLoggingService';
import { Configuration } from '../models/Configuration';
export interface ListDirectoryToolOptions {
    path: string;
    includeHidden?: boolean;
    maxDepth?: number;
    sortBy?: 'name' | 'size' | 'modified' | 'type';
    sortOrder?: 'asc' | 'desc';
    maxResults?: number;
    includeMetadata?: boolean;
    followSymbolicLinks?: boolean;
    recursive?: boolean;
}
export interface ListDirectoryToolResult {
    success: boolean;
    path: string;
    directories: any[];
    files: any[];
    totalDirectories: number;
    totalFiles: number;
    totalSize: number;
    maxDepthReached: boolean;
    hasMore: boolean;
    executionTime: number;
    cacheHit: boolean;
    memoryOptimized: boolean;
    error?: string;
}
export declare class ListDirectoryTool {
    private directoryService;
    constructor(config: Configuration, pathValidationService: PathValidationService, permissionService: PermissionService, auditLoggingService: AuditLoggingService);
    /**
     * Lists directory contents
     */
    execute(options: ListDirectoryToolOptions, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<ListDirectoryToolResult>;
    /**
     * Gets directory statistics
     */
    getDirectoryStats(path: string, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<any>;
    /**
     * Streams directory contents for large directories
     */
    streamDirectoryListing(path: string, options: Partial<ListDirectoryToolOptions> | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): AsyncGenerator<ListDirectoryToolResult, void, unknown>;
    /**
     * Clears directory cache
     */
    clearCache(path?: string): void;
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
//# sourceMappingURL=ListDirectoryTool.d.ts.map