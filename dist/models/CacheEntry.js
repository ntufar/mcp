"use strict";
/**
 * CacheEntry Entity
 *
 * Represents a cache entry with TTL and metadata.
 * Implements security-first design with cache invalidation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheEntry = void 0;
class CacheEntry {
    _data;
    constructor(data) {
        this.validateInput(data);
        this._data = {
            ...data,
            createdAt: new Date(data.createdAt),
            expiresAt: new Date(data.expiresAt),
            lastAccessed: new Date(data.lastAccessed),
        };
    }
    // Getters
    get key() {
        return this._data.key;
    }
    get value() {
        return this._data.value;
    }
    get createdAt() {
        return new Date(this._data.createdAt);
    }
    get expiresAt() {
        return new Date(this._data.expiresAt);
    }
    get lastAccessed() {
        return new Date(this._data.lastAccessed);
    }
    get accessCount() {
        return this._data.accessCount;
    }
    get size() {
        return this._data.size;
    }
    get tags() {
        return [...this._data.tags];
    }
    get metadata() {
        return { ...this._data.metadata };
    }
    // Methods
    updateValue(value, newSize) {
        this._data.value = value;
        this._data.size = newSize || this.calculateSize(value);
        this.updateLastAccessed();
    }
    updateExpiresAt(expiresAt) {
        if (expiresAt <= this._data.createdAt) {
            throw new Error('Expiration time must be after creation time');
        }
        this._data.expiresAt = new Date(expiresAt);
    }
    extendTTL(ttlSeconds) {
        if (ttlSeconds <= 0) {
            throw new Error('TTL must be positive');
        }
        const now = new Date();
        this._data.expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    }
    updateLastAccessed() {
        this._data.lastAccessed = new Date();
        this._data.accessCount++;
    }
    addTag(tag) {
        this.validateTag(tag);
        if (!this._data.tags.includes(tag)) {
            this._data.tags.push(tag);
        }
    }
    removeTag(tag) {
        const index = this._data.tags.indexOf(tag);
        if (index > -1) {
            this._data.tags.splice(index, 1);
        }
    }
    hasTag(tag) {
        return this._data.tags.includes(tag);
    }
    addMetadata(key, value) {
        this.validateMetadataKey(key);
        this._data.metadata[key] = value;
    }
    removeMetadata(key) {
        delete this._data.metadata[key];
    }
    getMetadata(key) {
        return this._data.metadata[key];
    }
    // Cache lifecycle methods
    isExpired() {
        return new Date() > this._data.expiresAt;
    }
    isStale(maxAgeSeconds) {
        const now = new Date();
        const ageSeconds = (now.getTime() - this._data.createdAt.getTime()) / 1000;
        return ageSeconds > maxAgeSeconds;
    }
    shouldEvict(maxAccessCount, maxAgeSeconds) {
        if (this.isExpired()) {
            return true;
        }
        if (this.isStale(maxAgeSeconds)) {
            return true;
        }
        if (this._data.accessCount > maxAccessCount) {
            return true;
        }
        return false;
    }
    getAge() {
        return (new Date().getTime() - this._data.createdAt.getTime()) / 1000;
    }
    getTimeUntilExpiry() {
        const now = new Date();
        const timeUntilExpiry = this._data.expiresAt.getTime() - now.getTime();
        return Math.max(0, timeUntilExpiry / 1000);
    }
    getAccessFrequency() {
        const ageSeconds = this.getAge();
        if (ageSeconds === 0) {
            return 0;
        }
        return this._data.accessCount / ageSeconds;
    }
    // Serialization
    toJSON() {
        return {
            ...this._data,
            createdAt: this._data.createdAt,
            expiresAt: this._data.expiresAt,
            lastAccessed: this._data.lastAccessed,
        };
    }
    static fromJSON(data) {
        return new CacheEntry(data);
    }
    // Validation
    validateInput(data) {
        if (!data.key || typeof data.key !== 'string') {
            throw new Error('Key is required and must be a string');
        }
        if (data.key.length === 0 || data.key.length > 255) {
            throw new Error('Key must be between 1 and 255 characters');
        }
        if (data.value === undefined || data.value === null) {
            throw new Error('Value cannot be undefined or null');
        }
        if (!data.createdAt || (!(data.createdAt instanceof Date) && typeof data.createdAt !== 'string')) {
            throw new Error('Created at is required and must be a Date or string');
        }
        if (!data.expiresAt || (!(data.expiresAt instanceof Date) && typeof data.expiresAt !== 'string')) {
            throw new Error('Expires at is required and must be a Date or string');
        }
        if (!data.lastAccessed || (!(data.lastAccessed instanceof Date) && typeof data.lastAccessed !== 'string')) {
            throw new Error('Last accessed is required and must be a Date or string');
        }
        if (typeof data.accessCount !== 'number' || data.accessCount < 0) {
            throw new Error('Access count must be a non-negative number');
        }
        if (typeof data.size !== 'number' || data.size < 0) {
            throw new Error('Size must be a non-negative number');
        }
        if (!Array.isArray(data.tags)) {
            throw new Error('Tags must be an array');
        }
        data.tags.forEach(tag => this.validateTag(tag));
        if (typeof data.metadata !== 'object' || Array.isArray(data.metadata)) {
            throw new Error('Metadata must be an object');
        }
        // Validate expiration time is after creation time
        const createdAt = new Date(data.createdAt);
        const expiresAt = new Date(data.expiresAt);
        if (expiresAt <= createdAt) {
            throw new Error('Expiration time must be after creation time');
        }
        // Validate last accessed is not before creation
        const lastAccessed = new Date(data.lastAccessed);
        if (lastAccessed < createdAt) {
            throw new Error('Last accessed time cannot be before creation time');
        }
    }
    validateTag(tag) {
        if (typeof tag !== 'string') {
            throw new Error('Tag must be a string');
        }
        if (tag.length === 0 || tag.length > 50) {
            throw new Error('Tag must be between 1 and 50 characters');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(tag)) {
            throw new Error('Tag contains invalid characters');
        }
    }
    validateMetadataKey(key) {
        if (typeof key !== 'string') {
            throw new Error('Metadata key must be a string');
        }
        if (key.length === 0 || key.length > 100) {
            throw new Error('Metadata key must be between 1 and 100 characters');
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
            throw new Error('Metadata key contains invalid characters');
        }
    }
    calculateSize(value) {
        try {
            return JSON.stringify(value).length;
        }
        catch (error) {
            // Fallback for non-serializable values
            return String(value).length;
        }
    }
    // Utility methods
    getHumanReadableSize() {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = this._data.size;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
    }
    getHumanReadableAge() {
        const age = this.getAge();
        if (age < 60) {
            return `${Math.floor(age)}s`;
        }
        else if (age < 3600) {
            return `${Math.floor(age / 60)}m`;
        }
        else if (age < 86400) {
            return `${Math.floor(age / 3600)}h`;
        }
        else {
            return `${Math.floor(age / 86400)}d`;
        }
    }
    getHumanReadableTimeUntilExpiry() {
        const timeUntilExpiry = this.getTimeUntilExpiry();
        if (timeUntilExpiry < 60) {
            return `${Math.floor(timeUntilExpiry)}s`;
        }
        else if (timeUntilExpiry < 3600) {
            return `${Math.floor(timeUntilExpiry / 60)}m`;
        }
        else if (timeUntilExpiry < 86400) {
            return `${Math.floor(timeUntilExpiry / 3600)}h`;
        }
        else {
            return `${Math.floor(timeUntilExpiry / 86400)}d`;
        }
    }
    clone() {
        return new CacheEntry(this.toJSON());
    }
    // Static factory methods
    static create(key, value, ttlSeconds, tags = [], metadata = {}) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
        const size = JSON.stringify(value).length;
        return new CacheEntry({
            key,
            value,
            createdAt: now,
            expiresAt,
            lastAccessed: now,
            accessCount: 0,
            size,
            tags,
            metadata,
        });
    }
    static createWithCustomExpiry(key, value, expiresAt, tags = [], metadata = {}) {
        const now = new Date();
        const size = JSON.stringify(value).length;
        return new CacheEntry({
            key,
            value,
            createdAt: now,
            expiresAt,
            lastAccessed: now,
            accessCount: 0,
            size,
            tags,
            metadata,
        });
    }
    static createPermanent(key, value, tags = [], metadata = {}) {
        const now = new Date();
        const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
        const size = JSON.stringify(value).length;
        return new CacheEntry({
            key,
            value,
            createdAt: now,
            expiresAt: farFuture,
            lastAccessed: now,
            accessCount: 0,
            size,
            tags,
            metadata,
        });
    }
    static createFromFileSystem(key, fileData, ttlSeconds = 300, tags = ['filesystem']) {
        const metadata = {
            type: 'filesystem',
            cachedAt: new Date().toISOString(),
        };
        return CacheEntry.create(key, fileData, ttlSeconds, tags, metadata);
    }
    static createFromDirectoryListing(key, directoryData, ttlSeconds = 180, tags = ['directory', 'listing']) {
        const metadata = {
            type: 'directory_listing',
            cachedAt: new Date().toISOString(),
            fileCount: directoryData.files?.length || 0,
            directoryCount: directoryData.directories?.length || 0,
        };
        return CacheEntry.create(key, directoryData, ttlSeconds, tags, metadata);
    }
    static createFromSearchResults(key, searchResults, ttlSeconds = 120, tags = ['search', 'results']) {
        const metadata = {
            type: 'search_results',
            cachedAt: new Date().toISOString(),
            resultCount: searchResults.results?.length || 0,
            query: searchResults.query,
        };
        return CacheEntry.create(key, searchResults, ttlSeconds, tags, metadata);
    }
}
exports.CacheEntry = CacheEntry;
//# sourceMappingURL=CacheEntry.js.map