/**
 * MCP Server
 *
 * Main MCP (Model Context Protocol) server implementation.
 * Provides secure file system access for LLM clients with comprehensive validation.
 */
import { Configuration } from '../models/Configuration';
export interface MCPServerOptions {
    config?: Configuration;
    enableLogging?: boolean;
    enableMetrics?: boolean;
    maxConcurrentRequests?: number;
}
export interface ClientContext {
    clientId: string;
    clientType: string;
    userId: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
}
export interface ServerStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    activeConnections: number;
    toolUsage: Map<string, number>;
    clientTypes: Map<string, number>;
    errorTypes: Map<string, number>;
}
export declare class MCPServer {
    private server;
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
    private stats;
    constructor(options?: MCPServerOptions);
    /**
     * Starts the MCP server
     */
    start(): Promise<void>;
    /**
     * Stops the MCP server
     */
    stop(): Promise<void>;
    /**
     * Gets server statistics
     */
    getStats(): ServerStats;
    /**
     * Updates server configuration
     */
    updateConfiguration(newConfig: Configuration): void;
    /**
     * Gets server health status
     */
    getHealthStatus(): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        details: Record<string, any>;
    };
    private initializeServices;
    private initializeStats;
    private setupHandlers;
    private extractClientContext;
    private handleToolCall;
    private handleListDirectory;
    private handleReadFile;
    private handleSearchFiles;
    private handleGetFileMetadata;
    private handleCheckPermissions;
}
//# sourceMappingURL=MCPServer.d.ts.map