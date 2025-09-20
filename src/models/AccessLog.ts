/**
 * AccessLog Entity
 * 
 * Represents audit log entries for file system access tracking.
 * Implements security-first design with comprehensive logging.
 */

export interface AccessLogData {
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
  securityEvent?: boolean;
  details?: Record<string, any>;
}

export class AccessLog {
  private _data: AccessLogData;

  constructor(data: AccessLogData) {
    this.validateInput(data);
    this._data = {
      ...data,
      timestamp: new Date(data.timestamp),
    };
  }

  // Getters
  get id(): string {
    return this._data.id;
  }

  get timestamp(): Date {
    return new Date(this._data.timestamp);
  }

  get userId(): string {
    return this._data.userId;
  }

  get clientId(): string {
    return this._data.clientId;
  }

  get clientType(): string {
    return this._data.clientType;
  }

  get sessionId(): string | undefined {
    return this._data.sessionId;
  }

  get operation(): string {
    return this._data.operation;
  }

  get targetPath(): string | undefined {
    return this._data.targetPath;
  }

  get searchQuery(): string | undefined {
    return this._data.searchQuery;
  }

  get searchPath(): string | undefined {
    return this._data.searchPath;
  }

  get success(): boolean {
    return this._data.success;
  }

  get errorCode(): string | undefined {
    return this._data.errorCode;
  }

  get errorMessage(): string | undefined {
    return this._data.errorMessage;
  }

  get duration(): number {
    return this._data.duration;
  }

  get fileSize(): number | undefined {
    return this._data.fileSize;
  }

  get contentHash(): string | undefined {
    return this._data.contentHash;
  }

  get resultCount(): number | undefined {
    return this._data.resultCount;
  }

  get ipAddress(): string | undefined {
    return this._data.ipAddress;
  }

  get userAgent(): string | undefined {
    return this._data.userAgent;
  }

  get severity(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    return this._data.severity;
  }

  get securityEvent(): boolean {
    return this._data.securityEvent || false;
  }

  get details(): Record<string, any> | undefined {
    return this._data.details ? { ...this._data.details } : undefined;
  }

  // Methods
  updateSeverity(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): void {
    this._data.severity = severity;
  }

  updateSecurityEvent(isSecurityEvent: boolean): void {
    this._data.securityEvent = isSecurityEvent;
  }

  addDetail(key: string, value: any): void {
    if (!this._data.details) {
      this._data.details = {};
    }
    this._data.details[key] = value;
  }

  removeDetail(key: string): void {
    if (this._data.details) {
      delete this._data.details[key];
    }
  }

  updateDuration(duration: number): void {
    if (duration < 0) {
      throw new Error('Duration cannot be negative');
    }
    this._data.duration = duration;
  }

  updateResultCount(resultCount: number): void {
    if (resultCount < 0) {
      throw new Error('Result count cannot be negative');
    }
    this._data.resultCount = resultCount;
  }

  // Serialization
  toJSON(): AccessLogData {
    return {
      ...this._data,
      timestamp: this._data.timestamp,
    };
  }

  static fromJSON(data: AccessLogData): AccessLog {
    return new AccessLog(data);
  }

  // Validation
  private validateInput(data: AccessLogData): void {
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

  private validatePathFormat(path: string): void {
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

  private validateContentHash(hash: string): void {
    // Validate SHA-256 hash format
    if (!/^sha256:[a-f0-9]{64}$/i.test(hash)) {
      throw new Error('Content hash must be in format "sha256:hex64"');
    }
  }

  private validateIPAddress(ip: string): void {
    // Basic IP address validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
      throw new Error('Invalid IP address format');
    }
  }

  // Utility methods
  isRecent(seconds: number = 300): boolean {
    const now = new Date();
    const logTime = new Date(this._data.timestamp);
    const diffSeconds = (now.getTime() - logTime.getTime()) / 1000;
    return diffSeconds <= seconds;
  }

  isToday(): boolean {
    const today = new Date();
    const logDate = new Date(this._data.timestamp);
    return today.toDateString() === logDate.toDateString();
  }

  isThisWeek(): boolean {
    const now = new Date();
    const logDate = new Date(this._data.timestamp);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return logDate >= weekAgo;
  }

  isHighSeverity(): boolean {
    return this._data.severity === 'HIGH' || this._data.severity === 'CRITICAL';
  }

  isSecurityRelated(): boolean {
    return this._data.securityEvent || 
           this._data.operation.includes('security') ||
           this._data.errorCode?.includes('SECURITY') ||
           this._data.severity === 'HIGH' ||
           this._data.severity === 'CRITICAL';
  }

  isFailedOperation(): boolean {
    return !this._data.success;
  }

  isSlowOperation(thresholdMs: number = 1000): boolean {
    return this._data.duration > thresholdMs;
  }

  getOperationCategory(): string {
    const operation = this._data.operation.toLowerCase();
    if (operation.includes('list') || operation.includes('directory')) {
      return 'directory_listing';
    } else if (operation.includes('read') || operation.includes('file')) {
      return 'file_reading';
    } else if (operation.includes('search')) {
      return 'file_search';
    } else if (operation.includes('metadata')) {
      return 'metadata_retrieval';
    } else if (operation.includes('permission')) {
      return 'permission_checking';
    } else {
      return 'other';
    }
  }

  getHumanReadableDuration(): string {
    const duration = this._data.duration;
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(2)}s`;
    } else {
      return `${(duration / 60000).toFixed(2)}m`;
    }
  }

  // Static factory methods
  static createFromOperation(
    userId: string,
    clientId: string,
    clientType: string,
    operation: string,
    success: boolean,
    duration: number,
    options: Partial<AccessLogData> = {}
  ): AccessLog {
    const id = this.generateId();
    const timestamp = new Date();
    
    // Determine severity based on operation and success
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (!success) {
      severity = 'HIGH';
    } else if (duration > 5000) {
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

  static createSecurityEvent(
    userId: string,
    clientId: string,
    clientType: string,
    operation: string,
    targetPath: string,
    errorCode: string,
    errorMessage: string,
    duration: number = 0
  ): AccessLog {
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

  static createPerformanceEvent(
    userId: string,
    clientId: string,
    clientType: string,
    operation: string,
    duration: number,
    fileSize?: number,
    resultCount?: number
  ): AccessLog {
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (duration > 10000) {
      severity = 'HIGH';
    } else if (duration > 5000) {
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

  private static generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
