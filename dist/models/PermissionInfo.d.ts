/**
 * PermissionInfo Entity
 *
 * Represents file system permissions with security validation.
 * Implements security-first design with strict permission checking.
 */
export interface PermissionInfoData {
    owner: string;
    group: string;
    mode: string;
    readable: boolean;
    writable: boolean;
    executable: boolean;
    sticky?: boolean;
    setuid?: boolean;
    setgid?: boolean;
}
export declare class PermissionInfo {
    private _data;
    constructor(data: PermissionInfoData);
    get owner(): string;
    get group(): string;
    get mode(): string;
    get readable(): boolean;
    get writable(): boolean;
    get executable(): boolean;
    get sticky(): boolean;
    get setuid(): boolean;
    get setgid(): boolean;
    updateOwner(owner: string): void;
    updateGroup(group: string): void;
    updateMode(mode: string): void;
    updateReadable(readable: boolean): void;
    updateWritable(writable: boolean): void;
    updateExecutable(executable: boolean): void;
    updateSticky(sticky: boolean): void;
    updateSetuid(setuid: boolean): void;
    updateSetgid(setgid: boolean): void;
    hasPermission(operation: 'read' | 'write' | 'execute'): boolean;
    hasAnyPermission(): boolean;
    hasAllPermissions(): boolean;
    isReadOnly(): boolean;
    isWriteOnly(): boolean;
    isExecuteOnly(): boolean;
    isSecure(): boolean;
    isRestrictive(): boolean;
    isPermissive(): boolean;
    toJSON(): PermissionInfoData;
    static fromJSON(data: PermissionInfoData): PermissionInfo;
    private validateInput;
    private validateOwner;
    private validateGroup;
    private validateMode;
    private updateFlagsFromMode;
    private updateModeFromFlags;
    getOctalMode(): string;
    getSymbolicMode(): string;
    static createFromStats(stats: any): PermissionInfo;
    static createReadOnly(): PermissionInfo;
    static createWriteOnly(): PermissionInfo;
    static createExecuteOnly(): PermissionInfo;
    static createFullAccess(): PermissionInfo;
    static createRestrictive(): PermissionInfo;
}
//# sourceMappingURL=PermissionInfo.d.ts.map