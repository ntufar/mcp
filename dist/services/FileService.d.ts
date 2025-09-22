/**
 * File Service
 *
 * Implements file reading and metadata operations with security validation.
 * Provides efficient file access with streaming and caching.
 */
import { File } from '../models/File';
import { PermissionInfo } from '../models/PermissionInfo';
import { Configuration } from '../models/Configuration';
import { PathValidationService } from './PathValidationService';
import { PermissionService } from './PermissionService';
import { AuditLoggingService } from './AuditLoggingService';
export interface FileReadOptions {
    encoding?: string;
    maxSize?: number;
    offset?: number;
    length?: number;
    includeMetadata?: boolean;
    generateHash?: boolean;
}
export interface FileReadResult {
    content: string | Buffer;
    metadata: File;
    contentHash?: string;
    encoding: string;
    size: number;
    executionTime: number;
    cacheHit: boolean;
    memoryOptimized: boolean;
}
export interface FileMetadataResult {
    metadata: File;
    executionTime: number;
    cacheHit: boolean;
}
export interface FileStreamResult {
    stream: ReadableStream;
    metadata: File;
    contentHash?: string;
    size: number;
    executionTime: number;
}
export declare class FileService {
    private config;
    private pathValidationService;
    private permissionService;
    private auditLoggingService;
    private metadataCache;
    private contentCache;
    constructor(config: Configuration, pathValidationService: PathValidationService, permissionService: PermissionService, auditLoggingService: AuditLoggingService);
    /**
     * Reads file content with security validation
     */
    readFile(path: string, options: FileReadOptions | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<FileReadResult>;
    /**
     * Gets file metadata
     */
    getFileMetadata(path: string, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<FileMetadataResult>;
    /**
     * Streams file content for large files
     */
    streamFile(path: string, options: FileReadOptions | undefined, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<FileStreamResult>;
    /**
     * Checks if file exists and is accessible
     */
    checkFileAccess(path: string, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<{
        exists: boolean;
        accessible: boolean;
        permissions: PermissionInfo | null;
        executionTime: number;
    }>;
    /**
     * Clears file caches
     */
    clearCache(path?: string): void;
    /**
     * Gets cache statistics
     */
    getCacheStats(): {
        contentCacheSize: number;
        metadataCacheSize: number;
        contentCacheHitRate: number;
        metadataCacheHitRate: number;
        memoryUsage: number;
    };
    private performFileRead;
    private performMetadataRead;
    private performFileStream;
    private generateMockContent;
    private generateMockMetadata;
    private getContentType;
    private generateCacheKey;
    private isCacheExpired;
    private cacheResult;
}
//# sourceMappingURL=FileService.d.ts.map