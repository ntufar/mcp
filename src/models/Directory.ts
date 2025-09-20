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

export class Directory {
  private _data: DirectoryData;

  constructor(data: DirectoryData) {
    this.validateInput(data);
    this._data = {
      ...data,
      modifiedTime: new Date(data.modifiedTime),
      createdTime: new Date(data.createdTime),
      lastAccessed: data.lastAccessed ? new Date(data.lastAccessed) : undefined,
    };
  }

  // Getters
  get path(): string {
    return this._data.path;
  }

  get name(): string {
    return this._data.name;
  }

  get parentPath(): string | undefined {
    return this._data.parentPath;
  }

  get permissions(): PermissionInfo {
    return { ...this._data.permissions };
  }

  get modifiedTime(): Date {
    return new Date(this._data.modifiedTime);
  }

  get createdTime(): Date {
    return new Date(this._data.createdTime);
  }

  get fileCount(): number {
    return this._data.fileCount;
  }

  get subdirectoryCount(): number {
    return this._data.subdirectoryCount;
  }

  get totalSize(): number {
    return this._data.totalSize;
  }

  get isSymbolicLink(): boolean {
    return this._data.isSymbolicLink;
  }

  get targetPath(): string | undefined {
    return this._data.targetPath;
  }

  get isAccessible(): boolean {
    return this._data.isAccessible;
  }

  get lastAccessed(): Date | undefined {
    return this._data.lastAccessed ? new Date(this._data.lastAccessed) : undefined;
  }

  // Methods
  updateAccessTime(): void {
    this._data.lastAccessed = new Date();
  }

  updateFileCount(fileCount: number): void {
    if (fileCount < 0) {
      throw new Error('File count cannot be negative');
    }
    this._data.fileCount = fileCount;
  }

  updateSubdirectoryCount(subdirectoryCount: number): void {
    if (subdirectoryCount < 0) {
      throw new Error('Subdirectory count cannot be negative');
    }
    this._data.subdirectoryCount = subdirectoryCount;
  }

  updateTotalSize(totalSize: number): void {
    if (totalSize < 0) {
      throw new Error('Total size cannot be negative');
    }
    this._data.totalSize = totalSize;
  }

  updatePermissions(permissions: PermissionInfo): void {
    this.validatePermissions(permissions);
    this._data.permissions = { ...permissions };
  }

  updateAccessibility(isAccessible: boolean): void {
    this._data.isAccessible = isAccessible;
  }

  // Serialization
  toJSON(): DirectoryData {
    return {
      ...this._data,
      modifiedTime: this._data.modifiedTime,
      createdTime: this._data.createdTime,
      lastAccessed: this._data.lastAccessed,
    };
  }

  static fromJSON(data: DirectoryData): Directory {
    return new Directory(data);
  }

  // Validation
  private validateInput(data: DirectoryData): void {
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

  private validatePermissions(permissions: PermissionInfo): void {
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
  getDepth(): number {
    return this.path.split('/').filter(segment => segment.length > 0).length;
  }

  getRelativePath(basePath: string): string {
    if (!this.path.startsWith(basePath)) {
      throw new Error('Directory path does not start with base path');
    }
    return this.path.substring(basePath.length) || '/';
  }

  isSubdirectoryOf(parentPath: string): boolean {
    return this.path.startsWith(parentPath + '/') || this.path === parentPath;
  }

  hasPermission(operation: 'read' | 'write' | 'execute'): boolean {
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
  static createFromFileSystem(
    path: string,
    stats: any,
    permissions: PermissionInfo,
    fileCount: number = 0,
    subdirectoryCount: number = 0,
    totalSize: number = 0
  ): Directory {
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

  static createInaccessible(path: string): Directory {
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
