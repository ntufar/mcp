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
  mostInvalidatedPaths: Array<{ path: string; count: number }>;
  invalidationRules: Map<string, number>;
  cacheHitRate: number;
}

export class CacheInvalidationService {
  private config: Configuration;
  private cacheService: CacheService;
  private pathValidationService: PathValidationService;
  private auditLoggingService: AuditLoggingService;
  private invalidationRules: Map<string, InvalidationRule> = new Map();
  private eventHistory: InvalidationEvent[] = [];
  private stats: {
    totalEvents: number;
    totalInvalidations: number;
    totalInvalidationTime: number;
    eventTypes: Map<string, number>;
    pathInvalidations: Map<string, number>;
    ruleInvalidations: Map<string, number>;
  } = {
    totalEvents: 0,
    totalInvalidations: 0,
    totalInvalidationTime: 0,
    eventTypes: new Map(),
    pathInvalidations: new Map(),
    ruleInvalidations: new Map(),
  };

  constructor(
    config: Configuration,
    cacheService: CacheService,
    pathValidationService: PathValidationService,
    auditLoggingService: AuditLoggingService
  ) {
    this.config = config;
    this.cacheService = cacheService;
    this.pathValidationService = pathValidationService;
    this.auditLoggingService = auditLoggingService;
    this.initializeDefaultRules();
  }

  /**
   * Processes a file system event and invalidates relevant cache entries
   */
  async processEvent(event: InvalidationEvent): Promise<InvalidationResult> {
    const startTime = Date.now();
    const result: InvalidationResult = {
      success: true,
      invalidatedKeys: [],
      invalidatedCount: 0,
      executionTime: 0,
      errors: [],
    };

    try {
      // Validate event
      this.validateEvent(event);

      // Record event
      this.recordEvent(event);

      // Find applicable rules
      const applicableRules = this.findApplicableRules(event);

      // Process each applicable rule
      for (const rule of applicableRules) {
        try {
          const ruleResult = await this.processRule(rule, event);
          result.invalidatedKeys.push(...ruleResult.invalidatedKeys);
          result.invalidatedCount += ruleResult.invalidatedCount;
        } catch (error) {
          result.errors.push(`Rule ${rule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update statistics
      this.updateStats(event, result.invalidatedCount, Date.now() - startTime);

      result.executionTime = Date.now() - startTime;

      // Log the invalidation
      await this.auditLoggingService.logSuccess(
        event.userId || 'system',
        event.clientId || 'cache-invalidation',
        'cache-invalidation',
        'invalidate_cache',
        result.executionTime,
        {
          eventType: event.eventType,
          path: event.path,
          invalidatedCount: result.invalidatedCount,
          ruleCount: applicableRules.length,
        }
      );

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.executionTime = Date.now() - startTime;

      await this.auditLoggingService.logFailure(
        event.userId || 'system',
        event.clientId || 'cache-invalidation',
        'cache-invalidation',
        'invalidate_cache',
        'INVALIDATION_ERROR',
        result.errors.join(', '),
        result.executionTime,
        {
          eventType: event.eventType,
          path: event.path,
        }
      );

      return result;
    }
  }

  /**
   * Adds an invalidation rule
   */
  addRule(rule: InvalidationRule): void {
    this.validateRule(rule);
    this.invalidationRules.set(rule.id, rule);
  }

  /**
   * Removes an invalidation rule
   */
  removeRule(ruleId: string): boolean {
    return this.invalidationRules.delete(ruleId);
  }

  /**
   * Updates an invalidation rule
   */
  updateRule(ruleId: string, updates: Partial<InvalidationRule>): void {
    const existingRule = this.invalidationRules.get(ruleId);
    if (!existingRule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const updatedRule = { ...existingRule, ...updates };
    this.validateRule(updatedRule);
    this.invalidationRules.set(ruleId, updatedRule);
  }

  /**
   * Gets all invalidation rules
   */
  getRules(): InvalidationRule[] {
    return Array.from(this.invalidationRules.values());
  }

  /**
   * Gets invalidation statistics
   */
  getStats(): InvalidationStats {
    const eventTypes = new Map<string, number>();
    for (const [type, count] of this.stats.eventTypes.entries()) {
      eventTypes.set(type, count);
    }

    const mostInvalidatedPaths = Array.from(this.stats.pathInvalidations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    const invalidationRules = new Map<string, number>();
    for (const [ruleId, count] of this.stats.ruleInvalidations.entries()) {
      invalidationRules.set(ruleId, count);
    }

    const averageInvalidationTime = this.stats.totalInvalidations > 0 ?
      this.stats.totalInvalidationTime / this.stats.totalInvalidations : 0;

    return {
      totalEvents: this.stats.totalEvents,
      totalInvalidations: this.stats.totalInvalidations,
      averageInvalidationTime,
      eventTypes,
      mostInvalidatedPaths,
      invalidationRules,
      cacheHitRate: 0, // Would need to track cache hits
    };
  }

  /**
   * Gets event history
   */
  getEventHistory(limit: number = 100): InvalidationEvent[] {
    return this.eventHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clears event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Manually invalidates cache entries by pattern
   */
  async invalidateByPattern(pattern: RegExp): Promise<InvalidationResult> {
    const startTime = Date.now();
    const result: InvalidationResult = {
      success: true,
      invalidatedKeys: [],
      invalidatedCount: 0,
      executionTime: 0,
      errors: [],
    };

    try {
      const entries = this.cacheService.getEntriesByPattern(pattern);
      const keysToInvalidate = Array.from(entries.keys());

      for (const key of keysToInvalidate) {
        await this.cacheService.delete(key);
        result.invalidatedKeys.push(key);
        result.invalidatedCount++;
      }

      result.executionTime = Date.now() - startTime;

      await this.auditLoggingService.logSuccess(
        'manual',
        'cache-invalidation',
        'cache-invalidation',
        'invalidate_by_pattern',
        result.executionTime,
        {
          pattern: pattern.toString(),
          invalidatedCount: result.invalidatedCount,
        }
      );

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.executionTime = Date.now() - startTime;

      await this.auditLoggingService.logFailure(
        'manual',
        'cache-invalidation',
        'cache-invalidation',
        'invalidate_by_pattern',
        'PATTERN_INVALIDATION_ERROR',
        result.errors.join(', '),
        result.executionTime,
        {
          pattern: pattern.toString(),
        }
      );

      return result;
    }
  }

  /**
   * Manually invalidates cache entries by path
   */
  async invalidateByPath(path: string): Promise<InvalidationResult> {
    const startTime = Date.now();
    const result: InvalidationResult = {
      success: true,
      invalidatedKeys: [],
      invalidatedCount: 0,
      executionTime: 0,
      errors: [],
    };

    try {
      // Create a pattern that matches the path and its subpaths
      const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`^${escapedPath}(/.*)?$`);

      const entries = this.cacheService.getEntriesByPattern(pattern);
      const keysToInvalidate = Array.from(entries.keys());

      for (const key of keysToInvalidate) {
        await this.cacheService.delete(key);
        result.invalidatedKeys.push(key);
        result.invalidatedCount++;
      }

      result.executionTime = Date.now() - startTime;

      await this.auditLoggingService.logSuccess(
        'manual',
        'cache-invalidation',
        'cache-invalidation',
        'invalidate_by_path',
        result.executionTime,
        {
          path,
          invalidatedCount: result.invalidatedCount,
        }
      );

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.executionTime = Date.now() - startTime;

      await this.auditLoggingService.logFailure(
        'manual',
        'cache-invalidation',
        'cache-invalidation',
        'invalidate_by_path',
        'PATH_INVALIDATION_ERROR',
        result.errors.join(', '),
        result.executionTime,
        { path }
      );

      return result;
    }
  }

  /**
   * Manually invalidates cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<InvalidationResult> {
    const startTime = Date.now();
    const result: InvalidationResult = {
      success: true,
      invalidatedKeys: [],
      invalidatedCount: 0,
      executionTime: 0,
      errors: [],
    };

    try {
      const entries = this.cacheService.getEntriesByTags(tags);
      const keysToInvalidate = Array.from(entries.keys());

      for (const key of keysToInvalidate) {
        await this.cacheService.delete(key);
        result.invalidatedKeys.push(key);
        result.invalidatedCount++;
      }

      result.executionTime = Date.now() - startTime;

      await this.auditLoggingService.logSuccess(
        'manual',
        'cache-invalidation',
        'cache-invalidation',
        'invalidate_by_tags',
        result.executionTime,
        {
          tags,
          invalidatedCount: result.invalidatedCount,
        }
      );

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.executionTime = Date.now() - startTime;

      await this.auditLoggingService.logFailure(
        'manual',
        'cache-invalidation',
        'cache-invalidation',
        'invalidate_by_tags',
        'TAGS_INVALIDATION_ERROR',
        result.errors.join(', '),
        result.executionTime,
        { tags }
      );

      return result;
    }
  }

  // Private methods

  private validateEvent(event: InvalidationEvent): void {
    if (!event.id || typeof event.id !== 'string') {
      throw new Error('Event ID is required');
    }

    if (!event.eventType || !['create', 'modify', 'delete', 'move', 'rename'].includes(event.eventType)) {
      throw new Error('Invalid event type');
    }

    if (!event.path || typeof event.path !== 'string') {
      throw new Error('Event path is required');
    }

    if (!event.timestamp || !(event.timestamp instanceof Date)) {
      throw new Error('Event timestamp is required and must be a Date');
    }
  }

  private validateRule(rule: InvalidationRule): void {
    if (!rule.id || typeof rule.id !== 'string') {
      throw new Error('Rule ID is required');
    }

    if (!rule.pattern || !(rule.pattern instanceof RegExp)) {
      throw new Error('Rule pattern is required and must be a RegExp');
    }

    if (!rule.eventTypes || !Array.isArray(rule.eventTypes)) {
      throw new Error('Rule event types are required and must be an array');
    }

    if (!rule.paths || !Array.isArray(rule.paths)) {
      throw new Error('Rule paths are required and must be an array');
    }

    if (typeof rule.priority !== 'number' || rule.priority < 0) {
      throw new Error('Rule priority must be a non-negative number');
    }

    if (typeof rule.enabled !== 'boolean') {
      throw new Error('Rule enabled must be a boolean');
    }
  }

  private findApplicableRules(event: InvalidationEvent): InvalidationRule[] {
    const applicableRules: InvalidationRule[] = [];

    for (const rule of this.invalidationRules.values()) {
      if (!rule.enabled) {
        continue;
      }

      // Check if event type matches
      if (!rule.eventTypes.includes(event.eventType)) {
        continue;
      }

      // Check if path matches any of the rule paths
      const pathMatches = rule.paths.some(rulePath => {
        if (rulePath === '*') {
          return true; // Match all paths
        }
        return event.path.startsWith(rulePath);
      });

      if (!pathMatches) {
        continue;
      }

      // Check if pattern matches
      if (!rule.pattern.test(event.path)) {
        continue;
      }

      applicableRules.push(rule);
    }

    // Sort by priority (higher priority first)
    return applicableRules.sort((a, b) => b.priority - a.priority);
  }

  private async processRule(rule: InvalidationRule, event: InvalidationEvent): Promise<{
    invalidatedKeys: string[];
    invalidatedCount: number;
  }> {
    const invalidatedKeys: string[] = [];
    let invalidatedCount = 0;

    // Find cache entries that match the rule pattern
    const entries = this.cacheService.getEntriesByPattern(rule.pattern);

    for (const [key, entry] of entries.entries()) {
      // Check if the entry is related to the event path
      if (this.isEntryRelatedToEvent(entry, event)) {
        await this.cacheService.delete(key);
        invalidatedKeys.push(key);
        invalidatedCount++;
      }
    }

    // Update rule statistics
    const currentCount = this.stats.ruleInvalidations.get(rule.id) || 0;
    this.stats.ruleInvalidations.set(rule.id, currentCount + invalidatedCount);

    return { invalidatedKeys, invalidatedCount };
  }

  private isEntryRelatedToEvent(entry: any, event: InvalidationEvent): boolean {
    // This is a simplified check - in a real implementation, this would be more sophisticated
    // For now, we'll check if the entry's key or metadata contains the event path
    
    const entryKey = entry.key || '';
    const entryPath = entry.metadata?.path || entry.value?.path || '';
    
    return entryKey.includes(event.path) || entryPath.includes(event.path);
  }

  private recordEvent(event: InvalidationEvent): void {
    this.eventHistory.push(event);
    
    // Limit event history size
    if (this.eventHistory.length > 10000) {
      this.eventHistory = this.eventHistory.slice(-5000);
    }
  }

  private updateStats(event: InvalidationEvent, invalidatedCount: number, executionTime: number): void {
    this.stats.totalEvents++;
    this.stats.totalInvalidations += invalidatedCount;
    this.stats.totalInvalidationTime += executionTime;

    // Update event type statistics
    const currentEventCount = this.stats.eventTypes.get(event.eventType) || 0;
    this.stats.eventTypes.set(event.eventType, currentEventCount + 1);

    // Update path statistics
    const currentPathCount = this.stats.pathInvalidations.get(event.path) || 0;
    this.stats.pathInvalidations.set(event.path, currentPathCount + 1);
  }

  private initializeDefaultRules(): void {
    // Default rule for file modifications
    this.addRule({
      id: 'file_modify',
      pattern: /\.(txt|json|xml|yaml|yml|md|csv|log)$/i,
      eventTypes: ['modify', 'delete'],
      paths: ['*'],
      priority: 10,
      enabled: true,
    });

    // Default rule for directory changes
    this.addRule({
      id: 'directory_change',
      pattern: /^\/.*\/$/,
      eventTypes: ['create', 'delete', 'move', 'rename'],
      paths: ['*'],
      priority: 20,
      enabled: true,
    });

    // Default rule for configuration files
    this.addRule({
      id: 'config_files',
      pattern: /\.(conf|config|ini|cfg|properties)$/i,
      eventTypes: ['create', 'modify', 'delete'],
      paths: ['*'],
      priority: 30,
      enabled: true,
    });

    // Default rule for temporary files
    this.addRule({
      id: 'temp_files',
      pattern: /\.(tmp|temp|bak|backup)$/i,
      eventTypes: ['create', 'modify', 'delete'],
      paths: ['*'],
      priority: 5,
      enabled: true,
    });
  }
}
