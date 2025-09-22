/**
 * Health Monitoring
 *
 * Comprehensive health checks and monitoring for the MCP File Browser Server.
 * Provides real-time health status, metrics, and alerting capabilities.
 */
import { Configuration } from '../models/Configuration';
import { FileSystemIntegration } from './FileSystemIntegration';
import { StreamingIntegration } from './StreamingIntegration';
import { AuditLoggingService } from '../services/AuditLoggingService';
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    version: string;
    uptime: number;
    checks: HealthCheck[];
    metrics: HealthMetrics;
    alerts: HealthAlert[];
}
export interface HealthCheck {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    duration: number;
    timestamp: Date;
    details?: any;
}
export interface HealthMetrics {
    system: SystemMetrics;
    application: ApplicationMetrics;
    performance: PerformanceMetrics;
    security: SecurityMetrics;
}
export interface SystemMetrics {
    memoryUsage: {
        used: number;
        total: number;
        percentage: number;
    };
    cpuUsage: number;
    diskUsage: {
        used: number;
        total: number;
        percentage: number;
    };
    loadAverage: number[];
}
export interface ApplicationMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    activeConnections: number;
    cacheHitRate: number;
    errorRate: number;
}
export interface PerformanceMetrics {
    throughput: number;
    latency: {
        p50: number;
        p95: number;
        p99: number;
    };
    queueSize: number;
    processingTime: number;
}
export interface SecurityMetrics {
    totalSecurityEvents: number;
    blockedRequests: number;
    permissionDenied: number;
    suspiciousActivity: number;
    auditLogSize: number;
}
export interface HealthAlert {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;
    details?: any;
}
export interface MonitoringConfig {
    checkInterval: number;
    alertThresholds: {
        memoryUsage: number;
        cpuUsage: number;
        diskUsage: number;
        errorRate: number;
        responseTime: number;
    };
    retentionPeriod: number;
    enableAlerts: boolean;
    alertChannels: string[];
}
export declare class HealthMonitoring {
    private config;
    private fileSystemIntegration;
    private streamingIntegration;
    private auditLoggingService;
    private monitoringConfig;
    private healthHistory;
    private alerts;
    private startTime;
    private checkInterval;
    constructor(config: Configuration, fileSystemIntegration: FileSystemIntegration, streamingIntegration: StreamingIntegration, auditLoggingService: AuditLoggingService, monitoringConfig: MonitoringConfig);
    /**
     * Gets current health status
     */
    getHealthStatus(): Promise<HealthStatus>;
    /**
     * Runs all health checks
     */
    runHealthChecks(): Promise<HealthCheck[]>;
    /**
     * Collects comprehensive metrics
     */
    collectMetrics(): Promise<HealthMetrics>;
    /**
     * Gets active alerts
     */
    getActiveAlerts(): HealthAlert[];
    /**
     * Creates a new alert
     */
    createAlert(severity: 'low' | 'medium' | 'high' | 'critical', message: string, details?: any): HealthAlert;
    /**
     * Resolves an alert
     */
    resolveAlert(alertId: string): boolean;
    /**
     * Gets health history
     */
    getHealthHistory(limit?: number): HealthStatus[];
    /**
     * Gets monitoring statistics
     */
    getMonitoringStats(): {
        totalChecks: number;
        successfulChecks: number;
        failedChecks: number;
        averageCheckTime: number;
        totalAlerts: number;
        activeAlerts: number;
        resolvedAlerts: number;
    };
    /**
     * Updates monitoring configuration
     */
    updateMonitoringConfig(newConfig: Partial<MonitoringConfig>): void;
    /**
     * Stops monitoring
     */
    stopMonitoring(): void;
    /**
     * Starts monitoring
     */
    startMonitoring(): void;
    private checkSystemHealth;
    private checkMemoryUsage;
    private checkDiskSpace;
    private checkCPUUsage;
    private checkApplicationHealth;
    private checkDatabaseConnection;
    private checkCacheHealth;
    private checkFileSystemAccess;
    private checkSecurityStatus;
    private checkAuditLogging;
    private checkPerformanceMetrics;
    private checkStreamingHealth;
    private collectSystemMetrics;
    private collectApplicationMetrics;
    private collectPerformanceMetrics;
    private collectSecurityMetrics;
    private determineOverallStatus;
    private evaluateAlerts;
    private generateAlertId;
    private sendAlert;
}
//# sourceMappingURL=HealthMonitoring.d.ts.map