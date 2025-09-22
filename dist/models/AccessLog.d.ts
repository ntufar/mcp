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
export declare class AccessLog {
    private _data;
    constructor(data: AccessLogData);
    get id(): string;
    get timestamp(): Date;
    get userId(): string;
    get clientId(): string;
    get clientType(): string;
    get sessionId(): string | undefined;
    get operation(): string;
    get targetPath(): string | undefined;
    get searchQuery(): string | undefined;
    get searchPath(): string | undefined;
    get success(): boolean;
    get errorCode(): string | undefined;
    get errorMessage(): string | undefined;
    get duration(): number;
    get fileSize(): number | undefined;
    get contentHash(): string | undefined;
    get resultCount(): number | undefined;
    get ipAddress(): string | undefined;
    get userAgent(): string | undefined;
    get severity(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    get securityEvent(): boolean;
    get details(): Record<string, any> | undefined;
    updateSeverity(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): void;
    updateSecurityEvent(isSecurityEvent: boolean): void;
    addDetail(key: string, value: any): void;
    removeDetail(key: string): void;
    updateDuration(duration: number): void;
    updateResultCount(resultCount: number): void;
    toJSON(): AccessLogData;
    static fromJSON(data: AccessLogData): AccessLog;
    private validateInput;
    private validatePathFormat;
    private validateContentHash;
    private validateIPAddress;
    isRecent(seconds?: number): boolean;
    isToday(): boolean;
    isThisWeek(): boolean;
    isHighSeverity(): boolean;
    isSecurityRelated(): boolean;
    isFailedOperation(): boolean;
    isSlowOperation(thresholdMs?: number): boolean;
    getOperationCategory(): string;
    getHumanReadableDuration(): string;
    static createFromOperation(userId: string, clientId: string, clientType: string, operation: string, success: boolean, duration: number, options?: Partial<AccessLogData>): AccessLog;
    static createSecurityEvent(userId: string, clientId: string, clientType: string, operation: string, targetPath: string, errorCode: string, errorMessage: string, duration?: number): AccessLog;
    static createPerformanceEvent(userId: string, clientId: string, clientType: string, operation: string, duration: number, fileSize?: number, resultCount?: number): AccessLog;
    private static generateId;
}
//# sourceMappingURL=AccessLog.d.ts.map