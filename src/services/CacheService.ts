/**
 * Cache Service
 * 
 * Implements comprehensive caching with TTL, eviction policies, and memory management.
 * Provides efficient caching for file system operations with security validation.
 */

import { CacheEntry, CacheEntryData } from '../models/CacheEntry';
import { Configuration } from '../models/Configuration';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size in bytes
  maxEntries?: number; // Maximum number of entries
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

export class CacheService {
  private config: Configuration;
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // For LRU eviction
  private accessCount: Map<string, number> = new Map(); // For LFU eviction
  private options: CacheOptions;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    totalOperations: number;
    totalAccessTime: number;
  } = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalOperations: 0,
    totalAccessTime: 0,
  };

  constructor(config: Configuration, options: CacheOptions = {}) {
    this.config = config;
    this.options = {
      ttl: 300, // 5 minutes default
      maxSize: config.getCacheSizeBytes(),
      maxEntries: 10000,
      evictionPolicy: 'LRU',
      enableCompression: false,
      enableEncryption: false,
      ...options,
    };
  }

  /**
   * Gets a value from the cache
   */
  async get(key: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      this.stats.totalOperations++;
      
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        return null;
      }

      // Check if entry is expired
      if (entry.isExpired()) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        this.accessCount.delete(key);
        this.stats.misses++;
        return null;
      }

      // Update access tracking
      entry.updateLastAccessed();
      this.updateAccessTracking(key);

      this.stats.hits++;
      this.stats.totalAccessTime += Date.now() - startTime;

      return entry.value;
    } catch (error) {
      this.stats.totalOperations++;
      this.stats.misses++;
      throw error;
    }
  }

  /**
   * Sets a value in the cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.stats.totalOperations++;

      // Create cache entry
      const entry = CacheEntry.create(
        key,
        value,
        ttl || this.options.ttl!,
        [],
        {
          createdBy: 'CacheService',
          createdAt: new Date().toISOString(),
        }
      );

      // Check if we need to evict entries
      await this.checkAndEvict(entry);

      // Store the entry
      this.cache.set(key, entry);
      this.updateAccessTracking(key);

      this.stats.totalAccessTime += Date.now() - startTime;
    } catch (error) {
      this.stats.totalOperations++;
      throw error;
    }
  }

  /**
   * Deletes a value from the cache
   */
  async delete(key: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      this.stats.totalOperations++;

      const existed = this.cache.has(key);
      
      if (existed) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        this.accessCount.delete(key);
      }

      this.stats.totalAccessTime += Date.now() - startTime;
      return existed;
    } catch (error) {
      this.stats.totalOperations++;
      throw error;
    }
  }

  /**
   * Clears all entries from the cache
   */
  async clear(): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.stats.totalOperations++;

      this.cache.clear();
      this.accessOrder = [];
      this.accessCount.clear();

      this.stats.totalAccessTime += Date.now() - startTime;
    } catch (error) {
      this.stats.totalOperations++;
      throw error;
    }
  }

  /**
   * Checks if a key exists in the cache
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    return entry !== undefined && !entry.isExpired();
  }

  /**
   * Gets multiple values from the cache
   */
  async getMany(keys: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    
    return results;
  }

  /**
   * Sets multiple values in the cache
   */
  async setMany(entries: Map<string, any>, ttl?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * Deletes multiple keys from the cache
   */
  async deleteMany(keys: string[]): Promise<number> {
    let deletedCount = 0;
    
    for (const key of keys) {
      if (await this.delete(key)) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    const totalAccesses = this.stats.hits + this.stats.misses;
    const hitRate = totalAccesses > 0 ? this.stats.hits / totalAccesses : 0;
    const missRate = totalAccesses > 0 ? this.stats.misses / totalAccesses : 0;
    
    let memoryUsage = 0;
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;
    
    for (const entry of this.cache.values()) {
      memoryUsage += entry.size;
      
      if (!oldestEntry || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
      
      if (!newestEntry || entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }
    }

    const averageAccessTime = this.stats.totalOperations > 0 ? 
      this.stats.totalAccessTime / this.stats.totalOperations : 0;

    return {
      size: memoryUsage,
      maxSize: this.options.maxSize!,
      entries: this.cache.size,
      maxEntries: this.options.maxEntries!,
      hitRate,
      missRate,
      evictionCount: this.stats.evictions,
      memoryUsage,
      compressionRatio: 1.0, // Would be calculated if compression is enabled
      averageAccessTime,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Gets cache entries by pattern
   */
  getEntriesByPattern(pattern: RegExp): Map<string, CacheEntry> {
    const results = new Map<string, CacheEntry>();
    
    for (const [key, entry] of this.cache.entries()) {
      if (pattern.test(key) && !entry.isExpired()) {
        results.set(key, entry);
      }
    }
    
    return results;
  }

  /**
   * Gets cache entries by tags
   */
  getEntriesByTags(tags: string[]): Map<string, CacheEntry> {
    const results = new Map<string, CacheEntry>();
    
    for (const [key, entry] of this.cache.entries()) {
      if (!entry.isExpired() && tags.some(tag => entry.hasTag(tag))) {
        results.set(key, entry);
      }
    }
    
    return results;
  }

  /**
   * Evicts entries by pattern
   */
  async evictByPattern(pattern: RegExp): Promise<number> {
    let evictedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        if (await this.delete(key)) {
          evictedCount++;
          this.stats.evictions++;
        }
      }
    }
    
    return evictedCount;
  }

  /**
   * Evicts entries by tags
   */
  async evictByTags(tags: string[]): Promise<number> {
    let evictedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.hasTag(tag))) {
        if (await this.delete(key)) {
          evictedCount++;
          this.stats.evictions++;
        }
      }
    }
    
    return evictedCount;
  }

  /**
   * Evicts expired entries
   */
  async evictExpired(): Promise<number> {
    let evictedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired()) {
        if (await this.delete(key)) {
          evictedCount++;
          this.stats.evictions++;
        }
      }
    }
    
    return evictedCount;
  }

  /**
   * Updates cache options
   */
  updateOptions(newOptions: Partial<CacheOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // If max size or max entries changed, check if we need to evict
    if (newOptions.maxSize || newOptions.maxEntries) {
      this.checkAndEvict();
    }
  }

  /**
   * Gets cache configuration
   */
  getOptions(): CacheOptions {
    return { ...this.options };
  }

  /**
   * Exports cache data
   */
  exportCache(): string {
    const cacheData: Record<string, CacheEntryData> = {};
    
    for (const [key, entry] of this.cache.entries()) {
      if (!entry.isExpired()) {
        cacheData[key] = entry.toJSON();
      }
    }
    
    return JSON.stringify(cacheData, null, 2);
  }

  /**
   * Imports cache data
   */
  async importCache(cacheData: string): Promise<void> {
    try {
      const data = JSON.parse(cacheData);
      
      for (const [key, entryData] of Object.entries(data)) {
        const entry = CacheEntry.fromJSON(entryData as CacheEntryData);
        
        if (!entry.isExpired()) {
          this.cache.set(key, entry);
          this.updateAccessTracking(key);
        }
      }
    } catch (error) {
      throw new Error(`Failed to import cache data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private methods

  private async checkAndEvict(newEntry?: CacheEntry): Promise<void> {
    // Check if we need to evict based on size
    if (newEntry) {
      const currentSize = this.getCurrentSize();
      if (currentSize + newEntry.size > this.options.maxSize!) {
        await this.evictBySize(newEntry.size);
      }
    }

    // Check if we need to evict based on entry count
    if (this.cache.size >= this.options.maxEntries!) {
      await this.evictByCount(1);
    }
  }

  private async evictBySize(requiredSpace: number): Promise<void> {
    const currentSize = this.getCurrentSize();
    let freedSpace = 0;
    
    while (freedSpace < requiredSpace && this.cache.size > 0) {
      const keyToEvict = this.getKeyToEvict();
      if (keyToEvict) {
        const entry = this.cache.get(keyToEvict);
        if (entry) {
          freedSpace += entry.size;
          await this.delete(keyToEvict);
          this.stats.evictions++;
        }
      } else {
        break;
      }
    }
  }

  private async evictByCount(count: number): Promise<void> {
    for (let i = 0; i < count && this.cache.size > 0; i++) {
      const keyToEvict = this.getKeyToEvict();
      if (keyToEvict) {
        await this.delete(keyToEvict);
        this.stats.evictions++;
      } else {
        break;
      }
    }
  }

  private getKeyToEvict(): string | null {
    switch (this.options.evictionPolicy) {
      case 'LRU':
        return this.accessOrder.length > 0 ? this.accessOrder[0] : null;
      case 'LFU':
        let minAccessCount = Infinity;
        let keyToEvict: string | null = null;
        
        for (const [key, count] of this.accessCount.entries()) {
          if (count < minAccessCount) {
            minAccessCount = count;
            keyToEvict = key;
          }
        }
        
        return keyToEvict;
      case 'FIFO':
        // For FIFO, we can use the order of insertion (first in, first out)
        return this.cache.keys().next().value || null;
      case 'TTL':
        // For TTL, evict the oldest entry
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        
        for (const [key, entry] of this.cache.entries()) {
          const age = entry.getAge();
          if (age < oldestTime) {
            oldestTime = age;
            oldestKey = key;
          }
        }
        
        return oldestKey;
      default:
        return this.accessOrder.length > 0 ? this.accessOrder[0] : null;
    }
  }

  private getCurrentSize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += entry.size;
    }
    return size;
  }

  private updateAccessTracking(key: string): void {
    // Update access order for LRU
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
    
    // Update access count for LFU
    const currentCount = this.accessCount.get(key) || 0;
    this.accessCount.set(key, currentCount + 1);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}
