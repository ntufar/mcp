/**
 * Metadata Service
 *
 * Implements file and directory metadata retrieval with security validation.
 * Provides comprehensive metadata operations with caching and optimization.
 */
import { File } from '../models/File';
import { Directory } from '../models/Directory';
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
    mostRequestedPaths: Array<{
        path: string;
        count: number;
    }>;
    metadataTypes: Map<string, number>;
}
export declare class MetadataService {
    private config;
    private pathValidationService;
    private permissionService;
    private auditLoggingService;
    private metadataCache;
    private stats;
    constructor(config: Configuration, pathValidationService: PathValidationService, permissionService: PermissionService, auditLoggingService: AuditLoggingService);
    /**
     * Gets metadata for a single file or directory
     */
    getMetadata(path: string, options: MetadataOptions | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<MetadataResult>;
    /**
     * Gets metadata for multiple paths in batch
     */
    getBatchMetadata(paths: string[], options: MetadataOptions | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<BatchMetadataResult>;
    /**
     * Gets metadata for all items in a directory
     */
    getDirectoryMetadata(directoryPath: string, options: MetadataOptions | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<BatchMetadataResult>;
    /**
     * Gets metadata statistics
     */
    getMetadataStats(): MetadataStats;
    /**
     * Clears metadata cache
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
    private performMetadataRetrieval;
    private generateMockStats;
    private generateMockDirectoryItems;
    private getContentType;
    private generateCacheKey;
    private isCacheExpired;
    private cacheResult;
    private updateStats;
}
//# sourceMappingURL=MetadataService.d.ts.map