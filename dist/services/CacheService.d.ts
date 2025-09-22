/**
 * Cache Service
 *
 * Implements comprehensive caching with TTL, eviction policies, and memory management.
 * Provides efficient caching for file system operations with security validation.
 */
import { CacheEntry } from '../models/CacheEntry';
import { Configuration } from '../models/Configuration';
export interface CacheOptions {
    ttl?: number;
    maxSize?: number;
    maxEntries?: number;
    evictionPolicy?: 'LRU' | 'LFU' | 'FIFO' | 'TTL';
    enableCompression?: boolean;
    enableEncryption?: boolean;
}
export interface CacheStats {
    size: number;
    maxSize: number;
    entries: number;
    maxEntries: number;
    hitRate: number;
    missRate: number;
    evictionCount: number;
    memoryUsage: number;
    compressionRatio: number;
    averageAccessTime: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
}
export interface CacheOperation {
    operation: 'get' | 'set' | 'delete' | 'clear' | 'evict';
    key: string;
    timestamp: Date;
    success: boolean;
    duration: number;
    error?: string;
}
export declare class CacheService {
    private config;
    private cache;
    private accessOrder;
    private accessCount;
    private options;
    private stats;
    constructor(config: Configuration, options?: CacheOptions);
    /**
     * Gets a value from the cache
     */
    get(key: string): Promise<any>;
    /**
     * Sets a value in the cache
     */
    set(key: string, value: any, ttl?: number): Promise<void>;
    /**
     * Deletes a value from the cache
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clears all entries from the cache
     */
    clear(): Promise<void>;
    /**
     * Checks if a key exists in the cache
     */
    has(key: string): Promise<boolean>;
    /**
     * Gets multiple values from the cache
     */
    getMany(keys: string[]): Promise<Map<string, any>>;
    /**
     * Sets multiple values in the cache
     */
    setMany(entries: Map<string, any>, ttl?: number): Promise<void>;
    /**
     * Deletes multiple keys from the cache
     */
    deleteMany(keys: string[]): Promise<number>;
    /**
     * Gets cache statistics
     */
    getStats(): CacheStats;
    /**
     * Gets cache entries by pattern
     */
    getEntriesByPattern(pattern: RegExp): Map<string, CacheEntry>;
    /**
     * Gets cache entries by tags
     */
    getEntriesByTags(tags: string[]): Map<string, CacheEntry>;
    /**
     * Evicts entries by pattern
     */
    evictByPattern(pattern: RegExp): Promise<number>;
    /**
     * Evicts entries by tags
     */
    evictByTags(tags: string[]): Promise<number>;
    /**
     * Evicts expired entries
     */
    evictExpired(): Promise<number>;
    /**
     * Updates cache options
     */
    updateOptions(newOptions: Partial<CacheOptions>): void;
    /**
     * Gets cache configuration
     */
    getOptions(): CacheOptions;
    /**
     * Exports cache data
     */
    exportCache(): string;
    /**
     * Imports cache data
     */
    importCache(cacheData: string): Promise<void>;
    private checkAndEvict;
    private evictBySize;
    private evictByCount;
    private getKeyToEvict;
    private getCurrentSize;
    private updateAccessTracking;
    private removeFromAccessOrder;
}
//# sourceMappingURL=CacheService.d.ts.map