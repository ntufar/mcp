/**
 * Graceful Shutdown Handler
 *
 * Implements graceful shutdown handling for the MCP File Browser Server.
 * Ensures clean shutdown with proper resource cleanup and connection handling.
 */
import { Configuration } from '../models/Configuration';
import { FileSystemIntegration } from './FileSystemIntegration';
import { StreamingIntegration } from './StreamingIntegration';
import { HealthMonitoring } from './HealthMonitoring';
import { ResourceManager } from './ResourceManager';
import { AuditLoggingService } from '../services/AuditLoggingService';
export interface ShutdownConfig {
    timeout: number;
    forceShutdown: boolean;
    saveState: boolean;
    notifyClients: boolean;
    cleanupResources: boolean;
    logShutdown: boolean;
}
export interface ShutdownStatus {
    phase: ShutdownPhase;
    progress: number;
    message: string;
    startTime: Date;
    estimatedCompletion?: Date;
    activeConnections: number;
    pendingOperations: number;
}
export declare enum ShutdownPhase {
    INITIATED = "initiated",
    STOPPING_NEW_REQUESTS = "stopping_new_requests",
    WAITING_FOR_ACTIVE_REQUESTS = "waiting_for_active_requests",
    CLEANING_UP_RESOURCES = "cleaning_up_resources",
    CLOSING_CONNECTIONS = "closing_connections",
    SAVING_STATE = "saving_state",
    COMPLETED = "completed",
    FAILED = "failed"
}
export interface ShutdownHook {
    name: string;
    priority: number;
    handler: () => Promise<void>;
    timeout: number;
}
export declare class GracefulShutdown {
    private config;
    private fileSystemIntegration;
    private streamingIntegration;
    private healthMonitoring;
    private resourceManager;
    private auditLoggingService;
    private shutdownConfig;
    private shutdownHooks;
    private shutdownStatus;
    private isShuttingDown;
    private shutdownPromise;
    constructor(config: Configuration, fileSystemIntegration: FileSystemIntegration, streamingIntegration: StreamingIntegration, healthMonitoring: HealthMonitoring, resourceManager: ResourceManager, auditLoggingService: AuditLoggingService, shutdownConfig: ShutdownConfig);
    /**
     * Initiates graceful shutdown
     */
    initiateShutdown(reason?: string): Promise<void>;
    /**
     * Registers a shutdown hook
     */
    registerShutdownHook(hook: ShutdownHook): void;
    /**
     * Unregisters a shutdown hook
     */
    unregisterShutdownHook(name: string): boolean;
    /**
     * Gets current shutdown status
     */
    getShutdownStatus(): ShutdownStatus | null;
    /**
     * Checks if shutdown is in progress
     */
    isShutdownInProgress(): boolean;
    /**
     * Updates shutdown configuration
     */
    updateShutdownConfig(newConfig: Partial<ShutdownConfig>): void;
    /**
     * Forces immediate shutdown (use with caution)
     */
    forceShutdown(): Promise<void>;
    private performShutdown;
    private executeShutdownPhase;
    private stopNewRequests;
    private waitForActiveRequests;
    private cleanupResources;
    private closeConnections;
    private saveState;
    private executeShutdownHooks;
    private getActiveConnections;
    private getPendingOperations;
    private setupSignalHandlers;
    private registerDefaultHooks;
}
//# sourceMappingURL=GracefulShutdown.d.ts.map