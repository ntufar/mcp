"use strict";
/**
 * Audit Logging Service
 *
 * Implements comprehensive audit logging with security monitoring.
 * Tracks all file system operations for security and compliance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLoggingService = void 0;
const AccessLog_1 = require("../models/AccessLog");
class AuditLoggingService {
    config;
    logs = [];
    maxLogs = 10000; // In-memory limit
    logRetentionDays = 30;
    constructor(config) {
        this.config = config;
        this.initializeService();
    }
    /**
     * Logs an audit entry
     */
    async logEntry(entry) {
        try {
            // Validate entry
            this.validateAuditEntry(entry);
            // Create AccessLog instance
            const accessLog = new AccessLog_1.AccessLog({
                id: entry.id,
                timestamp: entry.timestamp,
                userId: entry.userId,
                clientId: entry.clientId,
                clientType: entry.clientType,
                sessionId: entry.sessionId,
                operation: entry.operation,
                targetPath: entry.targetPath,
                searchQuery: entry.searchQuery,
                searchPath: entry.searchPath,
                success: entry.success,
                errorCode: entry.errorCode,
                errorMessage: entry.errorMessage,
                duration: entry.duration,
                fileSize: entry.fileSize,
                contentHash: entry.contentHash,
                resultCount: entry.resultCount,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
                severity: entry.severity,
                securityEvent: entry.securityEvent,
                details: entry.details,
            });
            // Add to logs
            this.logs.push(accessLog);
            // Maintain log size limit
            this.maintainLogSize();
            // Check for security events
            if (entry.securityEvent || entry.severity === 'HIGH' || entry.severity === 'CRITICAL') {
                await this.handleSecurityEvent(accessLog);
            }
            // Persist to file if enabled
            if (this.config.logging.enableFile) {
                await this.persistToFile(accessLog);
            }
        }
        catch (error) {
            console.error('Failed to log audit entry:', error);
            // Don't throw - audit logging should not break the main application
        }
    }
    /**
     * Logs a successful operation
     */
    async logSuccess(userId, clientId, clientType, operation, duration, options = {}) {
        const entry = {
            id: this.generateId(),
            timestamp: new Date(),
            userId,
            clientId,
            clientType,
            operation,
            success: true,
            duration,
            severity: 'LOW',
            securityEvent: false,
            ...options,
        };
        // Adjust severity based on duration
        if (duration > 10000) {
            entry.severity = 'HIGH';
        }
        else if (duration > 5000) {
            entry.severity = 'MEDIUM';
        }
        await this.logEntry(entry);
    }
    /**
     * Logs a failed operation
     */
    async logFailure(userId, clientId, clientType, operation, errorCode, errorMessage, duration, options = {}) {
        const entry = {
            id: this.generateId(),
            timestamp: new Date(),
            userId,
            clientId,
            clientType,
            operation,
            success: false,
            errorCode,
            errorMessage,
            duration,
            severity: 'HIGH',
            securityEvent: true,
            ...options,
        };
        // Adjust severity based on error type
        if (errorCode.includes('SECURITY') || errorCode.includes('PERMISSION')) {
            entry.severity = 'CRITICAL';
        }
        await this.logEntry(entry);
    }
    /**
     * Logs a security event
     */
    async logSecurityEvent(userId, clientId, clientType, operation, targetPath, errorCode, errorMessage, options = {}) {
        const entry = {
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
            duration: 0,
            severity: 'CRITICAL',
            securityEvent: true,
            ...options,
        };
        await this.logEntry(entry);
    }
    /**
     * Logs a performance event
     */
    async logPerformanceEvent(userId, clientId, clientType, operation, duration, fileSize, resultCount, options = {}) {
        const entry = {
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
            severity: 'LOW',
            securityEvent: false,
            ...options,
        };
        // Adjust severity based on performance
        if (duration > 15000 || (fileSize && fileSize > 100 * 1024 * 1024)) {
            entry.severity = 'HIGH';
        }
        else if (duration > 8000 || (fileSize && fileSize > 50 * 1024 * 1024)) {
            entry.severity = 'MEDIUM';
        }
        await this.logEntry(entry);
    }
    /**
     * Retrieves audit logs with filtering
     */
    getLogs(filter = {}) {
        let filteredLogs = [...this.logs];
        // Apply filters
        if (filter.userId) {
            filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
        }
        if (filter.clientId) {
            filteredLogs = filteredLogs.filter(log => log.clientId === filter.clientId);
        }
        if (filter.clientType) {
            filteredLogs = filteredLogs.filter(log => log.clientType === filter.clientType);
        }
        if (filter.operation) {
            filteredLogs = filteredLogs.filter(log => log.operation === filter.operation);
        }
        if (filter.success !== undefined) {
            filteredLogs = filteredLogs.filter(log => log.success === filter.success);
        }
        if (filter.severity) {
            filteredLogs = filteredLogs.filter(log => log.severity === filter.severity);
        }
        if (filter.securityEvent !== undefined) {
            filteredLogs = filteredLogs.filter(log => log.securityEvent === filter.securityEvent);
        }
        if (filter.startDate) {
            filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate);
        }
        if (filter.endDate) {
            filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate);
        }
        // Sort by timestamp (newest first)
        filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        // Apply pagination
        if (filter.offset) {
            filteredLogs = filteredLogs.slice(filter.offset);
        }
        if (filter.limit) {
            filteredLogs = filteredLogs.slice(0, filter.limit);
        }
        return filteredLogs;
    }
    /**
     * Gets audit log statistics
     */
    getStats(filter = {}) {
        const logs = this.getLogs(filter);
        const stats = {
            totalEntries: logs.length,
            successCount: 0,
            failureCount: 0,
            securityEventCount: 0,
            uniqueUsers: 0,
            uniqueClients: 0,
            operationsCount: new Map(),
            severityCount: new Map(),
            averageDuration: 0,
            topUsers: [],
            topClients: [],
            topOperations: [],
        };
        const userCounts = new Map();
        const clientCounts = new Map();
        const operationCounts = new Map();
        const severityCounts = new Map();
        const users = new Set();
        const clients = new Set();
        let totalDuration = 0;
        for (const log of logs) {
            // Count successes and failures
            if (log.success) {
                stats.successCount++;
            }
            else {
                stats.failureCount++;
            }
            // Count security events
            if (log.securityEvent) {
                stats.securityEventCount++;
            }
            // Track unique users and clients
            users.add(log.userId);
            clients.add(log.clientId);
            // Count operations
            const currentOpCount = operationCounts.get(log.operation) || 0;
            operationCounts.set(log.operation, currentOpCount + 1);
            // Count severities
            const currentSevCount = severityCounts.get(log.severity) || 0;
            severityCounts.set(log.severity, currentSevCount + 1);
            // Count users and clients
            const currentUserCount = userCounts.get(log.userId) || 0;
            userCounts.set(log.userId, currentUserCount + 1);
            const currentClientCount = clientCounts.get(log.clientId) || 0;
            clientCounts.set(log.clientId, currentClientCount + 1);
            // Sum durations
            totalDuration += log.duration;
        }
        stats.uniqueUsers = users.size;
        stats.uniqueClients = clients.size;
        stats.operationsCount = operationCounts;
        stats.severityCount = severityCounts;
        stats.averageDuration = logs.length > 0 ? totalDuration / logs.length : 0;
        // Create top lists
        stats.topUsers = Array.from(userCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([userId, count]) => ({ userId, count }));
        stats.topClients = Array.from(clientCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([clientId, count]) => ({ clientId, count }));
        stats.topOperations = Array.from(operationCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([operation, count]) => ({ operation, count }));
        return stats;
    }
    /**
     * Cleans up old logs
     */
    cleanupOldLogs() {
        if (!this.config.security.enableAuditLogging) {
            return;
        }
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.logRetentionDays);
        this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
    }
    /**
     * Exports logs to JSON
     */
    exportLogs(filter = {}) {
        const logs = this.getLogs(filter);
        return JSON.stringify(logs.map(log => log.toJSON()), null, 2);
    }
    /**
     * Updates configuration
     */
    updateConfiguration(config) {
        this.config = config;
        this.logRetentionDays = config.security.auditLogRetentionDays;
    }
    // Private methods
    validateAuditEntry(entry) {
        if (!entry.id || typeof entry.id !== 'string') {
            throw new Error('Entry ID is required');
        }
        if (!entry.userId || typeof entry.userId !== 'string') {
            throw new Error('User ID is required');
        }
        if (!entry.clientId || typeof entry.clientId !== 'string') {
            throw new Error('Client ID is required');
        }
        if (!entry.clientType || typeof entry.clientType !== 'string') {
            throw new Error('Client type is required');
        }
        if (!entry.operation || typeof entry.operation !== 'string') {
            throw new Error('Operation is required');
        }
        if (typeof entry.success !== 'boolean') {
            throw new Error('Success must be a boolean');
        }
        if (typeof entry.duration !== 'number' || entry.duration < 0) {
            throw new Error('Duration must be a non-negative number');
        }
        if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(entry.severity)) {
            throw new Error('Invalid severity level');
        }
        if (typeof entry.securityEvent !== 'boolean') {
            throw new Error('Security event must be a boolean');
        }
    }
    maintainLogSize() {
        if (this.logs.length > this.maxLogs) {
            // Remove oldest logs
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }
    async handleSecurityEvent(log) {
        // Handle security events - could trigger alerts, notifications, etc.
        console.warn(`Security event detected: ${log.operation} by ${log.userId} - ${log.errorCode || 'Unknown'}`);
        // In a real implementation, this could:
        // - Send alerts to administrators
        // - Block suspicious users
        // - Trigger additional monitoring
        // - Log to external security systems
    }
    async persistToFile(log) {
        try {
            // In a real implementation, this would write to a log file
            // For now, we'll simulate it
            const logEntry = JSON.stringify(log.toJSON()) + '\n';
            // Simulate file writing
            console.log(`[AUDIT LOG] ${logEntry.trim()}`);
        }
        catch (error) {
            console.error('Failed to persist audit log to file:', error);
        }
    }
    generateId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    initializeService() {
        // Initialize the service
        this.logRetentionDays = this.config.security.auditLogRetentionDays;
        // Set up periodic cleanup
        setInterval(() => {
            this.cleanupOldLogs();
        }, 24 * 60 * 60 * 1000); // Run daily
    }
    /**
     * Static utility methods
     */
    static createDefaultEntry(userId, clientId, clientType, operation, success, duration) {
        return {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            userId,
            clientId,
            clientType,
            operation,
            success,
            duration,
            severity: success ? 'LOW' : 'HIGH',
            securityEvent: !success,
        };
    }
    static createSecurityEntry(userId, clientId, clientType, operation, targetPath, errorCode, errorMessage) {
        return {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            userId,
            clientId,
            clientType,
            operation,
            targetPath,
            success: false,
            errorCode,
            errorMessage,
            duration: 0,
            severity: 'CRITICAL',
            securityEvent: true,
        };
    }
    static createPerformanceEntry(userId, clientId, clientType, operation, duration, fileSize, resultCount) {
        return {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            userId,
            clientId,
            clientType,
            operation,
            success: true,
            duration,
            fileSize,
            resultCount,
            severity: duration > 10000 ? 'HIGH' : duration > 5000 ? 'MEDIUM' : 'LOW',
            securityEvent: false,
        };
    }
}
exports.AuditLoggingService = AuditLoggingService;
//# sourceMappingURL=AuditLoggingService.js.map