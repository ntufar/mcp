/**
 * Error Handler Middleware
 *
 * Comprehensive error handling middleware for MCP operations.
 * Implements security-focused error handling with detailed logging and sanitization.
 */
import { Configuration } from '../models/Configuration';
import { AuditLoggingService } from '../services/AuditLoggingService';
export interface ErrorContext {
    userId: string;
    clientId: string;
    clientType: string;
    operation: string;
    timestamp: Date;
    ipAddress?: string;
    sessionId?: string;
    requestId?: string;
    toolName?: string;
    input?: any;
}
export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: any;
        requestId?: string;
        timestamp: string;
        operation?: string;
        tool?: string;
    };
    success: false;
}
export interface ErrorHandlerOptions {
    includeStackTrace?: boolean;
    includeInput?: boolean;
    sanitizeErrors?: boolean;
    logErrors?: boolean;
    maxErrorDetails?: number;
}
export declare class ErrorHandler {
    private config;
    private auditLoggingService;
    private options;
    constructor(config: Configuration, auditLoggingService: AuditLoggingService, options?: ErrorHandlerOptions);
    /**
     * Handles errors and returns standardized error responses
     */
    handleError(error: Error, context: ErrorContext): Promise<ErrorResponse>;
    /**
     * Handles validation errors
     */
    handleValidationError(validationResult: any, context: ErrorContext): Promise<ErrorResponse>;
    /**
     * Handles permission errors
     */
    handlePermissionError(reason: string, context: ErrorContext): Promise<ErrorResponse>;
    /**
     * Handles path validation errors
     */
    handlePathValidationError(reason: string, context: ErrorContext): Promise<ErrorResponse>;
    /**
     * Handles file system errors
     */
    handleFileSystemError(error: Error, context: ErrorContext): Promise<ErrorResponse>;
    /**
     * Handles cache errors
     */
    handleCacheError(error: Error, context: ErrorContext): Promise<ErrorResponse>;
    /**
     * Handles rate limiting errors
     */
    handleRateLimitError(context: ErrorContext, retryAfter?: number): Promise<ErrorResponse>;
    /**
     * Handles timeout errors
     */
    handleTimeoutError(context: ErrorContext, timeoutMs: number): Promise<ErrorResponse>;
    /**
     * Handles memory limit errors
     */
    handleMemoryLimitError(context: ErrorContext, memoryUsage: number): Promise<ErrorResponse>;
    /**
     * Handles concurrent operation limit errors
     */
    handleConcurrentLimitError(context: ErrorContext, currentOperations: number, maxOperations: number): Promise<ErrorResponse>;
    /**
     * Creates a standardized error response
     */
    private createErrorResponse;
    /**
     * Processes and categorizes errors
     */
    private processError;
    /**
     * Logs errors for audit and debugging
     */
    private logError;
    /**
     * Sanitizes input data for logging
     */
    private sanitizeInput;
    /**
     * Updates error handler options
     */
    updateOptions(newOptions: Partial<ErrorHandlerOptions>): void;
    /**
     * Gets current error handler options
     */
    getOptions(): ErrorHandlerOptions;
}
//# sourceMappingURL=ErrorHandler.d.ts.map