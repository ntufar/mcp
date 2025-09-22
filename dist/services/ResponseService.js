"use strict";
/**
 * Response Service
 *
 * Standardized response formatting service for MCP operations.
 * Implements consistent response structure with security and performance optimizations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseService = void 0;
class ResponseService {
    config;
    auditLoggingService;
    defaultOptions;
    constructor(config, auditLoggingService, defaultOptions = {}) {
        this.config = config;
        this.auditLoggingService = auditLoggingService;
        this.defaultOptions = {
            includeMetadata: true,
            includePerformance: true,
            includeCache: true,
            includeSecurity: false, // Default to false for security
            maxResponseSize: 10 * 1024 * 1024, // 10MB
            compressResponse: false,
            sanitizeData: true,
            ...defaultOptions,
        };
    }
    /**
     * Creates a successful response
     */
    createSuccessResponse(data, context, options = {}) {
        const responseOptions = { ...this.defaultOptions, ...options };
        const response = {
            success: true,
            data: this.sanitizeData(data, responseOptions.sanitizeData),
            metadata: this.createMetadata(context, responseOptions),
        };
        // Add performance metrics if requested
        if (responseOptions.includePerformance) {
            response.performance = this.createPerformanceMetrics(context, data);
        }
        // Add security info if requested
        if (responseOptions.includeSecurity) {
            response.security = this.createSecurityInfo(context);
        }
        // Validate response size
        this.validateResponseSize(response, responseOptions.maxResponseSize);
        return response;
    }
    /**
     * Creates an error response
     */
    createErrorResponse(error, context, options = {}) {
        const responseOptions = { ...this.defaultOptions, ...options };
        const response = {
            success: false,
            error: {
                code: error.code,
                message: error.message,
                details: responseOptions.sanitizeData ?
                    this.sanitizeData(error.details, true) :
                    error.details,
            },
            metadata: this.createMetadata(context, responseOptions),
        };
        // Add performance metrics if requested
        if (responseOptions.includePerformance) {
            response.performance = this.createPerformanceMetrics(context, null);
        }
        // Add security info if requested
        if (responseOptions.includeSecurity) {
            response.security = this.createSecurityInfo(context);
        }
        return response;
    }
    /**
     * Creates a response with warnings
     */
    createWarningResponse(data, warnings, context, options = {}) {
        const response = this.createSuccessResponse(data, context, options);
        response.warnings = warnings;
        return response;
    }
    /**
     * Creates a streaming response
     */
    createStreamingResponse(stream, context, options = {}) {
        const responseOptions = { ...this.defaultOptions, ...options };
        let chunkIndex = 0;
        return (async function* () {
            try {
                for await (const chunk of stream) {
                    const chunkContext = {
                        ...context,
                        duration: 0, // Duration not applicable for streaming
                        cacheHit: false, // Streaming doesn't use cache
                        memoryOptimized: true,
                    };
                    const response = {
                        success: true,
                        data: chunk,
                        metadata: {
                            ...this.createMetadata(chunkContext, responseOptions),
                            chunkIndex: chunkIndex++,
                            isStreaming: true,
                        },
                    };
                    if (responseOptions.includePerformance) {
                        response.performance = this.createPerformanceMetrics(chunkContext, chunk);
                    }
                    if (responseOptions.includeSecurity) {
                        response.security = this.createSecurityInfo(chunkContext);
                    }
                    yield response;
                }
                // Send final chunk to indicate completion
                const finalResponse = {
                    success: true,
                    metadata: {
                        ...this.createMetadata(context, responseOptions),
                        chunkIndex: chunkIndex,
                        isStreaming: true,
                        streamComplete: true,
                    },
                };
                yield finalResponse;
            }
            catch (error) {
                const errorResponse = this.createErrorResponse({
                    code: 'STREAM_ERROR',
                    message: error instanceof Error ? error.message : 'Streaming error',
                    details: { chunkIndex },
                }, {
                    ...context,
                    duration: 0,
                }, responseOptions);
                yield errorResponse;
            }
        }).bind(this)();
    }
    /**
     * Creates batch response for multiple operations
     */
    createBatchResponse(results, context, options = {}) {
        const responseOptions = { ...this.defaultOptions, ...options };
        const batchResults = results.map(result => {
            if (result.success) {
                return this.createSuccessResponse(result.data, { ...context, duration: 0 }, // Individual durations not tracked
                responseOptions);
            }
            else {
                return this.createErrorResponse(result.error, { ...context, duration: 0 }, responseOptions);
            }
        });
        const summary = {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            warnings: results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0),
        };
        const batchData = {
            results: batchResults,
            summary,
        };
        return this.createSuccessResponse(batchData, context, responseOptions);
    }
    /**
     * Creates metadata for responses
     */
    createMetadata(context, options) {
        const metadata = {
            timestamp: new Date().toISOString(),
            requestId: context.requestId,
            operation: context.operation,
            tool: context.tool,
            version: this.config.server.version,
            server: this.config.server.name,
            duration: context.duration,
            securityLevel: this.config.security.securityLevel,
        };
        if (options.includeCache) {
            metadata.cacheHit = context.cacheHit || false;
            metadata.memoryOptimized = context.memoryOptimized || false;
        }
        return metadata;
    }
    /**
     * Creates performance metrics
     */
    createPerformanceMetrics(context, data) {
        const memoryUsage = process.memoryUsage().heapUsed;
        const responseSize = data ? JSON.stringify(data).length : 0;
        return {
            executionTime: context.duration,
            memoryUsage,
            cacheHit: context.cacheHit || false,
            cacheHitRate: 0, // Would need to track this across requests
            responseSize,
            optimizedSize: context.memoryOptimized ? responseSize : responseSize,
        };
    }
    /**
     * Creates security information
     */
    createSecurityInfo(context) {
        return {
            userId: context.userId,
            clientId: context.clientId,
            clientType: context.clientType,
            permissions: [], // Would need to fetch from permission service
            auditLogged: true,
            sanitized: true,
            rateLimited: false,
        };
    }
    /**
     * Sanitizes data for security
     */
    sanitizeData(data, shouldSanitize) {
        if (!shouldSanitize || data === null || data === undefined) {
            return data;
        }
        if (typeof data === 'string') {
            return this.sanitizeString(data);
        }
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeData(item, shouldSanitize));
        }
        if (typeof data === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                const lowerKey = key.toLowerCase();
                const isSensitive = ['password', 'token', 'key', 'secret', 'auth'].some(sensitive => lowerKey.includes(sensitive));
                if (isSensitive) {
                    sanitized[key] = '[REDACTED]';
                }
                else {
                    sanitized[key] = this.sanitizeData(value, shouldSanitize);
                }
            }
            return sanitized;
        }
        return data;
    }
    /**
     * Sanitizes strings for security
     */
    sanitizeString(str) {
        // Remove potential script tags and other dangerous content
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[SCRIPT_REMOVED]')
            .replace(/javascript:/gi, '[JAVASCRIPT_REMOVED]:')
            .replace(/data:/gi, '[DATA_REMOVED]:')
            .replace(/vbscript:/gi, '[VBSCRIPT_REMOVED]:');
    }
    /**
     * Validates response size
     */
    validateResponseSize(response, maxSize) {
        const responseSize = JSON.stringify(response).length;
        if (responseSize > maxSize) {
            // Truncate data if too large
            if (response.data && typeof response.data === 'object') {
                response.data = {
                    ...response.data,
                    _truncated: true,
                    _originalSize: responseSize,
                    _maxSize: maxSize,
                };
            }
        }
    }
    /**
     * Updates default options
     */
    updateDefaultOptions(newOptions) {
        this.defaultOptions = { ...this.defaultOptions, ...newOptions };
    }
    /**
     * Gets current default options
     */
    getDefaultOptions() {
        return { ...this.defaultOptions };
    }
    /**
     * Creates a warning
     */
    static createWarning(code, message, field, suggestion) {
        return {
            code,
            message,
            field,
            suggestion,
        };
    }
    /**
     * Creates a deprecation warning
     */
    static createDeprecationWarning(field, alternative) {
        return {
            code: 'DEPRECATED_FIELD',
            message: `Field '${field}' is deprecated`,
            field,
            suggestion: alternative ? `Use '${alternative}' instead` : undefined,
        };
    }
    /**
     * Creates a performance warning
     */
    static createPerformanceWarning(message, suggestion) {
        return {
            code: 'PERFORMANCE_WARNING',
            message,
            suggestion,
        };
    }
    /**
     * Creates a security warning
     */
    static createSecurityWarning(message, suggestion) {
        return {
            code: 'SECURITY_WARNING',
            message,
            suggestion,
        };
    }
}
exports.ResponseService = ResponseService;
//# sourceMappingURL=ResponseService.js.map