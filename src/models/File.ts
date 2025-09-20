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

export class File {
  private _data: FileData;

  constructor(data: FileData) {
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

  get directoryPath(): string {
    return this._data.directoryPath;
  }

  get size(): number {
    return this._data.size;
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

  get contentType(): string | undefined {
    return this._data.contentType;
  }

  get encoding(): string | undefined {
    return this._data.encoding;
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

  get isReadable(): boolean {
    return this._data.isReadable;
  }

  get contentHash(): string | undefined {
    return this._data.contentHash;
  }

  get lastAccessed(): Date | undefined {
    return this._data.lastAccessed ? new Date(this._data.lastAccessed) : undefined;
  }

  // Methods
  updateAccessTime(): void {
    this._data.lastAccessed = new Date();
  }

  updateSize(size: number): void {
    if (size < 0) {
      throw new Error('File size cannot be negative');
    }
    this._data.size = size;
  }

  updateContentType(contentType: string): void {
    this.validateContentType(contentType);
    this._data.contentType = contentType;
  }

  updateEncoding(encoding: string): void {
    this.validateEncoding(encoding);
    this._data.encoding = encoding;
  }

  updatePermissions(permissions: PermissionInfo): void {
    this.validatePermissions(permissions);
    this._data.permissions = { ...permissions };
  }

  updateAccessibility(isAccessible: boolean): void {
    this._data.isAccessible = isAccessible;
  }

  updateReadability(isReadable: boolean): void {
    this._data.isReadable = isReadable;
  }

  updateContentHash(hash: string): void {
    this.validateContentHash(hash);
    this._data.contentHash = hash;
  }

  // Serialization
  toJSON(): FileData {
    return {
      ...this._data,
      modifiedTime: this._data.modifiedTime,
      createdTime: this._data.createdTime,
      lastAccessed: this._data.lastAccessed,
    };
  }

  static fromJSON(data: FileData): File {
    return new File(data);
  }

  // Validation
  private validateInput(data: FileData): void {
    if (!data.path || typeof data.path !== 'string') {
      throw new Error('Path is required and must be a string');
    }

    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Name is required and must be a string');
    }

    if (!data.directoryPath || typeof data.directoryPath !== 'string') {
      throw new Error('Directory path is required and must be a string');
    }

    if (typeof data.size !== 'number' || data.size < 0) {
      throw new Error('Size must be a non-negative number');
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

    if (typeof data.isSymbolicLink !== 'boolean') {
      throw new Error('isSymbolicLink must be a boolean');
    }

    if (typeof data.isAccessible !== 'boolean') {
      throw new Error('isAccessible must be a boolean');
    }

    if (typeof data.isReadable !== 'boolean') {
      throw new Error('isReadable must be a boolean');
    }

    // Validate path format
    this.validatePathFormat(data.path);

    // Validate directory path consistency
    if (!data.path.startsWith(data.directoryPath)) {
      throw new Error('File path must start with directory path');
    }

    // Validate symbolic link consistency
    if (data.isSymbolicLink && !data.targetPath) {
      throw new Error('Symbolic links must have a target path');
    }

    if (!data.isSymbolicLink && data.targetPath) {
      throw new Error('Non-symbolic links should not have a target path');
    }

    // Validate content type if provided
    if (data.contentType !== undefined) {
      this.validateContentType(data.contentType);
    }

    // Validate encoding if provided
    if (data.encoding !== undefined) {
      this.validateEncoding(data.encoding);
    }

    // Validate content hash if provided
    if (data.contentHash !== undefined) {
      this.validateContentHash(data.contentHash);
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

  private validateContentType(contentType: string): void {
    if (typeof contentType !== 'string') {
      throw new Error('Content type must be a string');
    }

    // Basic MIME type validation
    if (!/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/.test(contentType)) {
      throw new Error('Invalid content type format');
    }
  }

  private validateEncoding(encoding: string): void {
    if (typeof encoding !== 'string') {
      throw new Error('Encoding must be a string');
    }

    const validEncodings = [
      'utf-8', 'utf-16', 'ascii', 'binary', 'base64', 'hex',
      'latin1', 'ucs2', 'utf16le', 'cp1252', 'iso-8859-1'
    ];

    if (!validEncodings.includes(encoding.toLowerCase())) {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }
  }

  private validateContentHash(hash: string): void {
    if (typeof hash !== 'string') {
      throw new Error('Content hash must be a string');
    }

    // Validate SHA-256 hash format
    if (!/^sha256:[a-f0-9]{64}$/i.test(hash)) {
      throw new Error('Content hash must be in format "sha256:hex64"');
    }
  }

  // Utility methods
  getExtension(): string {
    const lastDotIndex = this.name.lastIndexOf('.');
    return lastDotIndex !== -1 ? this.name.substring(lastDotIndex + 1) : '';
  }

  getFileNameWithoutExtension(): string {
    const lastDotIndex = this.name.lastIndexOf('.');
    return lastDotIndex !== -1 ? this.name.substring(0, lastDotIndex) : this.name;
  }

  getRelativePath(basePath: string): string {
    if (!this.path.startsWith(basePath)) {
      throw new Error('File path does not start with base path');
    }
    return this.path.substring(basePath.length);
  }

  isInDirectory(directoryPath: string): boolean {
    return this.path.startsWith(directoryPath + '/') || this.directoryPath === directoryPath;
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

  isTextFile(): boolean {
    if (!this._data.contentType) {
      return false;
    }
    return this._data.contentType.startsWith('text/') ||
           this._data.contentType === 'application/json' ||
           this._data.contentType === 'application/xml' ||
           this._data.contentType === 'application/yaml';
  }

  isBinaryFile(): boolean {
    if (!this._data.contentType) {
      return false;
    }
    return this._data.contentType.startsWith('application/octet-stream') ||
           this._data.contentType.startsWith('image/') ||
           this._data.contentType.startsWith('video/') ||
           this._data.contentType.startsWith('audio/') ||
           this._data.contentType.startsWith('application/zip') ||
           this._data.contentType.startsWith('application/pdf');
  }

  getHumanReadableSize(): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = this._data.size;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
  }

  // Static factory methods
  static createFromFileSystem(
    path: string,
    stats: any,
    permissions: PermissionInfo,
    contentType?: string,
    encoding?: string
  ): File {
    const pathParts = path.split('/');
    const name = pathParts[pathParts.length - 1];
    const directoryPath = pathParts.slice(0, -1).join('/') || '/';

    return new File({
      path,
      name,
      directoryPath,
      size: stats.size || 0,
      permissions,
      modifiedTime: stats.mtime || new Date(),
      createdTime: stats.birthtime || stats.ctime || new Date(),
      contentType,
      encoding,
      isSymbolicLink: stats.isSymbolicLink() || false,
      targetPath: stats.isSymbolicLink() ? stats.targetPath : undefined,
      isAccessible: true,
      isReadable: permissions.readable,
    });
  }

  static createInaccessible(path: string): File {
    const pathParts = path.split('/');
    const name = pathParts[pathParts.length - 1];
    const directoryPath = pathParts.slice(0, -1).join('/') || '/';

    return new File({
      path,
      name,
      directoryPath,
      size: 0,
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
      isSymbolicLink: false,
      isAccessible: false,
      isReadable: false,
    });
  }

  static createWithContent(
    path: string,
    stats: any,
    permissions: PermissionInfo,
    content: string,
    contentType?: string,
    encoding?: string
  ): File {
    const file = File.createFromFileSystem(path, stats, permissions, contentType, encoding);
    
    // Generate content hash if content is provided
    if (content && typeof content === 'string') {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      file.updateContentHash(`sha256:${hash}`);
    }

    return file;
  }
}
