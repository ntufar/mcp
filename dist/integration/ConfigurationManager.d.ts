/**
 * Configuration Manager
 *
 * Manages configuration for the MCP File Browser Server.
 * Provides dynamic configuration updates, validation, and persistence.
 */
import { Configuration } from '../models/Configuration';
export interface ConfigurationSource {
    type: 'file' | 'environment' | 'database' | 'api';
    path?: string;
    format?: 'json' | 'yaml' | 'env';
    priority: number;
    enabled: boolean;
}
export interface ConfigurationValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    validatedAt: Date;
}
export interface ConfigurationHistory {
    version: string;
    timestamp: Date;
    changes: ConfigurationChange[];
    appliedBy: string;
    appliedAt: Date;
}
export interface ConfigurationChange {
    path: string;
    oldValue: any;
    newValue: any;
    type: 'added' | 'modified' | 'removed';
}
export interface ConfigurationManagerOptions {
    sources: ConfigurationSource[];
    autoReload: boolean;
    validationEnabled: boolean;
    historyEnabled: boolean;
    maxHistorySize: number;
    backupEnabled: boolean;
    watchInterval: number;
}
export declare class ConfigurationManager {
    private config;
    private sources;
    private options;
    private validationHistory;
    private configurationHistory;
    private watchers;
    private listeners;
    constructor(initialConfig: Configuration, options: ConfigurationManagerOptions);
    /**
     * Gets current configuration
     */
    getConfiguration(): Configuration;
    /**
     * Updates configuration with validation and history
     */
    updateConfiguration(newConfig: Partial<Configuration>, appliedBy?: string): Promise<ConfigurationValidation>;
    /**
     * Validates configuration
     */
    validateConfiguration(config: Configuration): Promise<ConfigurationValidation>;
    /**
     * Loads configuration from all sources
     */
    loadConfigurationFromSources(): Promise<void>;
    /**
     * Saves configuration to persistent sources
     */
    saveConfigurationToSources(): Promise<void>;
    /**
     * Adds a configuration change listener
     */
    addListener(event: string, listener: (config: Configuration) => void): void;
    /**
     * Removes a configuration change listener
     */
    removeListener(event: string, listener: (config: Configuration) => void): void;
    /**
     * Gets configuration history
     */
    getConfigurationHistory(limit?: number): ConfigurationHistory[];
    /**
     * Gets validation history
     */
    getValidationHistory(limit?: number): ConfigurationValidation[];
    /**
     * Reverts configuration to a previous version
     */
    revertToVersion(version: string, appliedBy?: string): Promise<ConfigurationValidation>;
    /**
     * Creates a configuration backup
     */
    createBackup(): Promise<string>;
    /**
     * Restores configuration from backup
     */
    restoreFromBackup(backupPath: string, appliedBy?: string): Promise<ConfigurationValidation>;
    /**
     * Updates configuration manager options
     */
    updateOptions(newOptions: Partial<ConfigurationManagerOptions>): void;
    private loadFromFile;
    private saveToFile;
    private loadFromEnvironment;
    private parseEnvFile;
    private setConfigValue;
    private mergeConfigurations;
    private detectChanges;
    private compareObjects;
    private generateVersion;
    private notifyListeners;
    private initializeWatchers;
}
//# sourceMappingURL=ConfigurationManager.d.ts.map