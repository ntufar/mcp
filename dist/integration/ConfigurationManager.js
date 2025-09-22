"use strict";
/**
 * Configuration Manager
 *
 * Manages configuration for the MCP File Browser Server.
 * Provides dynamic configuration updates, validation, and persistence.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationManager = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class ConfigurationManager {
    config;
    sources;
    options;
    validationHistory = [];
    configurationHistory = [];
    watchers = new Map();
    listeners = new Map();
    constructor(initialConfig, options) {
        this.config = initialConfig;
        this.sources = options.sources;
        this.options = options;
        this.initializeWatchers();
        this.loadConfigurationFromSources();
    }
    /**
     * Gets current configuration
     */
    getConfiguration() {
        return this.config;
    }
    /**
     * Updates configuration with validation and history
     */
    async updateConfiguration(newConfig, appliedBy = 'system') {
        try {
            // Create a copy of current config
            const currentConfig = { ...this.config };
            // Apply changes
            const updatedConfig = { ...currentConfig, ...newConfig };
            // Validate new configuration
            const validation = await this.validateConfiguration(updatedConfig);
            if (validation.isValid) {
                // Store change history
                const changes = this.detectChanges(currentConfig, updatedConfig);
                if (changes.length > 0) {
                    const historyEntry = {
                        version: this.generateVersion(),
                        timestamp: new Date(),
                        changes,
                        appliedBy,
                        appliedAt: new Date(),
                    };
                    this.configurationHistory.push(historyEntry);
                    // Limit history size
                    if (this.configurationHistory.length > this.options.maxHistorySize) {
                        this.configurationHistory = this.configurationHistory.slice(-this.options.maxHistorySize);
                    }
                }
                // Apply configuration
                this.config = updatedConfig;
                // Notify listeners
                this.notifyListeners('configuration_updated', this.config);
                // Save to persistent sources
                await this.saveConfigurationToSources();
                // Create backup if enabled
                if (this.options.backupEnabled) {
                    await this.createBackup();
                }
            }
            return validation;
        }
        catch (error) {
            const validation = {
                isValid: false,
                errors: [`Configuration update failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                warnings: [],
                validatedAt: new Date(),
            };
            this.validationHistory.push(validation);
            return validation;
        }
    }
    /**
     * Validates configuration
     */
    async validateConfiguration(config) {
        const errors = [];
        const warnings = [];
        try {
            // Validate server configuration
            if (!config.server.name || typeof config.server.name !== 'string') {
                errors.push('Server name is required and must be a string');
            }
            if (!config.server.version || typeof config.server.version !== 'string') {
                errors.push('Server version is required and must be a string');
            }
            if (config.server.port && (typeof config.server.port !== 'number' || config.server.port < 1 || config.server.port > 65535)) {
                errors.push('Server port must be a number between 1 and 65535');
            }
            // Validate security configuration
            if (!Array.isArray(config.security.allowedPaths)) {
                errors.push('Allowed paths must be an array');
            }
            if (!Array.isArray(config.security.deniedPaths)) {
                errors.push('Denied paths must be an array');
            }
            if (config.security.maxFileSize && (typeof config.security.maxFileSize !== 'number' || config.security.maxFileSize <= 0)) {
                errors.push('Max file size must be a positive number');
            }
            if (config.security.maxDirectoryDepth && (typeof config.security.maxDirectoryDepth !== 'number' || config.security.maxDirectoryDepth <= 0)) {
                errors.push('Max directory depth must be a positive number');
            }
            // Validate performance configuration
            if (config.performance.maxConcurrentOperations && (typeof config.performance.maxConcurrentOperations !== 'number' || config.performance.maxConcurrentOperations <= 0)) {
                errors.push('Max concurrent operations must be a positive number');
            }
            if (config.performance.requestTimeout && (typeof config.performance.requestTimeout !== 'number' || config.performance.requestTimeout <= 0)) {
                errors.push('Request timeout must be a positive number');
            }
            // Validate cache configuration
            if (config.cache.enabled && typeof config.cache.enabled !== 'boolean') {
                errors.push('Cache enabled must be a boolean');
            }
            if (config.cache.ttl && (typeof config.cache.ttl !== 'number' || config.cache.ttl <= 0)) {
                errors.push('Cache TTL must be a positive number');
            }
            // Validate logging configuration
            if (config.logging.enabled && typeof config.logging.enabled !== 'boolean') {
                errors.push('Logging enabled must be a boolean');
            }
            if (config.logging.level && !['debug', 'info', 'warn', 'error'].includes(config.logging.level)) {
                errors.push('Logging level must be one of: debug, info, warn, error');
            }
            // Add warnings for potentially problematic configurations
            if (config.security.allowedPaths.length === 0) {
                warnings.push('No allowed paths configured - this may restrict all access');
            }
            if (config.security.maxFileSize && config.security.maxFileSize > 100 * 1024 * 1024) { // 100MB
                warnings.push('Max file size is very large - consider security implications');
            }
            if (config.performance.maxConcurrentOperations && config.performance.maxConcurrentOperations > 1000) {
                warnings.push('Max concurrent operations is very high - monitor resource usage');
            }
            const validation = {
                isValid: errors.length === 0,
                errors,
                warnings,
                validatedAt: new Date(),
            };
            this.validationHistory.push(validation);
            return validation;
        }
        catch (error) {
            const validation = {
                isValid: false,
                errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                warnings: [],
                validatedAt: new Date(),
            };
            this.validationHistory.push(validation);
            return validation;
        }
    }
    /**
     * Loads configuration from all sources
     */
    async loadConfigurationFromSources() {
        for (const source of this.sources) {
            if (!source.enabled)
                continue;
            try {
                let sourceConfig = {};
                switch (source.type) {
                    case 'file':
                        sourceConfig = await this.loadFromFile(source.path, source.format);
                        break;
                    case 'environment':
                        sourceConfig = this.loadFromEnvironment();
                        break;
                    case 'database':
                        // Database loading would be implemented here
                        break;
                    case 'api':
                        // API loading would be implemented here
                        break;
                }
                // Merge configuration based on priority
                this.config = this.mergeConfigurations(this.config, sourceConfig);
            }
            catch (error) {
                console.error(`Failed to load configuration from source ${source.type}:`, error);
            }
        }
    }
    /**
     * Saves configuration to persistent sources
     */
    async saveConfigurationToSources() {
        for (const source of this.sources) {
            if (!source.enabled || source.type === 'environment')
                continue;
            try {
                switch (source.type) {
                    case 'file':
                        await this.saveToFile(source.path, source.format);
                        break;
                    case 'database':
                        // Database saving would be implemented here
                        break;
                    case 'api':
                        // API saving would be implemented here
                        break;
                }
            }
            catch (error) {
                console.error(`Failed to save configuration to source ${source.type}:`, error);
            }
        }
    }
    /**
     * Adds a configuration change listener
     */
    addListener(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(listener);
    }
    /**
     * Removes a configuration change listener
     */
    removeListener(event, listener) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            const index = eventListeners.indexOf(listener);
            if (index >= 0) {
                eventListeners.splice(index, 1);
            }
        }
    }
    /**
     * Gets configuration history
     */
    getConfigurationHistory(limit = 50) {
        return this.configurationHistory
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }
    /**
     * Gets validation history
     */
    getValidationHistory(limit = 50) {
        return this.validationHistory
            .sort((a, b) => b.validatedAt.getTime() - a.validatedAt.getTime())
            .slice(0, limit);
    }
    /**
     * Reverts configuration to a previous version
     */
    async revertToVersion(version, appliedBy = 'system') {
        const historyEntry = this.configurationHistory.find(h => h.version === version);
        if (!historyEntry) {
            throw new Error(`Configuration version ${version} not found`);
        }
        // Revert changes
        const revertedConfig = { ...this.config };
        for (const change of historyEntry.changes.reverse()) {
            switch (change.type) {
                case 'added':
                    delete revertedConfig[change.path];
                    break;
                case 'modified':
                    revertedConfig[change.path] = change.oldValue;
                    break;
                case 'removed':
                    revertedConfig[change.path] = change.oldValue;
                    break;
            }
        }
        return this.updateConfiguration(revertedConfig, appliedBy);
    }
    /**
     * Creates a configuration backup
     */
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(process.cwd(), 'backups', `config-${timestamp}.json`);
        try {
            await fs.mkdir(path.dirname(backupPath), { recursive: true });
            await fs.writeFile(backupPath, JSON.stringify(this.config, null, 2));
            return backupPath;
        }
        catch (error) {
            throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Restores configuration from backup
     */
    async restoreFromBackup(backupPath, appliedBy = 'system') {
        try {
            const backupData = await fs.readFile(backupPath, 'utf-8');
            const backupConfig = JSON.parse(backupData);
            return this.updateConfiguration(backupConfig, appliedBy);
        }
        catch (error) {
            throw new Error(`Failed to restore from backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Updates configuration manager options
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        // Restart watchers if needed
        if (newOptions.autoReload !== undefined || newOptions.watchInterval !== undefined) {
            this.initializeWatchers();
        }
    }
    // Private methods
    async loadFromFile(filePath, format) {
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            switch (format) {
                case 'json':
                    return JSON.parse(data);
                case 'yaml':
                    // YAML parsing would be implemented here
                    throw new Error('YAML format not implemented');
                case 'env':
                    return this.parseEnvFile(data);
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
        }
        catch (error) {
            throw new Error(`Failed to load configuration from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async saveToFile(filePath, format) {
        try {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            let data;
            switch (format) {
                case 'json':
                    data = JSON.stringify(this.config, null, 2);
                    break;
                case 'yaml':
                    // YAML serialization would be implemented here
                    throw new Error('YAML format not implemented');
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
            await fs.writeFile(filePath, data);
        }
        catch (error) {
            throw new Error(`Failed to save configuration to file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    loadFromEnvironment() {
        const envConfig = {};
        // Map environment variables to configuration
        if (process.env.MCP_SERVER_NAME) {
            envConfig.server = { ...envConfig.server, name: process.env.MCP_SERVER_NAME };
        }
        if (process.env.MCP_SERVER_PORT) {
            envConfig.server = { ...envConfig.server, port: parseInt(process.env.MCP_SERVER_PORT) };
        }
        if (process.env.MCP_MAX_FILE_SIZE) {
            envConfig.security = { ...envConfig.security, maxFileSize: parseInt(process.env.MCP_MAX_FILE_SIZE) };
        }
        if (process.env.MCP_ALLOWED_PATHS) {
            envConfig.security = { ...envConfig.security, allowedPaths: process.env.MCP_ALLOWED_PATHS.split(',') };
        }
        if (process.env.MCP_DENIED_PATHS) {
            envConfig.security = { ...envConfig.security, deniedPaths: process.env.MCP_DENIED_PATHS.split(',') };
        }
        return envConfig;
    }
    parseEnvFile(data) {
        const config = {};
        const lines = data.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
                // Map environment variable to configuration path
                this.setConfigValue(config, key, value);
            }
        }
        return config;
    }
    setConfigValue(config, key, value) {
        const keys = key.split('_');
        let current = config;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        // Convert value to appropriate type
        const lastKey = keys[keys.length - 1];
        if (value === 'true' || value === 'false') {
            current[lastKey] = value === 'true';
        }
        else if (!isNaN(Number(value))) {
            current[lastKey] = Number(value);
        }
        else {
            current[lastKey] = value;
        }
    }
    mergeConfigurations(base, override) {
        const merged = { ...base };
        for (const [key, value] of Object.entries(override)) {
            if (value !== undefined && value !== null) {
                if (typeof value === 'object' && !Array.isArray(value)) {
                    merged[key] = {
                        ...merged[key],
                        ...value,
                    };
                }
                else {
                    merged[key] = value;
                }
            }
        }
        return merged;
    }
    detectChanges(oldConfig, newConfig) {
        const changes = [];
        this.compareObjects('', oldConfig, newConfig, changes);
        return changes;
    }
    compareObjects(path, oldObj, newObj, changes) {
        const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            const oldValue = oldObj[key];
            const newValue = newObj[key];
            if (oldValue === undefined && newValue !== undefined) {
                changes.push({
                    path: currentPath,
                    oldValue: undefined,
                    newValue,
                    type: 'added',
                });
            }
            else if (oldValue !== undefined && newValue === undefined) {
                changes.push({
                    path: currentPath,
                    oldValue,
                    newValue: undefined,
                    type: 'removed',
                });
            }
            else if (typeof oldValue === 'object' && typeof newValue === 'object' &&
                oldValue !== null && newValue !== null &&
                !Array.isArray(oldValue) && !Array.isArray(newValue)) {
                this.compareObjects(currentPath, oldValue, newValue, changes);
            }
            else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({
                    path: currentPath,
                    oldValue,
                    newValue,
                    type: 'modified',
                });
            }
        }
    }
    generateVersion() {
        return `v${Date.now()}`;
    }
    notifyListeners(event, config) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            for (const listener of eventListeners) {
                try {
                    listener(config);
                }
                catch (error) {
                    console.error(`Configuration listener error:`, error);
                }
            }
        }
    }
    initializeWatchers() {
        // Clear existing watchers
        for (const watcher of this.watchers.values()) {
            clearInterval(watcher);
        }
        this.watchers.clear();
        if (this.options.autoReload) {
            // Watch file sources
            for (const source of this.sources) {
                if (source.type === 'file' && source.enabled) {
                    const watcher = setInterval(async () => {
                        try {
                            await this.loadConfigurationFromSources();
                            this.notifyListeners('configuration_reloaded', this.config);
                        }
                        catch (error) {
                            console.error(`Failed to reload configuration from ${source.path}:`, error);
                        }
                    }, this.options.watchInterval);
                    this.watchers.set(source.path, watcher);
                }
            }
        }
    }
}
exports.ConfigurationManager = ConfigurationManager;
//# sourceMappingURL=ConfigurationManager.js.map