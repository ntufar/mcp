/**
 * Cache Invalidation Service
 *
 * Implements intelligent cache invalidation with file system monitoring.
 * Provides automatic cache invalidation based on file changes and events.
 */
import { CacheService } from './CacheService';
import { Configuration } from '../models/Configuration';
import { PathValidationService } from './PathValidationService';
import { AuditLoggingService } from './AuditLoggingService';
export interface InvalidationRule {
    id: string;
    pattern: RegExp;
    eventTypes: ('create' | 'modify' | 'delete' | 'move' | 'rename')[];
    paths: string[];
    ttl?: number;
    priority: number;
    enabled: boolean;
}
export interface InvalidationEvent {
    id: string;
    timestamp: Date;
    eventType: 'create' | 'modify' | 'delete' | 'move' | 'rename';
    path: string;
    oldPath?: string;
    fileSize?: number;
    contentType?: string;
    userId?: string;
    clientId?: string;
}
export interface InvalidationResult {
    success: boolean;
    invalidatedKeys: string[];
    invalidatedCount: number;
    executionTime: number;
    errors: string[];
}
export interface InvalidationStats {
    totalEvents: number;
    totalInvalidations: number;
    averageInvalidationTime: number;
    eventTypes: Map<string, number>;
    mostInvalidatedPaths: Array<{
        path: string;
        count: number;
    }>;
    invalidationRules: Map<string, number>;
    cacheHitRate: number;
}
export declare class CacheInvalidationService {
    private config;
    private cacheService;
    private pathValidationService;
    private auditLoggingService;
    private invalidationRules;
    private eventHistory;
    private stats;
    constructor(config: Configuration, cacheService: CacheService, pathValidationService: PathValidationService, auditLoggingService: AuditLoggingService);
    /**
     * Processes a file system event and invalidates relevant cache entries
     */
    processEvent(event: InvalidationEvent): Promise<InvalidationResult>;
    /**
     * Adds an invalidation rule
     */
    addRule(rule: InvalidationRule): void;
    /**
     * Removes an invalidation rule
     */
    removeRule(ruleId: string): boolean;
    /**
     * Updates an invalidation rule
     */
    updateRule(ruleId: string, updates: Partial<InvalidationRule>): void;
    /**
     * Gets all invalidation rules
     */
    getRules(): InvalidationRule[];
    /**
     * Gets invalidation statistics
     */
    getStats(): InvalidationStats;
    /**
     * Gets event history
     */
    getEventHistory(limit?: number): InvalidationEvent[];
    /**
     * Clears event history
     */
    clearEventHistory(): void;
    /**
     * Manually invalidates cache entries by pattern
     */
    invalidateByPattern(pattern: RegExp): Promise<InvalidationResult>;
    /**
     * Manually invalidates cache entries by path
     */
    invalidateByPath(path: string): Promise<InvalidationResult>;
    /**
     * Manually invalidates cache entries by tags
     */
    invalidateByTags(tags: string[]): Promise<InvalidationResult>;
    private validateEvent;
    private validateRule;
    private findApplicableRules;
    private processRule;
    private isEntryRelatedToEvent;
    private recordEvent;
    private updateStats;
    private initializeDefaultRules;
}
//# sourceMappingURL=CacheInvalidationService.d.ts.map