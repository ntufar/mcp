"use strict";
/**
 * AccessLog Entity
 *
 * Represents audit log entries for file system access tracking.
 * Implements security-first design with comprehensive logging.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessLog = void 0;
class AccessLog {
    _data;
    constructor(data) {
        this.validateInput(data);
        this._data = {
            ...data,
            timestamp: new Date(data.timestamp),
        };
    }
    // Getters
    get id() {
        return this._data.id;
    }
    get timestamp() {
        return new Date(this._data.timestamp);
    }
    get userId() {
        return this._data.userId;
    }
    get clientId() {
        return this._data.clientId;
    }
    get clientType() {
        return this._data.clientType;
    }
    get sessionId() {
        return this._data.sessionId;
    }
    get operation() {
        return this._data.operation;
    }
    get targetPath() {
        return this._data.targetPath;
    }
    get searchQuery() {
        return this._data.searchQuery;
    }
    get searchPath() {
        return this._data.searchPath;
    }
    get success() {
        return this._data.success;
    }
    get errorCode() {
        return this._data.errorCode;
    }
    get errorMessage() {
        return this._data.errorMessage;
    }
    get duration() {
        return this._data.duration;
    }
    get fileSize() {
        return this._data.fileSize;
    }
    get contentHash() {
        return this._data.contentHash;
    }
    get resultCount() {
        return this._data.resultCount;
    }
    get ipAddress() {
        return this._data.ipAddress;
    }
    get userAgent() {
        return this._data.userAgent;
    }
    get severity() {
        return this._data.severity;
    }
    get securityEvent() {
        return this._data.securityEvent || false;
    }
    get details() {
        return this._data.details ? { ...this._data.details } : undefined;
    }
    // Methods
    updateSeverity(severity) {
        this._data.severity = severity;
    }
    updateSecurityEvent(isSecurityEvent) {
        this._data.securityEvent = isSecurityEvent;
    }
    addDetail(key, value) {
        if (!this._data.details) {
            this._data.details = {};
        }
        this._data.details[key] = value;
    }
    removeDetail(key) {
        if (this._data.details) {
            delete this._data.details[key];
        }
    }
    updateDuration(duration) {
        if (duration < 0) {
            throw new Error('Duration cannot be negative');
        }
        this._data.duration = duration;
    }
    updateResultCount(resultCount) {
        if (resultCount < 0) {
            throw new Error('Result count cannot be negative');
        }
        this._data.resultCount = resultCount;
    }
    // Serialization
    toJSON() {
        return {
            ...this._data,
            timestamp: this._data.timestamp,
        };
    }
    static fromJSON(data) {
        return new AccessLog(data);
    }
    // Validation
    validateInput(data) {
        if (!data.id || typeof data.id !== 'string') {
            throw new Error('ID is required and must be a string');
        }
        if (!data.userId || typeof data.userId !== 'string') {
            throw new Error('User ID is required and must be a string');
        }
        if (!data.clientId || typeof data.clientId !== 'string') {
            throw new Error('Client ID is required and must be a string');
        }
        if (!data.clientType || typeof data.clientType !== 'string') {
            throw new Error('Client type is required and must be a string');
        }
        if (!data.operation || typeof data.operation !== 'string') {
            throw new Error('Operation is required and must be a string');
        }
        if (typeof data.success !== 'boolean') {
            throw new Error('Success must be a boolean');
        }
        if (typeof data.duration !== 'number' || data.duration < 0) {
            throw new Error('Duration must be a non-negative number');
        }
        if (!data.timestamp || (!(data.timestamp instanceof Date) && typeof data.timestamp !== 'string')) {
            throw new Error('Timestamp is required and must be a Date or string');
        }
        if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(data.severity)) {
            throw new Error('Severity must be LOW, MEDIUM, HIGH, or CRITICAL');
        }
        // Validate optional fields
        if (data.sessionId !== undefined && typeof data.sessionId !== 'string') {
            throw new Error('Session ID must be a string');
        }
        if (data.targetPath !== undefined && typeof data.targetPath !== 'string') {
            throw new Error('Target path must be a string');
        }
        if (data.searchQuery !== undefined && typeof data.searchQuery !== 'string') {
            throw new Error('Search query must be a string');
        }
        if (data.searchPath !== undefined && typeof data.searchPath !== 'string') {
            throw new Error('Search path must be a string');
        }
        if (data.errorCode !== undefined && typeof data.errorCode !== 'string') {
            throw new Error('Error code must be a string');
        }
        if (data.errorMessage !== undefined && typeof data.errorMessage !== 'string') {
            throw new Error('Error message must be a string');
        }
        if (data.fileSize !== undefined && (typeof data.fileSize !== 'number' || data.fileSize < 0)) {
            throw new Error('File size must be a non-negative number');
        }
        if (data.contentHash !== undefined && typeof data.contentHash !== 'string') {
            throw new Error('Content hash must be a string');
        }
        if (data.resultCount !== undefined && (typeof data.resultCount !== 'number' || data.resultCount < 0)) {
            throw new Error('Result count must be a non-negative number');
        }
        if (data.ipAddress !== undefined && typeof data.ipAddress !== 'string') {
            throw new Error('IP address must be a string');
        }
        if (data.userAgent !== undefined && typeof data.userAgent !== 'string') {
            throw new Error('User agent must be a string');
        }
        if (data.securityEvent !== undefined && typeof data.securityEvent !== 'boolean') {
            throw new Error('Security event must be a boolean');
        }
        if (data.details !== undefined && (typeof data.details !== 'object' || Array.isArray(data.details))) {
            throw new Error('Details must be an object');
        }
        // Validate path format if provided
        if (data.targetPath) {
            this.validatePathFormat(data.targetPath);
        }
        if (data.searchPath) {
            this.validatePathFormat(data.searchPath);
        }
        // Validate content hash format if provided
        if (data.contentHash) {
            this.validateContentHash(data.contentHash);
        }
        // Validate IP address format if provided
        if (data.ipAddress) {
            this.validateIPAddress(data.ipAddress);
        }
    }
    validatePathFormat(path) {
        // Check for directory traversal attempts
        if (path.includes('..') || path.includes('~')) {
            throw new Error('Path contains invalid characters for security');
        }
        // Check for null bytes
        if (path.includes('\x00')) {
            throw new Error('Path contains null bytes');
        }
        // Check for control characters
        if (/[\x00-\x1f\x7f]/.test(path)) {
            throw new Error('Path contains control characters');
        }
    }
    validateContentHash(hash) {
        // Validate SHA-256 hash format
        if (!/^sha256:[a-f0-9]{64}$/i.test(hash)) {
            throw new Error('Content hash must be in format "sha256:hex64"');
        }
    }
    validateIPAddress(ip) {
        // Basic IP address validation
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
            throw new Error('Invalid IP address format');
        }
    }
    // Utility methods
    isRecent(seconds = 300) {
        const now = new Date();
        const logTime = new Date(this._data.timestamp);
        const diffSeconds = (now.getTime() - logTime.getTime()) / 1000;
        return diffSeconds <= seconds;
    }
    isToday() {
        const today = new Date();
        const logDate = new Date(this._data.timestamp);
        return today.toDateString() === logDate.toDateString();
    }
    isThisWeek() {
        const now = new Date();
        const logDate = new Date(this._data.timestamp);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return logDate >= weekAgo;
    }
    isHighSeverity() {
        return this._data.severity === 'HIGH' || this._data.severity === 'CRITICAL';
    }
    isSecurityRelated() {
        return this._data.securityEvent ||
            this._data.operation.includes('security') ||
            this._data.errorCode?.includes('SECURITY') ||
            this._data.severity === 'HIGH' ||
            this._data.severity === 'CRITICAL';
    }
    isFailedOperation() {
        return !this._data.success;
    }
    isSlowOperation(thresholdMs = 1000) {
        return this._data.duration > thresholdMs;
    }
    getOperationCategory() {
        const operation = this._data.operation.toLowerCase();
        if (operation.includes('list') || operation.includes('directory')) {
            return 'directory_listing';
        }
        else if (operation.includes('read') || operation.includes('file')) {
            return 'file_reading';
        }
        else if (operation.includes('search')) {
            return 'file_search';
        }
        else if (operation.includes('metadata')) {
            return 'metadata_retrieval';
        }
        else if (operation.includes('permission')) {
            return 'permission_checking';
        }
        else {
            return 'other';
        }
    }
    getHumanReadableDuration() {
        const duration = this._data.duration;
        if (duration < 1000) {
            return `${duration}ms`;
        }
        else if (duration < 60000) {
            return `${(duration / 1000).toFixed(2)}s`;
        }
        else {
            return `${(duration / 60000).toFixed(2)}m`;
        }
    }
    // Static factory methods
    static createFromOperation(userId, clientId, clientType, operation, success, duration, options = {}) {
        const id = this.generateId();
        const timestamp = new Date();
        // Determine severity based on operation and success
        let severity = 'LOW';
        if (!success) {
            severity = 'HIGH';
        }
        else if (duration > 5000) {
            severity = 'MEDIUM';
        }
        return new AccessLog({
            id,
            timestamp,
            userId,
            clientId,
            clientType,
            operation,
            success,
            duration,
            severity,
            ...options,
        });
    }
    static createSecurityEvent(userId, clientId, clientType, operation, targetPath, errorCode, errorMessage, duration = 0) {
        return new AccessLog({
            id: this.generateId(),
            timestamp: new Date(),
            userId,
            clientId,
            clientType,
            operation,
            targetPath,
            success: false,
            errorCode,
            errorMessage,
            duration,
            severity: 'CRITICAL',
            securityEvent: true,
        });
    }
    static createPerformanceEvent(userId, clientId, clientType, operation, duration, fileSize, resultCount) {
        let severity = 'LOW';
        if (duration > 10000) {
            severity = 'HIGH';
        }
        else if (duration > 5000) {
            severity = 'MEDIUM';
        }
        return new AccessLog({
            id: this.generateId(),
            timestamp: new Date(),
            userId,
            clientId,
            clientType,
            operation,
            success: true,
            duration,
            fileSize,
            resultCount,
            severity,
        });
    }
    static generateId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.AccessLog = AccessLog;
//# sourceMappingURL=AccessLog.js.map