/**
 * Resource Manager
 *
 * Manages resource limits, throttling, and rate limiting for the MCP File Browser Server.
 * Implements comprehensive resource management with monitoring and enforcement.
 */
import { Configuration } from '../models/Configuration';
import { AuditLoggingService } from '../services/AuditLoggingService';
export interface ResourceLimits {
    maxConcurrentRequests: number;
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    maxFileSize: number;
    maxDirectoryDepth: number;
    maxSearchResults: number;
    maxCacheSize: number;
    maxMemoryUsage: number;
    maxDiskUsage: number;
    maxStreamingConnections: number;
}
export interface ThrottleConfig {
    enabled: boolean;
    windowSize: number;
    maxRequests: number;
    blockDuration: number;
    burstLimit: number;
    decayRate: number;
}
export interface RateLimitRule {
    id: string;
    name: string;
    pattern: RegExp;
    limits: ResourceLimits;
    throttle: ThrottleConfig;
    enabled: boolean;
    priority: number;
}
export interface ResourceUsage {
    userId: string;
    clientId: string;
    clientType: string;
    currentRequests: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    totalRequests: number;
    lastRequest: Date;
    blockedUntil?: Date;
    violations: number;
}
export interface ResourceStats {
    totalRequests: number;
    blockedRequests: number;
    throttledRequests: number;
    activeUsers: number;
    resourceViolations: number;
    averageResponseTime: number;
    peakConcurrentRequests: number;
}
export declare class ResourceManager {
    private config;
    private auditLoggingService;
    private resourceLimits;
    private throttleConfigs;
    private rateLimitRules;
    private resourceUsage;
    private requestQueue;
    private stats;
    constructor(config: Configuration, auditLoggingService: AuditLoggingService);
    /**
     * Checks if a request is allowed based on resource limits
     */
    checkResourceLimits(userId: string, clientId: string, clientType: string, operation: string, context?: any): Promise<{
        allowed: boolean;
        reason?: string;
        retryAfter?: number;
        limits: ResourceLimits;
    }>;
    /**
     * Records the start of a request
     */
    recordRequestStart(userId: string, clientId: string, operation: string): string;
    /**
     * Records the completion of a request
     */
    recordRequestEnd(requestId: string, userId: string, clientId: string, duration: number, success: boolean): void;
    /**
     * Adds a rate limit rule
     */
    addRateLimitRule(rule: RateLimitRule): void;
    /**
     * Removes a rate limit rule
     */
    removeRateLimitRule(ruleId: string): boolean;
    /**
     * Updates resource limits
     */
    updateResourceLimits(newLimits: Partial<ResourceLimits>): void;
    /**
     * Gets resource usage for a user
     */
    getUserResourceUsage(userId: string, clientId: string): ResourceUsage | null;
    /**
     * Gets resource statistics
     */
    getResourceStats(): ResourceStats;
    /**
     * Gets current resource usage summary
     */
    getCurrentResourceUsage(): {
        totalActiveRequests: number;
        totalUsers: number;
        averageRequestsPerUser: number;
        topUsers: Array<{
            userId: string;
            clientId: string;
            requests: number;
        }>;
    };
    /**
     * Cleans up expired resource usage data
     */
    cleanupExpiredData(): void;
    /**
     * Enforces resource limits by blocking violating users
     */
    enforceResourceLimits(): void;
    private initializeResourceLimits;
    private initializeStats;
    private initializeDefaultRules;
    private createResourceUsage;
    private checkRateLimits;
    private checkOperationLimits;
    private updateResourceUsage;
    private getCurrentConcurrentRequests;
    private generateRequestId;
    private startCleanupInterval;
}
//# sourceMappingURL=ResourceManager.d.ts.map