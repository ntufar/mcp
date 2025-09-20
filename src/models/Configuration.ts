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

export class Configuration {
  private _data: ConfigurationData;

  constructor(data: ConfigurationData) {
    this.validateInput(data);
    this._data = this.deepClone(data);
  }

  // Getters
  get server(): ConfigurationData['server'] {
    return { ...this._data.server };
  }

  get security(): ConfigurationData['security'] {
    return { ...this._data.security };
  }

  get performance(): ConfigurationData['performance'] {
    return { ...this._data.performance };
  }

  get logging(): ConfigurationData['logging'] {
    return { ...this._data.logging };
  }

  // Server configuration methods
  updateServerName(name: string): void {
    this.validateServerName(name);
    this._data.server.name = name;
  }

  updateServerVersion(version: string): void {
    this.validateVersion(version);
    this._data.server.version = version;
  }

  updatePort(port: number): void {
    this.validatePort(port);
    this._data.server.port = port;
  }

  updateHost(host: string): void {
    this.validateHost(host);
    this._data.server.host = host;
  }

  updateMaxConnections(maxConnections: number): void {
    this.validateMaxConnections(maxConnections);
    this._data.server.maxConnections = maxConnections;
  }

  updateRequestTimeout(requestTimeout: number): void {
    this.validateRequestTimeout(requestTimeout);
    this._data.server.requestTimeout = requestTimeout;
  }

  // Security configuration methods
  addAllowedPath(path: string): void {
    this.validatePath(path);
    if (!this._data.security.allowedPaths.includes(path)) {
      this._data.security.allowedPaths.push(path);
    }
  }

  removeAllowedPath(path: string): void {
    const index = this._data.security.allowedPaths.indexOf(path);
    if (index > -1) {
      this._data.security.allowedPaths.splice(index, 1);
    }
  }

  addDeniedPath(path: string): void {
    this.validatePath(path);
    if (!this._data.security.deniedPaths.includes(path)) {
      this._data.security.deniedPaths.push(path);
    }
  }

  removeDeniedPath(path: string): void {
    const index = this._data.security.deniedPaths.indexOf(path);
    if (index > -1) {
      this._data.security.deniedPaths.splice(index, 1);
    }
  }

  updateMaxFileSize(maxFileSize: string): void {
    this.validateFileSize(maxFileSize);
    this._data.security.maxFileSize = maxFileSize;
  }

  updateMaxDirectoryDepth(maxDirectoryDepth: number): void {
    this.validateMaxDirectoryDepth(maxDirectoryDepth);
    this._data.security.maxDirectoryDepth = maxDirectoryDepth;
  }

  updateAllowSymbolicLinks(allowSymbolicLinks: boolean): void {
    this._data.security.allowSymbolicLinks = allowSymbolicLinks;
  }

  updateEnableAuditLogging(enableAuditLogging: boolean): void {
    this._data.security.enableAuditLogging = enableAuditLogging;
  }

  updateAuditLogRetentionDays(auditLogRetentionDays: number): void {
    this.validateAuditLogRetentionDays(auditLogRetentionDays);
    this._data.security.auditLogRetentionDays = auditLogRetentionDays;
  }

  // Performance configuration methods
  updateCacheSize(cacheSize: string): void {
    this.validateCacheSize(cacheSize);
    this._data.performance.cacheSize = cacheSize;
  }

  updateCacheTTL(cacheTTL: number): void {
    this.validateCacheTTL(cacheTTL);
    this._data.performance.cacheTTL = cacheTTL;
  }

  updateMaxConcurrentOperations(maxConcurrentOperations: number): void {
    this.validateMaxConcurrentOperations(maxConcurrentOperations);
    this._data.performance.maxConcurrentOperations = maxConcurrentOperations;
  }

  updateEnableStreaming(enableStreaming: boolean): void {
    this._data.performance.enableStreaming = enableStreaming;
  }

  updateStreamingChunkSize(streamingChunkSize: number): void {
    this.validateStreamingChunkSize(streamingChunkSize);
    this._data.performance.streamingChunkSize = streamingChunkSize;
  }

  updateMemoryLimit(memoryLimit: string): void {
    this.validateMemoryLimit(memoryLimit);
    this._data.performance.memoryLimit = memoryLimit;
  }

  // Logging configuration methods
  updateLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this._data.logging.level = level;
  }

  updateEnableConsole(enableConsole: boolean): void {
    this._data.logging.enableConsole = enableConsole;
  }

  updateEnableFile(enableFile: boolean): void {
    this._data.logging.enableFile = enableFile;
  }

  updateLogFilePath(logFilePath: string): void {
    this.validateLogFilePath(logFilePath);
    this._data.logging.logFilePath = logFilePath;
  }

  updateMaxLogFileSize(maxLogFileSize: string): void {
    this.validateFileSize(maxLogFileSize);
    this._data.logging.maxLogFileSize = maxLogFileSize;
  }

  updateMaxLogFiles(maxLogFiles: number): void {
    this.validateMaxLogFiles(maxLogFiles);
    this._data.logging.maxLogFiles = maxLogFiles;
  }

  // Security validation methods
  isPathAllowed(path: string): boolean {
    // Check denied paths first
    for (const deniedPath of this._data.security.deniedPaths) {
      if (path.startsWith(deniedPath)) {
        return false;
      }
    }

    // Check allowed paths
    if (this._data.security.allowedPaths.length === 0) {
      return true; // No restrictions
    }

    for (const allowedPath of this._data.security.allowedPaths) {
      if (path.startsWith(allowedPath)) {
        return true;
      }
    }

    return false;
  }

  isPathDenied(path: string): boolean {
    for (const deniedPath of this._data.security.deniedPaths) {
      if (path.startsWith(deniedPath)) {
        return true;
      }
    }
    return false;
  }

  getMaxFileSizeBytes(): number {
    return this.parseSizeString(this._data.security.maxFileSize);
  }

  getCacheSizeBytes(): number {
    return this.parseSizeString(this._data.performance.cacheSize);
  }

  getMemoryLimitBytes(): number {
    return this.parseSizeString(this._data.performance.memoryLimit);
  }

  getMaxLogFileSizeBytes(): number {
    return this.parseSizeString(this._data.logging.maxLogFileSize);
  }

  // Serialization
  toJSON(): ConfigurationData {
    return this.deepClone(this._data);
  }

  static fromJSON(data: ConfigurationData): Configuration {
    return new Configuration(data);
  }

  // Validation
  private validateInput(data: ConfigurationData): void {
    this.validateServerConfig(data.server);
    this.validateSecurityConfig(data.security);
    this.validatePerformanceConfig(data.performance);
    this.validateLoggingConfig(data.logging);
  }

  private validateServerConfig(server: ConfigurationData['server']): void {
    this.validateServerName(server.name);
    this.validateVersion(server.version);
    this.validatePort(server.port);
    this.validateHost(server.host);
    this.validateMaxConnections(server.maxConnections);
    this.validateRequestTimeout(server.requestTimeout);
  }

  private validateSecurityConfig(security: ConfigurationData['security']): void {
    if (!Array.isArray(security.allowedPaths)) {
      throw new Error('Allowed paths must be an array');
    }
    if (!Array.isArray(security.deniedPaths)) {
      throw new Error('Denied paths must be an array');
    }

    security.allowedPaths.forEach(path => this.validatePath(path));
    security.deniedPaths.forEach(path => this.validatePath(path));

    this.validateFileSize(security.maxFileSize);
    this.validateMaxDirectoryDepth(security.maxDirectoryDepth);

    if (typeof security.allowSymbolicLinks !== 'boolean') {
      throw new Error('Allow symbolic links must be a boolean');
    }

    if (typeof security.enableAuditLogging !== 'boolean') {
      throw new Error('Enable audit logging must be a boolean');
    }

    this.validateAuditLogRetentionDays(security.auditLogRetentionDays);
  }

  private validatePerformanceConfig(performance: ConfigurationData['performance']): void {
    this.validateCacheSize(performance.cacheSize);
    this.validateCacheTTL(performance.cacheTTL);
    this.validateMaxConcurrentOperations(performance.maxConcurrentOperations);

    if (typeof performance.enableStreaming !== 'boolean') {
      throw new Error('Enable streaming must be a boolean');
    }

    this.validateStreamingChunkSize(performance.streamingChunkSize);
    this.validateMemoryLimit(performance.memoryLimit);
  }

  private validateLoggingConfig(logging: ConfigurationData['logging']): void {
    if (!['debug', 'info', 'warn', 'error'].includes(logging.level)) {
      throw new Error('Log level must be debug, info, warn, or error');
    }

    if (typeof logging.enableConsole !== 'boolean') {
      throw new Error('Enable console must be a boolean');
    }

    if (typeof logging.enableFile !== 'boolean') {
      throw new Error('Enable file must be a boolean');
    }

    this.validateLogFilePath(logging.logFilePath);
    this.validateFileSize(logging.maxLogFileSize);
    this.validateMaxLogFiles(logging.maxLogFiles);
  }

  private validateServerName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Server name is required and must be a string');
    }
    if (name.length === 0 || name.length > 100) {
      throw new Error('Server name must be between 1 and 100 characters');
    }
  }

  private validateVersion(version: string): void {
    if (!version || typeof version !== 'string') {
      throw new Error('Version is required and must be a string');
    }
    if (!/^\d+\.\d+\.\d+/.test(version)) {
      throw new Error('Version must be in format x.y.z');
    }
  }

  private validatePort(port: number): void {
    if (typeof port !== 'number' || port < 1 || port > 65535) {
      throw new Error('Port must be a number between 1 and 65535');
    }
  }

  private validateHost(host: string): void {
    if (!host || typeof host !== 'string') {
      throw new Error('Host is required and must be a string');
    }
    if (host !== 'localhost' && host !== '0.0.0.0' && !/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      throw new Error('Host must be localhost, 0.0.0.0, or a valid IP address');
    }
  }

  private validateMaxConnections(maxConnections: number): void {
    if (typeof maxConnections !== 'number' || maxConnections < 1 || maxConnections > 10000) {
      throw new Error('Max connections must be a number between 1 and 10000');
    }
  }

  private validateRequestTimeout(requestTimeout: number): void {
    if (typeof requestTimeout !== 'number' || requestTimeout < 1000 || requestTimeout > 300000) {
      throw new Error('Request timeout must be a number between 1000 and 300000 milliseconds');
    }
  }

  private validatePath(path: string): void {
    if (!path || typeof path !== 'string') {
      throw new Error('Path is required and must be a string');
    }
    if (!path.startsWith('/')) {
      throw new Error('Path must be absolute (start with /)');
    }
    if (path.includes('..') || path.includes('~')) {
      throw new Error('Path contains invalid characters for security');
    }
  }

  private validateFileSize(size: string): void {
    if (!size || typeof size !== 'string') {
      throw new Error('File size is required and must be a string');
    }
    if (!/^\d+(\.\d+)?[KMGT]?B?$/.test(size.toUpperCase())) {
      throw new Error('File size must be in format like "100MB", "1.5GB", etc.');
    }
  }

  private validateMaxDirectoryDepth(maxDirectoryDepth: number): void {
    if (typeof maxDirectoryDepth !== 'number' || maxDirectoryDepth < 1 || maxDirectoryDepth > 50) {
      throw new Error('Max directory depth must be a number between 1 and 50');
    }
  }

  private validateAuditLogRetentionDays(auditLogRetentionDays: number): void {
    if (typeof auditLogRetentionDays !== 'number' || auditLogRetentionDays < 1 || auditLogRetentionDays > 3650) {
      throw new Error('Audit log retention days must be a number between 1 and 3650');
    }
  }

  private validateCacheSize(cacheSize: string): void {
    this.validateFileSize(cacheSize);
  }

  private validateCacheTTL(cacheTTL: number): void {
    if (typeof cacheTTL !== 'number' || cacheTTL < 0 || cacheTTL > 86400) {
      throw new Error('Cache TTL must be a number between 0 and 86400 seconds');
    }
  }

  private validateMaxConcurrentOperations(maxConcurrentOperations: number): void {
    if (typeof maxConcurrentOperations !== 'number' || maxConcurrentOperations < 1 || maxConcurrentOperations > 1000) {
      throw new Error('Max concurrent operations must be a number between 1 and 1000');
    }
  }

  private validateStreamingChunkSize(streamingChunkSize: number): void {
    if (typeof streamingChunkSize !== 'number' || streamingChunkSize < 1024 || streamingChunkSize > 10485760) {
      throw new Error('Streaming chunk size must be a number between 1024 and 10485760 bytes');
    }
  }

  private validateMemoryLimit(memoryLimit: string): void {
    this.validateFileSize(memoryLimit);
  }

  private validateLogFilePath(logFilePath: string): void {
    if (!logFilePath || typeof logFilePath !== 'string') {
      throw new Error('Log file path is required and must be a string');
    }
    this.validatePath(logFilePath);
  }

  private validateMaxLogFiles(maxLogFiles: number): void {
    if (typeof maxLogFiles !== 'number' || maxLogFiles < 1 || maxLogFiles > 100) {
      throw new Error('Max log files must be a number between 1 and 100');
    }
  }

  private parseSizeString(sizeStr: string): number {
    const size = sizeStr.toUpperCase();
    const match = size.match(/^(\d+(?:\.\d+)?)([KMGT]?B?)$/);
    
    if (!match) {
      throw new Error(`Invalid size format: ${sizeStr}`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'B':
      case '':
        return Math.floor(value);
      case 'KB':
        return Math.floor(value * 1024);
      case 'MB':
        return Math.floor(value * 1024 * 1024);
      case 'GB':
        return Math.floor(value * 1024 * 1024 * 1024);
      case 'TB':
        return Math.floor(value * 1024 * 1024 * 1024 * 1024);
      default:
        throw new Error(`Unsupported size unit: ${unit}`);
    }
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  // Static factory methods
  static createDefault(): Configuration {
    return new Configuration({
      server: {
        name: 'mcp-file-browser',
        version: '1.0.0',
        port: 3000,
        host: 'localhost',
        maxConnections: 100,
        requestTimeout: 30000,
      },
      security: {
        allowedPaths: ['/home', '/tmp'],
        deniedPaths: ['/etc', '/root', '/proc', '/sys', '/dev'],
        maxFileSize: '100MB',
        maxDirectoryDepth: 10,
        allowSymbolicLinks: false,
        enableAuditLogging: true,
        auditLogRetentionDays: 30,
      },
      performance: {
        cacheSize: '50MB',
        cacheTTL: 300,
        maxConcurrentOperations: 50,
        enableStreaming: true,
        streamingChunkSize: 8192,
        memoryLimit: '100MB',
      },
      logging: {
        level: 'info',
        enableConsole: true,
        enableFile: true,
        logFilePath: '/var/log/mcp-file-browser.log',
        maxLogFileSize: '10MB',
        maxLogFiles: 5,
      },
    });
  }

  static createSecure(): Configuration {
    return new Configuration({
      server: {
        name: 'mcp-file-browser-secure',
        version: '1.0.0',
        port: 3000,
        host: 'localhost',
        maxConnections: 50,
        requestTimeout: 15000,
      },
      security: {
        allowedPaths: ['/home/user/documents', '/home/user/projects'],
        deniedPaths: ['/etc', '/root', '/proc', '/sys', '/dev', '/boot', '/var/log'],
        maxFileSize: '10MB',
        maxDirectoryDepth: 5,
        allowSymbolicLinks: false,
        enableAuditLogging: true,
        auditLogRetentionDays: 90,
      },
      performance: {
        cacheSize: '25MB',
        cacheTTL: 180,
        maxConcurrentOperations: 25,
        enableStreaming: true,
        streamingChunkSize: 4096,
        memoryLimit: '50MB',
      },
      logging: {
        level: 'warn',
        enableConsole: true,
        enableFile: true,
        logFilePath: '/var/log/mcp-file-browser-secure.log',
        maxLogFileSize: '5MB',
        maxLogFiles: 10,
      },
    });
  }
}
