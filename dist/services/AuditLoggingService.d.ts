/**
 * Audit Logging Service
 *
 * Implements comprehensive audit logging with security monitoring.
 * Tracks all file system operations for security and compliance.
 */
import { AccessLog } from '../models/AccessLog';
import { Configuration } from '../models/Configuration';
export interface AuditLogEntry {
    id: string;
    timestamp: Date;
    userId: string;
    clientId: string;
    clientType: string;
    sessionId?: string;
    operation: string;
    targetPath?: string;
    searchQuery?: string;
    searchPath?: string;
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    duration: number;
    fileSize?: number;
    contentHash?: string;
    resultCount?: number;
    ipAddress?: string;
    userAgent?: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    securityEvent: boolean;
    details?: Record<string, any>;
}
export interface AuditLogFilter {
    userId?: string;
    clientId?: string;
    clientType?: string;
    operation?: string;
    success?: boolean;
    severity?: string;
    securityEvent?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}
export interface AuditLogStats {
    totalEntries: number;
    successCount: number;
    failureCount: number;
    securityEventCount: number;
    uniqueUsers: number;
    uniqueClients: number;
    operationsCount: Map<string, number>;
    severityCount: Map<string, number>;
    averageDuration: number;
    topUsers: Array<{
        userId: string;
        count: number;
    }>;
    topClients: Array<{
        clientId: string;
        count: number;
    }>;
    topOperations: Array<{
        operation: string;
        count: number;
    }>;
}
export declare class AuditLoggingService {
    private config;
    private logs;
    private maxLogs;
    private logRetentionDays;
    constructor(config: Configuration);
    /**
     * Logs an audit entry
     */
    logEntry(entry: AuditLogEntry): Promise<void>;
    /**
     * Logs a successful operation
     */
    logSuccess(userId: string, clientId: string, clientType: string, operation: string, duration: number, options?: Partial<AuditLogEntry>): Promise<void>;
    /**
     * Logs a failed operation
     */
    logFailure(userId: string, clientId: string, clientType: string, operation: string, errorCode: string, errorMessage: string, duration: number, options?: Partial<AuditLogEntry>): Promise<void>;
    /**
     * Logs a security event
     */
    logSecurityEvent(userId: string, clientId: string, clientType: string, operation: string, targetPath: string, errorCode: string, errorMessage: string, options?: Partial<AuditLogEntry>): Promise<void>;
    /**
     * Logs a performance event
     */
    logPerformanceEvent(userId: string, clientId: string, clientType: string, operation: string, duration: number, fileSize?: number, resultCount?: number, options?: Partial<AuditLogEntry>): Promise<void>;
    /**
     * Retrieves audit logs with filtering
     */
    getLogs(filter?: AuditLogFilter): AccessLog[];
    /**
     * Gets audit log statistics
     */
    getStats(filter?: AuditLogFilter): AuditLogStats;
    /**
     * Cleans up old logs
     */
    cleanupOldLogs(): void;
    /**
     * Exports logs to JSON
     */
    exportLogs(filter?: AuditLogFilter): string;
    /**
     * Updates configuration
     */
    updateConfiguration(config: Configuration): void;
    private validateAuditEntry;
    private maintainLogSize;
    private handleSecurityEvent;
    private persistToFile;
    private generateId;
    private initializeService;
    /**
     * Static utility methods
     */
    static createDefaultEntry(userId: string, clientId: string, clientType: string, operation: string, success: boolean, duration: number): AuditLogEntry;
    static createSecurityEntry(userId: string, clientId: string, clientType: string, operation: string, targetPath: string, errorCode: string, errorMessage: string): AuditLogEntry;
    static createPerformanceEntry(userId: string, clientId: string, clientType: string, operation: string, duration: number, fileSize?: number, resultCount?: number): AuditLogEntry;
}
//# sourceMappingURL=AuditLoggingService.d.ts.map