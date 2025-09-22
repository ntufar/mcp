/**
 * Response Service
 *
 * Standardized response formatting service for MCP operations.
 * Implements consistent response structure with security and performance optimizations.
 */
import { Configuration } from '../models/Configuration';
import { AuditLoggingService } from './AuditLoggingService';
export interface ResponseOptions {
    includeMetadata?: boolean;
    includePerformance?: boolean;
    includeCache?: boolean;
    includeSecurity?: boolean;
    maxResponseSize?: number;
    compressResponse?: boolean;
    sanitizeData?: boolean;
}
export interface ResponseMetadata {
    timestamp: string;
    requestId: string;
    operation: string;
    tool: string;
    version: string;
    server: string;
    duration: number;
    cacheHit?: boolean;
    memoryOptimized?: boolean;
    securityLevel: string;
}
export interface PerformanceMetrics {
    executionTime: number;
    memoryUsage: number;
    cacheHit: boolean;
    cacheHitRate: number;
    compressionRatio?: number;
    responseSize: number;
    optimizedSize: number;
}
export interface SecurityInfo {
    userId: string;
    clientId: string;
    clientType: string;
    permissions: string[];
    auditLogged: boolean;
    sanitized: boolean;
    rateLimited: boolean;
}
export interface StandardResponse<T = any> {
    success: boolean;
    data?: T;
    metadata: ResponseMetadata;
    performance?: PerformanceMetrics;
    security?: SecurityInfo;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    warnings?: ResponseWarning[];
}
export interface ResponseWarning {
    code: string;
    message: string;
    field?: string;
    suggestion?: string;
}
export declare class ResponseService {
    private config;
    private auditLoggingService;
    private defaultOptions;
    constructor(config: Configuration, auditLoggingService: AuditLoggingService, defaultOptions?: ResponseOptions);
    /**
     * Creates a successful response
     */
    createSuccessResponse<T>(data: T, context: {
        requestId: string;
        operation: string;
        tool: string;
        duration: number;
        userId: string;
        clientId: string;
        clientType: string;
        cacheHit?: boolean;
        memoryOptimized?: boolean;
    }, options?: ResponseOptions): StandardResponse<T>;
    /**
     * Creates an error response
     */
    createErrorResponse(error: {
        code: string;
        message: string;
        details?: any;
    }, context: {
        requestId: string;
        operation: string;
        tool: string;
        duration: number;
        userId: string;
        clientId: string;
        clientType: string;
    }, options?: ResponseOptions): StandardResponse;
    /**
     * Creates a response with warnings
     */
    createWarningResponse<T>(data: T, warnings: ResponseWarning[], context: {
        requestId: string;
        operation: string;
        tool: string;
        duration: number;
        userId: string;
        clientId: string;
        clientType: string;
        cacheHit?: boolean;
        memoryOptimized?: boolean;
    }, options?: ResponseOptions): StandardResponse<T>;
    /**
     * Creates a streaming response
     */
    createStreamingResponse<T>(stream: AsyncGenerator<T>, context: {
        requestId: string;
        operation: string;
        tool: string;
        userId: string;
        clientId: string;
        clientType: string;
    }, options?: ResponseOptions): AsyncGenerator<StandardResponse<T>>;
    /**
     * Creates batch response for multiple operations
     */
    createBatchResponse<T>(results: Array<{
        success: boolean;
        data?: T;
        error?: {
            code: string;
            message: string;
            details?: any;
        };
        warnings?: ResponseWarning[];
    }>, context: {
        requestId: string;
        operation: string;
        tool: string;
        duration: number;
        userId: string;
        clientId: string;
        clientType: string;
    }, options?: ResponseOptions): StandardResponse<{
        results: Array<StandardResponse<T>>;
        summary: {
            total: number;
            successful: number;
            failed: number;
            warnings: number;
        };
    }>;
    /**
     * Creates metadata for responses
     */
    private createMetadata;
    /**
     * Creates performance metrics
     */
    private createPerformanceMetrics;
    /**
     * Creates security information
     */
    private createSecurityInfo;
    /**
     * Sanitizes data for security
     */
    private sanitizeData;
    /**
     * Sanitizes strings for security
     */
    private sanitizeString;
    /**
     * Validates response size
     */
    private validateResponseSize;
    /**
     * Updates default options
     */
    updateDefaultOptions(newOptions: Partial<ResponseOptions>): void;
    /**
     * Gets current default options
     */
    getDefaultOptions(): ResponseOptions;
    /**
     * Creates a warning
     */
    static createWarning(code: string, message: string, field?: string, suggestion?: string): ResponseWarning;
    /**
     * Creates a deprecation warning
     */
    static createDeprecationWarning(field: string, alternative?: string): ResponseWarning;
    /**
     * Creates a performance warning
     */
    static createPerformanceWarning(message: string, suggestion?: string): ResponseWarning;
    /**
     * Creates a security warning
     */
    static createSecurityWarning(message: string, suggestion?: string): ResponseWarning;
}
//# sourceMappingURL=ResponseService.d.ts.map