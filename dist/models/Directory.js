"use strict";
/**
 * Directory Entity
 *
 * Represents a file system directory with comprehensive metadata.
 * Implements security-first design with strict validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Directory = void 0;
class Directory {
    _data;
    constructor(data) {
        this.validateInput(data);
        this._data = {
            ...data,
            modifiedTime: new Date(data.modifiedTime),
            createdTime: new Date(data.createdTime),
            lastAccessed: data.lastAccessed ? new Date(data.lastAccessed) : undefined,
        };
    }
    // Getters
    get path() {
        return this._data.path;
    }
    get name() {
        return this._data.name;
    }
    get parentPath() {
        return this._data.parentPath;
    }
    get permissions() {
        return { ...this._data.permissions };
    }
    get modifiedTime() {
        return new Date(this._data.modifiedTime);
    }
    get createdTime() {
        return new Date(this._data.createdTime);
    }
    get fileCount() {
        return this._data.fileCount;
    }
    get subdirectoryCount() {
        return this._data.subdirectoryCount;
    }
    get totalSize() {
        return this._data.totalSize;
    }
    get isSymbolicLink() {
        return this._data.isSymbolicLink;
    }
    get targetPath() {
        return this._data.targetPath;
    }
    get isAccessible() {
        return this._data.isAccessible;
    }
    get lastAccessed() {
        return this._data.lastAccessed ? new Date(this._data.lastAccessed) : undefined;
    }
    // Methods
    updateAccessTime() {
        this._data.lastAccessed = new Date();
    }
    updateFileCount(fileCount) {
        if (fileCount < 0) {
            throw new Error('File count cannot be negative');
        }
        this._data.fileCount = fileCount;
    }
    updateSubdirectoryCount(subdirectoryCount) {
        if (subdirectoryCount < 0) {
            throw new Error('Subdirectory count cannot be negative');
        }
        this._data.subdirectoryCount = subdirectoryCount;
    }
    updateTotalSize(totalSize) {
        if (totalSize < 0) {
            throw new Error('Total size cannot be negative');
        }
        this._data.totalSize = totalSize;
    }
    updatePermissions(permissions) {
        this.validatePermissions(permissions);
        this._data.permissions = { ...permissions };
    }
    updateAccessibility(isAccessible) {
        this._data.isAccessible = isAccessible;
    }
    // Serialization
    toJSON() {
        return {
            ...this._data,
            modifiedTime: this._data.modifiedTime,
            createdTime: this._data.createdTime,
            lastAccessed: this._data.lastAccessed,
        };
    }
    static fromJSON(data) {
        return new Directory(data);
    }
    // Validation
    validateInput(data) {
        if (!data.path || typeof data.path !== 'string') {
            throw new Error('Path is required and must be a string');
        }
        if (!data.name || typeof data.name !== 'string') {
            throw new Error('Name is required and must be a string');
        }
        if (!data.permissions) {
            throw new Error('Permissions are required');
        }
        this.validatePermissions(data.permissions);
        if (!(data.modifiedTime instanceof Date) && typeof data.modifiedTime !== 'string') {
            throw new Error('Modified time must be a Date or string');
        }
        if (!(data.createdTime instanceof Date) && typeof data.createdTime !== 'string') {
            throw new Error('Created time must be a Date or string');
        }
        if (typeof data.fileCount !== 'number' || data.fileCount < 0) {
            throw new Error('File count must be a non-negative number');
        }
        if (typeof data.subdirectoryCount !== 'number' || data.subdirectoryCount < 0) {
            throw new Error('Subdirectory count must be a non-negative number');
        }
        if (typeof data.totalSize !== 'number' || data.totalSize < 0) {
            throw new Error('Total size must be a non-negative number');
        }
        if (typeof data.isSymbolicLink !== 'boolean') {
            throw new Error('isSymbolicLink must be a boolean');
        }
        if (typeof data.isAccessible !== 'boolean') {
            throw new Error('isAccessible must be a boolean');
        }
        // Validate path format
        this.validatePathFormat(data.path);
        // Validate symbolic link consistency
        if (data.isSymbolicLink && !data.targetPath) {
            throw new Error('Symbolic links must have a target path');
        }
        if (!data.isSymbolicLink && data.targetPath) {
            throw new Error('Non-symbolic links should not have a target path');
        }
    }
    validatePermissions(permissions) {
        if (!permissions.owner || typeof permissions.owner !== 'string') {
            throw new Error('Permission owner is required and must be a string');
        }
        if (!permissions.group || typeof permissions.group !== 'string') {
            throw new Error('Permission group is required and must be a string');
        }
        if (!permissions.mode || typeof permissions.mode !== 'string') {
            throw new Error('Permission mode is required and must be a string');
        }
        if (typeof permissions.readable !== 'boolean') {
            throw new Error('Permission readable must be a boolean');
        }
        if (typeof permissions.writable !== 'boolean') {
            throw new Error('Permission writable must be a boolean');
        }
        if (typeof permissions.executable !== 'boolean') {
            throw new Error('Permission executable must be a boolean');
        }
    }
    validatePathFormat(path) {
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
        // Validate path structure
        if (!path.startsWith('/')) {
            throw new Error('Path must be absolute (start with /)');
        }
        // Check for double slashes
        if (path.includes('//')) {
            throw new Error('Path contains double slashes');
        }
    }
    // Utility methods
    getDepth() {
        return this.path.split('/').filter(segment => segment.length > 0).length;
    }
    getRelativePath(basePath) {
        if (!this.path.startsWith(basePath)) {
            throw new Error('Directory path does not start with base path');
        }
        return this.path.substring(basePath.length) || '/';
    }
    isSubdirectoryOf(parentPath) {
        return this.path.startsWith(parentPath + '/') || this.path === parentPath;
    }
    hasPermission(operation) {
        switch (operation) {
            case 'read':
                return this._data.permissions.readable;
            case 'write':
                return this._data.permissions.writable;
            case 'execute':
                return this._data.permissions.executable;
            default:
                return false;
        }
    }
    // Static factory methods
    static createFromFileSystem(path, stats, permissions, fileCount = 0, subdirectoryCount = 0, totalSize = 0) {
        const pathParts = path.split('/');
        const name = pathParts[pathParts.length - 1] || '/';
        const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') || '/' : undefined;
        return new Directory({
            path,
            name,
            parentPath,
            permissions,
            modifiedTime: stats.mtime || new Date(),
            createdTime: stats.birthtime || stats.ctime || new Date(),
            fileCount,
            subdirectoryCount,
            totalSize,
            isSymbolicLink: stats.isSymbolicLink() || false,
            targetPath: stats.isSymbolicLink() ? stats.targetPath : undefined,
            isAccessible: true,
        });
    }
    static createInaccessible(path) {
        const pathParts = path.split('/');
        const name = pathParts[pathParts.length - 1] || '/';
        const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') || '/' : undefined;
        return new Directory({
            path,
            name,
            parentPath,
            permissions: {
                owner: 'unknown',
                group: 'unknown',
                mode: '000',
                readable: false,
                writable: false,
                executable: false,
            },
            modifiedTime: new Date(),
            createdTime: new Date(),
            fileCount: 0,
            subdirectoryCount: 0,
            totalSize: 0,
            isSymbolicLink: false,
            isAccessible: false,
        });
    }
}
exports.Directory = Directory;
//# sourceMappingURL=Directory.js.map