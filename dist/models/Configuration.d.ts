/**
 * Configuration Entity
 *
 * Represents server configuration with security validation.
 * Implements security-first design with strict configuration management.
 */
export interface ConfigurationData {
    server: {
        name: string;
        version: string;
        port: number;
        host: string;
        maxConnections: number;
        requestTimeout: number;
    };
    security: {
        allowedPaths: string[];
        deniedPaths: string[];
        maxFileSize: string;
        maxDirectoryDepth: number;
        allowSymbolicLinks: boolean;
        enableAuditLogging: boolean;
        auditLogRetentionDays: number;
    };
    performance: {
        cacheSize: string;
        cacheTTL: number;
        maxConcurrentOperations: number;
        enableStreaming: boolean;
        streamingChunkSize: number;
        memoryLimit: string;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        enableConsole: boolean;
        enableFile: boolean;
        logFilePath: string;
        maxLogFileSize: string;
        maxLogFiles: number;
    };
}
export declare class Configuration {
    private _data;
    constructor(data: ConfigurationData);
    get server(): ConfigurationData['server'];
    get security(): ConfigurationData['security'];
    get performance(): ConfigurationData['performance'];
    get logging(): ConfigurationData['logging'];
    updateServerName(name: string): void;
    updateServerVersion(version: string): void;
    updatePort(port: number): void;
    updateHost(host: string): void;
    updateMaxConnections(maxConnections: number): void;
    updateRequestTimeout(requestTimeout: number): void;
    addAllowedPath(path: string): void;
    removeAllowedPath(path: string): void;
    addDeniedPath(path: string): void;
    removeDeniedPath(path: string): void;
    updateMaxFileSize(maxFileSize: string): void;
    updateMaxDirectoryDepth(maxDirectoryDepth: number): void;
    updateAllowSymbolicLinks(allowSymbolicLinks: boolean): void;
    updateEnableAuditLogging(enableAuditLogging: boolean): void;
    updateAuditLogRetentionDays(auditLogRetentionDays: number): void;
    updateCacheSize(cacheSize: string): void;
    updateCacheTTL(cacheTTL: number): void;
    updateMaxConcurrentOperations(maxConcurrentOperations: number): void;
    updateEnableStreaming(enableStreaming: boolean): void;
    updateStreamingChunkSize(streamingChunkSize: number): void;
    updateMemoryLimit(memoryLimit: string): void;
    updateLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void;
    updateEnableConsole(enableConsole: boolean): void;
    updateEnableFile(enableFile: boolean): void;
    updateLogFilePath(logFilePath: string): void;
    updateMaxLogFileSize(maxLogFileSize: string): void;
    updateMaxLogFiles(maxLogFiles: number): void;
    isPathAllowed(path: string): boolean;
    isPathDenied(path: string): boolean;
    getMaxFileSizeBytes(): number;
    getCacheSizeBytes(): number;
    getMemoryLimitBytes(): number;
    getMaxLogFileSizeBytes(): number;
    toJSON(): ConfigurationData;
    static fromJSON(data: ConfigurationData): Configuration;
    private validateInput;
    private validateServerConfig;
    private validateSecurityConfig;
    private validatePerformanceConfig;
    private validateLoggingConfig;
    private validateServerName;
    private validateVersion;
    private validatePort;
    private validateHost;
    private validateMaxConnections;
    private validateRequestTimeout;
    private validatePath;
    private validateFileSize;
    private validateMaxDirectoryDepth;
    private validateAuditLogRetentionDays;
    private validateCacheSize;
    private validateCacheTTL;
    private validateMaxConcurrentOperations;
    private validateStreamingChunkSize;
    private validateMemoryLimit;
    private validateLogFilePath;
    private validateMaxLogFiles;
    private parseSizeString;
    private deepClone;
    static createDefault(): Configuration;
    static createSecure(): Configuration;
}
//# sourceMappingURL=Configuration.d.ts.map