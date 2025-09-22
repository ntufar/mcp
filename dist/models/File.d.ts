/**
 * File Entity
 *
 * Represents a file system file with metadata and content information.
 * Implements security-first design with strict validation.
 */
import { PermissionInfo } from './Directory';
export interface FileData {
    path: string;
    name: string;
    directoryPath: string;
    size: number;
    permissions: PermissionInfo;
    modifiedTime: Date;
    createdTime: Date;
    contentType?: string;
    encoding?: string;
    isSymbolicLink: boolean;
    targetPath?: string;
    isAccessible: boolean;
    isReadable: boolean;
    contentHash?: string;
    lastAccessed?: Date;
}
export declare class File {
    private _data;
    constructor(data: FileData);
    get path(): string;
    get name(): string;
    get directoryPath(): string;
    get size(): number;
    get permissions(): PermissionInfo;
    get modifiedTime(): Date;
    get createdTime(): Date;
    get contentType(): string | undefined;
    get encoding(): string | undefined;
    get isSymbolicLink(): boolean;
    get targetPath(): string | undefined;
    get isAccessible(): boolean;
    get isReadable(): boolean;
    get contentHash(): string | undefined;
    get lastAccessed(): Date | undefined;
    updateAccessTime(): void;
    updateSize(size: number): void;
    updateContentType(contentType: string): void;
    updateEncoding(encoding: string): void;
    updatePermissions(permissions: PermissionInfo): void;
    updateAccessibility(isAccessible: boolean): void;
    updateReadability(isReadable: boolean): void;
    updateContentHash(hash: string): void;
    toJSON(): FileData;
    static fromJSON(data: FileData): File;
    private validateInput;
    private validatePermissions;
    private validatePathFormat;
    private validateContentType;
    private validateEncoding;
    private validateContentHash;
    getExtension(): string;
    getFileNameWithoutExtension(): string;
    getRelativePath(basePath: string): string;
    isInDirectory(directoryPath: string): boolean;
    hasPermission(operation: 'read' | 'write' | 'execute'): boolean;
    isTextFile(): boolean;
    isBinaryFile(): boolean;
    getHumanReadableSize(): string;
    static createFromFileSystem(path: string, stats: any, permissions: PermissionInfo, contentType?: string, encoding?: string): File;
    static createInaccessible(path: string): File;
    static createWithContent(path: string, stats: any, permissions: PermissionInfo, content: string, contentType?: string, encoding?: string): File;
}
//# sourceMappingURL=File.d.ts.map