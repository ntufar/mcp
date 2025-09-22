/**
 * Get File Metadata Tool
 *
 * MCP tool for retrieving detailed metadata for files and directories.
 * Implements comprehensive metadata operations with security validation.
 */
import { PathValidationService } from '../services/PathValidationService';
import { PermissionService } from '../services/PermissionService';
import { AuditLoggingService } from '../services/AuditLoggingService';
import { Configuration } from '../models/Configuration';
export interface GetFileMetadataToolOptions {
    path: string;
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
export interface GetFileMetadataToolResult {
    success: boolean;
    path: string;
    type: 'file' | 'directory' | 'symlink' | 'unknown';
    exists: boolean;
    accessible: boolean;
    metadata: any;
    error?: string;
    executionTime: number;
    cacheHit: boolean;
}
export declare class GetFileMetadataTool {
    private metadataService;
    constructor(config: Configuration, pathValidationService: PathValidationService, permissionService: PermissionService, auditLoggingService: AuditLoggingService);
    /**
     * Gets metadata for a single file or directory
     */
    execute(options: GetFileMetadataToolOptions, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<GetFileMetadataToolResult>;
    /**
     * Gets metadata for multiple paths in batch
     */
    getBatchMetadata(paths: string[], options: Partial<GetFileMetadataToolOptions> | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<any>;
    /**
     * Gets metadata for all items in a directory
     */
    getDirectoryMetadata(directoryPath: string, options: Partial<GetFileMetadataToolOptions> | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<any>;
    /**
     * Gets metadata statistics
     */
    getMetadataStats(): any;
    /**
     * Clears metadata cache
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
     * Validates array of paths
     */
    private validatePaths;
    /**
     * Gets tool metadata
     */
    static getMetadata(): any;
}
//# sourceMappingURL=GetFileMetadataTool.d.ts.map