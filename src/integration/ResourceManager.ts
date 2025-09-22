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
  windowSize: number; // milliseconds
  maxRequests: number;
  blockDuration: number; // milliseconds
  burstLimit: number;
  decayRate: number; // requests per second
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

export class ResourceManager {
  private config: Configuration;
  private auditLoggingService: AuditLoggingService;
  private resourceLimits: ResourceLimits;
  private throttleConfigs: Map<string, ThrottleConfig> = new Map();
  private rateLimitRules: Map<string, RateLimitRule> = new Map();
  private resourceUsage: Map<string, ResourceUsage> = new Map();
  private requestQueue: Array<{
    id: string;
    userId: string;
    clientId: string;
    timestamp: Date;
    operation: string;
  }> = [];
  
  private stats: {
    totalRequests: number;
    blockedRequests: number;
    throttledRequests: number;
    resourceViolations: number;
    totalResponseTime: number;
    peakConcurrentRequests: number;
  };

  constructor(config: Configuration, auditLoggingService: AuditLoggingService) {
    this.config = config;
    this.auditLoggingService = auditLoggingService;
    this.resourceLimits = this.initializeResourceLimits();
    this.initializeStats();
    this.initializeDefaultRules();
    this.startCleanupInterval();
  }

  /**
   * Checks if a request is allowed based on resource limits
   */
  async checkResourceLimits(
    userId: string,
    clientId: string,
    clientType: string,
    operation: string,
    context?: any
  ): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
    limits: ResourceLimits;
  }> {
    try {
      // Get or create resource usage for user
      const usageKey = `${userId}:${clientId}`;
      let usage = this.resourceUsage.get(usageKey);
      
      if (!usage) {
        usage = this.createResourceUsage(userId, clientId, clientType);
        this.resourceUsage.set(usageKey, usage);
      }

      // Check if user is currently blocked
      if (usage.blockedUntil && usage.blockedUntil > new Date()) {
        this.stats.blockedRequests++;
        
        await this.auditLoggingService.logFailure(
          userId,
          clientId,
          clientType,
          operation,
          'RESOURCE_LIMIT_EXCEEDED',
          'User is blocked due to resource limit violations',
          0,
          { blockedUntil: usage.blockedUntil }
        );

        return {
          allowed: false,
          reason: 'User is temporarily blocked due to resource limit violations',
          retryAfter: Math.ceil((usage.blockedUntil.getTime() - Date.now()) / 1000),
          limits: this.resourceLimits,
        };
      }

      // Check concurrent request limit
      if (usage.currentRequests >= this.resourceLimits.maxConcurrentRequests) {
        this.stats.blockedRequests++;
        
        await this.auditLoggingService.logFailure(
          userId,
          clientId,
          clientType,
          operation,
          'CONCURRENT_LIMIT_EXCEEDED',
          'Maximum concurrent requests exceeded',
          0,
          { currentRequests: usage.currentRequests, limit: this.resourceLimits.maxConcurrentRequests }
        );

        return {
          allowed: false,
          reason: 'Maximum concurrent requests exceeded',
          limits: this.resourceLimits,
        };
      }

      // Check rate limits
      const rateLimitCheck = this.checkRateLimits(usage, operation);
      if (!rateLimitCheck.allowed) {
        this.stats.throttledRequests++;
        
        await this.auditLoggingService.logFailure(
          userId,
          clientId,
          clientType,
          operation,
          'RATE_LIMIT_EXCEEDED',
          rateLimitCheck.reason!,
          0,
          { 
            requestsPerMinute: usage.requestsPerMinute,
            requestsPerHour: usage.requestsPerHour,
            limit: this.resourceLimits.maxRequestsPerMinute
          }
        );

        return {
          allowed: false,
          reason: rateLimitCheck.reason,
          retryAfter: rateLimitCheck.retryAfter,
          limits: this.resourceLimits,
        };
      }

      // Check operation-specific limits
      const operationLimitCheck = this.checkOperationLimits(operation, context);
      if (!operationLimitCheck.allowed) {
        this.stats.resourceViolations++;
        usage.violations++;
        
        await this.auditLoggingService.logFailure(
          userId,
          clientId,
          clientType,
          operation,
          'OPERATION_LIMIT_EXCEEDED',
          operationLimitCheck.reason!,
          0,
          operationLimitCheck.details
        );

        return {
          allowed: false,
          reason: operationLimitCheck.reason,
          limits: this.resourceLimits,
        };
      }

      // Update usage statistics
      this.updateResourceUsage(usage, operation);

      return {
        allowed: true,
        limits: this.resourceLimits,
      };
    } catch (error) {
      console.error('Resource limit check failed:', error);
      
      // Fail open for availability, but log the error
      await this.auditLoggingService.logFailure(
        userId,
        clientId,
        clientType,
        operation,
        'RESOURCE_CHECK_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        0
      );

      return {
        allowed: true, // Fail open
        limits: this.resourceLimits,
      };
    }
  }

  /**
   * Records the start of a request
   */
  recordRequestStart(
    userId: string,
    clientId: string,
    operation: string
  ): string {
    const requestId = this.generateRequestId();
    const usageKey = `${userId}:${clientId}`;
    
    const request = {
      id: requestId,
      userId,
      clientId,
      timestamp: new Date(),
      operation,
    };

    this.requestQueue.push(request);
    this.stats.totalRequests++;

    // Update resource usage
    const usage = this.resourceUsage.get(usageKey);
    if (usage) {
      usage.currentRequests++;
      usage.totalRequests++;
      usage.lastRequest = new Date();
    }

    // Update peak concurrent requests
    const currentConcurrent = this.getCurrentConcurrentRequests();
    if (currentConcurrent > this.stats.peakConcurrentRequests) {
      this.stats.peakConcurrentRequests = currentConcurrent;
    }

    return requestId;
  }

  /**
   * Records the completion of a request
   */
  recordRequestEnd(
    requestId: string,
    userId: string,
    clientId: string,
    duration: number,
    success: boolean
  ): void {
    // Remove from queue
    const requestIndex = this.requestQueue.findIndex(r => r.id === requestId);
    if (requestIndex >= 0) {
      this.requestQueue.splice(requestIndex, 1);
    }

    // Update resource usage
    const usageKey = `${userId}:${clientId}`;
    const usage = this.resourceUsage.get(usageKey);
    if (usage) {
      usage.currentRequests = Math.max(0, usage.currentRequests - 1);
    }

    // Update statistics
    this.stats.totalResponseTime += duration;
  }

  /**
   * Adds a rate limit rule
   */
  addRateLimitRule(rule: RateLimitRule): void {
    this.rateLimitRules.set(rule.id, rule);
  }

  /**
   * Removes a rate limit rule
   */
  removeRateLimitRule(ruleId: string): boolean {
    return this.rateLimitRules.delete(ruleId);
  }

  /**
   * Updates resource limits
   */
  updateResourceLimits(newLimits: Partial<ResourceLimits>): void {
    this.resourceLimits = { ...this.resourceLimits, ...newLimits };
  }

  /**
   * Gets resource usage for a user
   */
  getUserResourceUsage(userId: string, clientId: string): ResourceUsage | null {
    const usageKey = `${userId}:${clientId}`;
    return this.resourceUsage.get(usageKey) || null;
  }

  /**
   * Gets resource statistics
   */
  getResourceStats(): ResourceStats {
    const activeUsers = this.resourceUsage.size;
    const averageResponseTime = this.stats.totalRequests > 0 ? 
      this.stats.totalResponseTime / this.stats.totalRequests : 0;

    return {
      totalRequests: this.stats.totalRequests,
      blockedRequests: this.stats.blockedRequests,
      throttledRequests: this.stats.throttledRequests,
      activeUsers,
      resourceViolations: this.stats.resourceViolations,
      averageResponseTime,
      peakConcurrentRequests: this.stats.peakConcurrentRequests,
    };
  }

  /**
   * Gets current resource usage summary
   */
  getCurrentResourceUsage(): {
    totalActiveRequests: number;
    totalUsers: number;
    averageRequestsPerUser: number;
    topUsers: Array<{ userId: string; clientId: string; requests: number }>;
  } {
    const totalActiveRequests = this.requestQueue.length;
    const totalUsers = this.resourceUsage.size;
    const averageRequestsPerUser = totalUsers > 0 ? totalActiveRequests / totalUsers : 0;

    // Get top users by request count
    const topUsers = Array.from(this.resourceUsage.entries())
      .sort((a, b) => b[1].totalRequests - a[1].totalRequests)
      .slice(0, 10)
      .map(([key, usage]) => ({
        userId: usage.userId,
        clientId: usage.clientId,
        requests: usage.totalRequests,
      }));

    return {
      totalActiveRequests,
      totalUsers,
      averageRequestsPerUser,
      topUsers,
    };
  }

  /**
   * Cleans up expired resource usage data
   */
  cleanupExpiredData(): void {
    const now = new Date();
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up expired resource usage
    for (const [key, usage] of this.resourceUsage.entries()) {
      const timeSinceLastRequest = now.getTime() - usage.lastRequest.getTime();
      
      if (timeSinceLastRequest > expirationTime && usage.currentRequests === 0) {
        this.resourceUsage.delete(key);
      }
    }

    // Clean up expired requests from queue
    this.requestQueue = this.requestQueue.filter(
      request => now.getTime() - request.timestamp.getTime() < expirationTime
    );
  }

  /**
   * Enforces resource limits by blocking violating users
   */
  enforceResourceLimits(): void {
    const now = new Date();
    const blockDuration = 15 * 60 * 1000; // 15 minutes

    for (const [key, usage] of this.resourceUsage.entries()) {
      // Block users with too many violations
      if (usage.violations >= 5 && (!usage.blockedUntil || usage.blockedUntil <= now)) {
        usage.blockedUntil = new Date(now.getTime() + blockDuration);
        
        console.log(`User ${usage.userId} blocked for ${blockDuration / 1000 / 60} minutes due to resource violations`);
      }
    }
  }

  // Private methods

  private initializeResourceLimits(): ResourceLimits {
    return {
      maxConcurrentRequests: this.config.performance.maxConcurrentOperations,
      maxRequestsPerMinute: 100,
      maxRequestsPerHour: 1000,
      maxFileSize: this.config.security.maxFileSize,
      maxDirectoryDepth: 20,
      maxSearchResults: 10000,
      maxCacheSize: this.config.getCacheSizeBytes(),
      maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
      maxDiskUsage: 10 * 1024 * 1024 * 1024, // 10GB
      maxStreamingConnections: 50,
    };
  }

  private initializeStats(): void {
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      throttledRequests: 0,
      resourceViolations: 0,
      totalResponseTime: 0,
      peakConcurrentRequests: 0,
    };
  }

  private initializeDefaultRules(): void {
    // Default rate limit rule for all users
    this.addRateLimitRule({
      id: 'default',
      name: 'Default Rate Limit',
      pattern: /.*/,
      limits: this.resourceLimits,
      throttle: {
        enabled: true,
        windowSize: 60000, // 1 minute
        maxRequests: 100,
        blockDuration: 300000, // 5 minutes
        burstLimit: 20,
        decayRate: 10,
      },
      enabled: true,
      priority: 1,
    });

    // Stricter rule for search operations
    this.addRateLimitRule({
      id: 'search_operations',
      name: 'Search Operations Rate Limit',
      pattern: /search_files/,
      limits: {
        ...this.resourceLimits,
        maxRequestsPerMinute: 50,
        maxSearchResults: 1000,
      },
      throttle: {
        enabled: true,
        windowSize: 60000,
        maxRequests: 50,
        blockDuration: 600000, // 10 minutes
        burstLimit: 10,
        decayRate: 5,
      },
      enabled: true,
      priority: 2,
    });
  }

  private createResourceUsage(
    userId: string,
    clientId: string,
    clientType: string
  ): ResourceUsage {
    return {
      userId,
      clientId,
      clientType,
      currentRequests: 0,
      requestsPerMinute: 0,
      requestsPerHour: 0,
      totalRequests: 0,
      lastRequest: new Date(),
      violations: 0,
    };
  }

  private checkRateLimits(
    usage: ResourceUsage,
    operation: string
  ): { allowed: boolean; reason?: string; retryAfter?: number } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);

    // Count requests in the last minute
    const recentRequests = this.requestQueue.filter(
      r => r.userId === usage.userId && 
           r.clientId === usage.clientId && 
           r.timestamp >= oneMinuteAgo
    );

    usage.requestsPerMinute = recentRequests.length;

    // Count requests in the last hour
    const hourlyRequests = this.requestQueue.filter(
      r => r.userId === usage.userId && 
           r.clientId === usage.clientId && 
           r.timestamp >= oneHourAgo
    );

    usage.requestsPerHour = hourlyRequests.length;

    // Check minute limit
    if (usage.requestsPerMinute >= this.resourceLimits.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...recentRequests.map(r => r.timestamp.getTime()));
      const retryAfter = Math.ceil((oldestRequest + 60000 - now.getTime()) / 1000);
      
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${usage.requestsPerMinute} requests per minute`,
        retryAfter: Math.max(0, retryAfter),
      };
    }

    // Check hour limit
    if (usage.requestsPerHour >= this.resourceLimits.maxRequestsPerHour) {
      const oldestRequest = Math.min(...hourlyRequests.map(r => r.timestamp.getTime()));
      const retryAfter = Math.ceil((oldestRequest + 3600000 - now.getTime()) / 1000);
      
      return {
        allowed: false,
        reason: `Hourly rate limit exceeded: ${usage.requestsPerHour} requests per hour`,
        retryAfter: Math.max(0, retryAfter),
      };
    }

    return { allowed: true };
  }

  private checkOperationLimits(
    operation: string,
    context?: any
  ): { allowed: boolean; reason?: string; details?: any } {
    // Check operation-specific limits
    switch (operation) {
      case 'search_files':
        if (context?.maxResults && context.maxResults > this.resourceLimits.maxSearchResults) {
          return {
            allowed: false,
            reason: `Search results limit exceeded: ${context.maxResults} > ${this.resourceLimits.maxSearchResults}`,
            details: { maxResults: context.maxResults, limit: this.resourceLimits.maxSearchResults },
          };
        }
        break;

      case 'read_file':
        if (context?.maxSize && context.maxSize > this.resourceLimits.maxFileSize) {
          return {
            allowed: false,
            reason: `File size limit exceeded: ${context.maxSize} > ${this.resourceLimits.maxFileSize}`,
            details: { maxSize: context.maxSize, limit: this.resourceLimits.maxFileSize },
          };
        }
        break;

      case 'list_directory':
        if (context?.maxDepth && context.maxDepth > this.resourceLimits.maxDirectoryDepth) {
          return {
            allowed: false,
            reason: `Directory depth limit exceeded: ${context.maxDepth} > ${this.resourceLimits.maxDirectoryDepth}`,
            details: { maxDepth: context.maxDepth, limit: this.resourceLimits.maxDirectoryDepth },
          };
        }
        break;
    }

    return { allowed: true };
  }

  private updateResourceUsage(usage: ResourceUsage, operation: string): void {
    usage.lastRequest = new Date();
    // Additional usage tracking can be added here
  }

  private getCurrentConcurrentRequests(): number {
    return this.requestQueue.length;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanupInterval(): void {
    // Clean up expired data every 5 minutes
    setInterval(() => {
      this.cleanupExpiredData();
      this.enforceResourceLimits();
    }, 5 * 60 * 1000);
  }
}
