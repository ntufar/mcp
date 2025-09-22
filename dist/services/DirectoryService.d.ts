/**
 * Directory Service
 *
 * Implements directory listing and management with security validation.
 * Provides efficient directory traversal with caching and streaming.
 */
import { Directory } from '../models/Directory';
import { File } from '../models/File';
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
export declare class DirectoryService {
    private config;
    private pathValidationService;
    private permissionService;
    private auditLoggingService;
    private cache;
    constructor(config: Configuration, pathValidationService: PathValidationService, permissionService: PermissionService, auditLoggingService: AuditLoggingService);
    /**
     * Lists directory contents with security validation
     */
    listDirectory(path: string, options: DirectoryListingOptions | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<DirectoryListingResult>;
    /**
     * Gets directory statistics
     */
    getDirectoryStats(path: string, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<DirectoryStats>;
    /**
     * Streams directory contents for large directories
     */
    streamDirectoryListing(path: string, options: DirectoryListingOptions | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): AsyncGenerator<DirectoryListingResult, void, unknown>;
    /**
     * Clears directory cache
     */
    clearCache(path?: string): void;
    /**
     * Gets cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
        memoryUsage: number;
    };
    private performDirectoryListing;
    private generateMockEntries;
    private sortEntries;
    private calculateDirectoryStats;
    private generateCacheKey;
    private isCacheExpired;
    private cacheResult;
}
//# sourceMappingURL=DirectoryService.d.ts.map