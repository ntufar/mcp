/**
 * CacheEntry Entity
 *
 * Represents a cache entry with TTL and metadata.
 * Implements security-first design with cache invalidation.
 */
export interface CacheEntryData {
    key: string;
    value: any;
    createdAt: Date;
    expiresAt: Date;
    lastAccessed: Date;
    accessCount: number;
    size: number;
    tags: string[];
    metadata: Record<string, any>;
}
export declare class CacheEntry {
    private _data;
    constructor(data: CacheEntryData);
    get key(): string;
    get value(): any;
    get createdAt(): Date;
    get expiresAt(): Date;
    get lastAccessed(): Date;
    get accessCount(): number;
    get size(): number;
    get tags(): string[];
    get metadata(): Record<string, any>;
    updateValue(value: any, newSize?: number): void;
    updateExpiresAt(expiresAt: Date): void;
    extendTTL(ttlSeconds: number): void;
    updateLastAccessed(): void;
    addTag(tag: string): void;
    removeTag(tag: string): void;
    hasTag(tag: string): boolean;
    addMetadata(key: string, value: any): void;
    removeMetadata(key: string): void;
    getMetadata(key: string): any;
    isExpired(): boolean;
    isStale(maxAgeSeconds: number): boolean;
    shouldEvict(maxAccessCount: number, maxAgeSeconds: number): boolean;
    getAge(): number;
    getTimeUntilExpiry(): number;
    getAccessFrequency(): number;
    toJSON(): CacheEntryData;
    static fromJSON(data: CacheEntryData): CacheEntry;
    private validateInput;
    private validateTag;
    private validateMetadataKey;
    private calculateSize;
    getHumanReadableSize(): string;
    getHumanReadableAge(): string;
    getHumanReadableTimeUntilExpiry(): string;
    clone(): CacheEntry;
    static create(key: string, value: any, ttlSeconds: number, tags?: string[], metadata?: Record<string, any>): CacheEntry;
    static createWithCustomExpiry(key: string, value: any, expiresAt: Date, tags?: string[], metadata?: Record<string, any>): CacheEntry;
    static createPermanent(key: string, value: any, tags?: string[], metadata?: Record<string, any>): CacheEntry;
    static createFromFileSystem(key: string, fileData: any, ttlSeconds?: number, tags?: string[]): CacheEntry;
    static createFromDirectoryListing(key: string, directoryData: any, ttlSeconds?: number, tags?: string[]): CacheEntry;
    static createFromSearchResults(key: string, searchResults: any, ttlSeconds?: number, tags?: string[]): CacheEntry;
}
//# sourceMappingURL=CacheEntry.d.ts.map