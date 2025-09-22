/**
 * File System Integration
 *
 * Integrates all services with actual file system operations.
 * Provides the main integration layer between MCP tools and file system.
 */
import { Configuration } from '../models/Configuration';
export interface IntegrationContext {
    userId: string;
    clientId: string;
    clientType: string;
    sessionId?: string;
    ipAddress?: string;
    requestId: string;
    operation: string;
    timestamp: Date;
}
export interface IntegrationStats {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    serviceStats: Map<string, any>;
}
export declare class FileSystemIntegration {
    private config;
    private pathValidationService;
    private permissionService;
    private auditLoggingService;
    private directoryService;
    private fileService;
    private fileSearchService;
    private metadataService;
    private cacheService;
    private cacheInvalidationService;
    private validationService;
    private responseService;
    private errorHandler;
    private stats;
    constructor(config: Configuration);
    /**
     * Initializes all services with proper dependencies
     */
    private initializeServices;
    /**
     * Initializes statistics tracking
     */
    private initializeStats;
    /**
     * Sets up file system watchers for cache invalidation
     */
    private setupFileSystemWatchers;
    /**
     * Executes a file system operation with full integration
     */
    executeOperation<T>(operation: string, handler: () => Promise<T>, context: IntegrationContext): Promise<T>;
    /**
     * Lists directory contents with full integration
     */
    listDirectory(path: string, options: any, context: IntegrationContext): Promise<any>;
    /**
     * Reads file content with full integration
     */
    readFile(path: string, options: any, context: IntegrationContext): Promise<any>;
    /**
     * Searches files with full integration
     */
    searchFiles(query: string, searchPath: string, options: any, context: IntegrationContext): Promise<any>;
    /**
     * Gets file metadata with full integration
     */
    getFileMetadata(path: string, options: any, context: IntegrationContext): Promise<any>;
    /**
     * Checks permissions with full integration
     */
    checkPermissions(path: string, operation: string, options: any, context: IntegrationContext): Promise<any>;
    /**
     * Gets integration statistics
     */
    getStats(): IntegrationStats;
    /**
     * Updates configuration for all services
     */
    updateConfiguration(newConfig: Configuration): void;
    /**
     * Clears all caches
     */
    clearAllCaches(): void;
    /**
     * Gets cache statistics from all services
     */
    getAllCacheStats(): Record<string, any>;
    /**
     * Validates integration context
     */
    private validateContext;
    /**
     * Gracefully shuts down all services
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=FileSystemIntegration.d.ts.map