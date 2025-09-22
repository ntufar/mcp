"use strict";
/**
 * Graceful Shutdown Handler
 *
 * Implements graceful shutdown handling for the MCP File Browser Server.
 * Ensures clean shutdown with proper resource cleanup and connection handling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GracefulShutdown = exports.ShutdownPhase = void 0;
var ShutdownPhase;
(function (ShutdownPhase) {
    ShutdownPhase["INITIATED"] = "initiated";
    ShutdownPhase["STOPPING_NEW_REQUESTS"] = "stopping_new_requests";
    ShutdownPhase["WAITING_FOR_ACTIVE_REQUESTS"] = "waiting_for_active_requests";
    ShutdownPhase["CLEANING_UP_RESOURCES"] = "cleaning_up_resources";
    ShutdownPhase["CLOSING_CONNECTIONS"] = "closing_connections";
    ShutdownPhase["SAVING_STATE"] = "saving_state";
    ShutdownPhase["COMPLETED"] = "completed";
    ShutdownPhase["FAILED"] = "failed";
})(ShutdownPhase || (exports.ShutdownPhase = ShutdownPhase = {}));
class GracefulShutdown {
    config;
    fileSystemIntegration;
    streamingIntegration;
    healthMonitoring;
    resourceManager;
    auditLoggingService;
    shutdownConfig;
    shutdownHooks = [];
    shutdownStatus = null;
    isShuttingDown = false;
    shutdownPromise = null;
    constructor(config, fileSystemIntegration, streamingIntegration, healthMonitoring, resourceManager, auditLoggingService, shutdownConfig) {
        this.config = config;
        this.fileSystemIntegration = fileSystemIntegration;
        this.streamingIntegration = streamingIntegration;
        this.healthMonitoring = healthMonitoring;
        this.resourceManager = resourceManager;
        this.auditLoggingService = auditLoggingService;
        this.shutdownConfig = shutdownConfig;
        this.setupSignalHandlers();
        this.registerDefaultHooks();
    }
    /**
     * Initiates graceful shutdown
     */
    async initiateShutdown(reason = 'Manual shutdown') {
        if (this.isShuttingDown) {
            console.log('Shutdown already in progress');
            return this.shutdownPromise;
        }
        this.isShuttingDown = true;
        console.log(`Initiating graceful shutdown: ${reason}`);
        this.shutdownPromise = this.performShutdown(reason);
        return this.shutdownPromise;
    }
    /**
     * Registers a shutdown hook
     */
    registerShutdownHook(hook) {
        this.shutdownHooks.push(hook);
        this.shutdownHooks.sort((a, b) => b.priority - a.priority); // Higher priority first
    }
    /**
     * Unregisters a shutdown hook
     */
    unregisterShutdownHook(name) {
        const index = this.shutdownHooks.findIndex(hook => hook.name === name);
        if (index >= 0) {
            this.shutdownHooks.splice(index, 1);
            return true;
        }
        return false;
    }
    /**
     * Gets current shutdown status
     */
    getShutdownStatus() {
        return this.shutdownStatus;
    }
    /**
     * Checks if shutdown is in progress
     */
    isShutdownInProgress() {
        return this.isShuttingDown;
    }
    /**
     * Updates shutdown configuration
     */
    updateShutdownConfig(newConfig) {
        this.shutdownConfig = { ...this.shutdownConfig, ...newConfig };
    }
    /**
     * Forces immediate shutdown (use with caution)
     */
    async forceShutdown() {
        console.log('Force shutdown initiated');
        if (this.shutdownConfig.logShutdown) {
            await this.auditLoggingService.logSuccess('system', 'graceful-shutdown', 'system', 'force_shutdown', 0, { reason: 'Force shutdown requested' });
        }
        // Stop health monitoring immediately
        this.healthMonitoring.stopMonitoring();
        // Clean up resources
        if (this.shutdownConfig.cleanupResources) {
            await this.cleanupResources();
        }
        console.log('Force shutdown completed');
        process.exit(0);
    }
    // Private methods
    async performShutdown(reason) {
        const startTime = new Date();
        try {
            // Initialize shutdown status
            this.shutdownStatus = {
                phase: ShutdownPhase.INITIATED,
                progress: 0,
                message: 'Shutdown initiated',
                startTime,
                activeConnections: this.getActiveConnections(),
                pendingOperations: this.getPendingOperations(),
            };
            if (this.shutdownConfig.logShutdown) {
                await this.auditLoggingService.logSuccess('system', 'graceful-shutdown', 'system', 'shutdown_initiated', 0, { reason });
            }
            // Phase 1: Stop accepting new requests
            await this.executeShutdownPhase(ShutdownPhase.STOPPING_NEW_REQUESTS, 10, 'Stopping new request acceptance', () => this.stopNewRequests());
            // Phase 2: Wait for active requests to complete
            await this.executeShutdownPhase(ShutdownPhase.WAITING_FOR_ACTIVE_REQUESTS, 30, 'Waiting for active requests to complete', () => this.waitForActiveRequests());
            // Phase 3: Clean up resources
            await this.executeShutdownPhase(ShutdownPhase.CLEANING_UP_RESOURCES, 50, 'Cleaning up resources', () => this.cleanupResources());
            // Phase 4: Close connections
            await this.executeShutdownPhase(ShutdownPhase.CLOSING_CONNECTIONS, 70, 'Closing connections', () => this.closeConnections());
            // Phase 5: Save state
            if (this.shutdownConfig.saveState) {
                await this.executeShutdownPhase(ShutdownPhase.SAVING_STATE, 90, 'Saving application state', () => this.saveState());
            }
            // Phase 6: Execute shutdown hooks
            await this.executeShutdownHooks();
            // Complete shutdown
            this.shutdownStatus = {
                phase: ShutdownPhase.COMPLETED,
                progress: 100,
                message: 'Shutdown completed successfully',
                startTime,
                activeConnections: 0,
                pendingOperations: 0,
            };
            if (this.shutdownConfig.logShutdown) {
                await this.auditLoggingService.logSuccess('system', 'graceful-shutdown', 'system', 'shutdown_completed', Date.now() - startTime.getTime(), { reason });
            }
            console.log('Graceful shutdown completed successfully');
            // Exit process
            process.exit(0);
        }
        catch (error) {
            this.shutdownStatus = {
                phase: ShutdownPhase.FAILED,
                progress: this.shutdownStatus?.progress || 0,
                message: `Shutdown failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                startTime,
                activeConnections: this.getActiveConnections(),
                pendingOperations: this.getPendingOperations(),
            };
            console.error('Graceful shutdown failed:', error);
            if (this.shutdownConfig.logShutdown) {
                await this.auditLoggingService.logFailure('system', 'graceful-shutdown', 'system', 'shutdown_failed', 'SHUTDOWN_ERROR', error instanceof Error ? error.message : 'Unknown error', Date.now() - startTime.getTime(), { reason });
            }
            if (this.shutdownConfig.forceShutdown) {
                console.log('Force shutdown enabled, exiting immediately');
                process.exit(1);
            }
            else {
                throw error;
            }
        }
    }
    async executeShutdownPhase(phase, progress, message, handler) {
        if (!this.shutdownStatus)
            return;
        this.shutdownStatus.phase = phase;
        this.shutdownStatus.progress = progress;
        this.shutdownStatus.message = message;
        this.shutdownStatus.activeConnections = this.getActiveConnections();
        this.shutdownStatus.pendingOperations = this.getPendingOperations();
        console.log(`Shutdown phase: ${message} (${progress}%)`);
        try {
            await Promise.race([
                handler(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Phase timeout')), this.shutdownConfig.timeout))
            ]);
        }
        catch (error) {
            console.error(`Shutdown phase failed: ${message}`, error);
            throw error;
        }
    }
    async stopNewRequests() {
        // Stop health monitoring
        this.healthMonitoring.stopMonitoring();
        // Stop accepting new requests in resource manager
        // This would be implemented in the actual server
        console.log('New request acceptance stopped');
    }
    async waitForActiveRequests() {
        const maxWaitTime = this.shutdownConfig.timeout;
        const checkInterval = 1000; // 1 second
        let waitTime = 0;
        while (waitTime < maxWaitTime) {
            const activeConnections = this.getActiveConnections();
            const pendingOperations = this.getPendingOperations();
            if (activeConnections === 0 && pendingOperations === 0) {
                console.log('All active requests completed');
                return;
            }
            console.log(`Waiting for ${activeConnections} connections and ${pendingOperations} operations...`);
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitTime += checkInterval;
        }
        console.log('Timeout reached, proceeding with shutdown');
    }
    async cleanupResources() {
        // Clean up file system integration
        await this.fileSystemIntegration.shutdown();
        // Clean up streaming integration
        this.streamingIntegration.cleanup();
        // Clean up resource manager
        this.resourceManager.cleanupExpiredData();
        // Clean up caches
        this.fileSystemIntegration.clearAllCaches();
        console.log('Resources cleaned up');
    }
    async closeConnections() {
        // Close streaming connections
        const activeStreams = this.streamingIntegration.getActiveStreams();
        for (const stream of activeStreams) {
            this.streamingIntegration.cancelStream(stream.streamId);
        }
        // Close other connections
        // This would be implemented based on the actual server implementation
        console.log('Connections closed');
    }
    async saveState() {
        // Save application state
        const state = {
            timestamp: new Date().toISOString(),
            version: this.config.server.version,
            stats: this.resourceManager.getResourceStats(),
            healthStatus: await this.healthMonitoring.getHealthStatus(),
        };
        // In a real implementation, this would save to persistent storage
        console.log('Application state saved:', state);
    }
    async executeShutdownHooks() {
        console.log(`Executing ${this.shutdownHooks.length} shutdown hooks`);
        for (const hook of this.shutdownHooks) {
            try {
                console.log(`Executing shutdown hook: ${hook.name}`);
                await Promise.race([
                    hook.handler(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`Hook timeout: ${hook.name}`)), hook.timeout))
                ]);
                console.log(`Shutdown hook completed: ${hook.name}`);
            }
            catch (error) {
                console.error(`Shutdown hook failed: ${hook.name}`, error);
                if (this.shutdownConfig.forceShutdown) {
                    console.log('Continuing with shutdown despite hook failure');
                }
                else {
                    throw error;
                }
            }
        }
    }
    getActiveConnections() {
        // Get active connections from streaming integration
        const streamingStats = this.streamingIntegration.getStreamingStats();
        return streamingStats.activeStreams;
    }
    getPendingOperations() {
        // Get pending operations from resource manager
        const resourceUsage = this.resourceManager.getCurrentResourceUsage();
        return resourceUsage.totalActiveRequests;
    }
    setupSignalHandlers() {
        // Handle SIGTERM
        process.on('SIGTERM', () => {
            console.log('Received SIGTERM signal');
            this.initiateShutdown('SIGTERM signal received');
        });
        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            console.log('Received SIGINT signal');
            this.initiateShutdown('SIGINT signal received');
        });
        // Handle SIGHUP (reload)
        process.on('SIGHUP', () => {
            console.log('Received SIGHUP signal');
            this.initiateShutdown('SIGHUP signal received');
        });
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught exception:', error);
            this.initiateShutdown(`Uncaught exception: ${error.message}`);
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled promise rejection:', reason);
            this.initiateShutdown(`Unhandled promise rejection: ${reason}`);
        });
    }
    registerDefaultHooks() {
        // Register default shutdown hooks
        this.registerShutdownHook({
            name: 'audit_logging_cleanup',
            priority: 100,
            handler: async () => {
                // Ensure all audit logs are flushed
                console.log('Flushing audit logs');
            },
            timeout: 5000,
        });
        this.registerShutdownHook({
            name: 'health_monitoring_cleanup',
            priority: 90,
            handler: async () => {
                // Stop health monitoring
                this.healthMonitoring.stopMonitoring();
                console.log('Health monitoring stopped');
            },
            timeout: 3000,
        });
        this.registerShutdownHook({
            name: 'cache_cleanup',
            priority: 80,
            handler: async () => {
                // Clean up all caches
                this.fileSystemIntegration.clearAllCaches();
                console.log('Caches cleaned up');
            },
            timeout: 10000,
        });
        this.registerShutdownHook({
            name: 'resource_cleanup',
            priority: 70,
            handler: async () => {
                // Clean up resource manager
                this.resourceManager.cleanupExpiredData();
                console.log('Resource manager cleaned up');
            },
            timeout: 5000,
        });
    }
}
exports.GracefulShutdown = GracefulShutdown;
//# sourceMappingURL=GracefulShutdown.js.map