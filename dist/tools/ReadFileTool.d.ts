/**
 * Read File Tool
 *
 * MCP tool for reading file contents with security validation and streaming.
 * Implements comprehensive file access with caching and audit logging.
 */
import { PathValidationService } from '../services/PathValidationService';
import { PermissionService } from '../services/PermissionService';
import { AuditLoggingService } from '../services/AuditLoggingService';
import { Configuration } from '../models/Configuration';
export interface ReadFileToolOptions {
    path: string;
    encoding?: string;
    maxSize?: number;
    offset?: number;
    length?: number;
    includeMetadata?: boolean;
    generateHash?: boolean;
    streaming?: boolean;
}
export interface ReadFileToolResult {
    success: boolean;
    content: string | Buffer;
    metadata: any;
    contentHash?: string;
    encoding: string;
    size: number;
    executionTime: number;
    cacheHit: boolean;
    memoryOptimized: boolean;
    error?: string;
}
export declare class ReadFileTool {
    private fileService;
    constructor(config: Configuration, pathValidationService: PathValidationService, permissionService: PermissionService, auditLoggingService: AuditLoggingService);
    /**
     * Reads file content
     */
    execute(options: ReadFileToolOptions, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<ReadFileToolResult>;
    /**
     * Streams file content for large files
     */
    streamFile(options: ReadFileToolOptions, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<any>;
    /**
     * Gets file metadata
     */
    getFileMetadata(path: string, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<any>;
    /**
     * Checks file access
     */
    checkFileAccess(path: string, context: {
        userId: string;
        clientId: string;
        clientType: string;
    }): Promise<any>;
    /**
     * Clears file cache
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
//# sourceMappingURL=ReadFileTool.d.ts.map