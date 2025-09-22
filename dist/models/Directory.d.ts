/**
 * Directory Entity
 *
 * Represents a file system directory with comprehensive metadata.
 * Implements security-first design with strict validation.
 */
export interface PermissionInfo {
    owner: string;
    group: string;
    mode: string;
    readable: boolean;
    writable: boolean;
    executable: boolean;
}
export interface DirectoryData {
    path: string;
    name: string;
    parentPath?: string;
    permissions: PermissionInfo;
    modifiedTime: Date;
    createdTime: Date;
    fileCount: number;
    subdirectoryCount: number;
    totalSize: number;
    isSymbolicLink: boolean;
    targetPath?: string;
    isAccessible: boolean;
    lastAccessed?: Date;
}
export declare class Directory {
    private _data;
    constructor(data: DirectoryData);
    get path(): string;
    get name(): string;
    get parentPath(): string | undefined;
    get permissions(): PermissionInfo;
    get modifiedTime(): Date;
    get createdTime(): Date;
    get fileCount(): number;
    get subdirectoryCount(): number;
    get totalSize(): number;
    get isSymbolicLink(): boolean;
    get targetPath(): string | undefined;
    get isAccessible(): boolean;
    get lastAccessed(): Date | undefined;
    updateAccessTime(): void;
    updateFileCount(fileCount: number): void;
    updateSubdirectoryCount(subdirectoryCount: number): void;
    updateTotalSize(totalSize: number): void;
    updatePermissions(permissions: PermissionInfo): void;
    updateAccessibility(isAccessible: boolean): void;
    toJSON(): DirectoryData;
    static fromJSON(data: DirectoryData): Directory;
    private validateInput;
    private validatePermissions;
    private validatePathFormat;
    getDepth(): number;
    getRelativePath(basePath: string): string;
    isSubdirectoryOf(parentPath: string): boolean;
    hasPermission(operation: 'read' | 'write' | 'execute'): boolean;
    static createFromFileSystem(path: string, stats: any, permissions: PermissionInfo, fileCount?: number, subdirectoryCount?: number, totalSize?: number): Directory;
    static createInaccessible(path: string): Directory;
}
//# sourceMappingURL=Directory.d.ts.map