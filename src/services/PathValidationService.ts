/**
 * Path Validation Service
 * 
 * Implements security-first path validation with comprehensive checks.
 * Prevents directory traversal attacks and enforces security boundaries.
 */

import { Configuration } from '../models/Configuration';

export interface PathValidationResult {
  isValid: boolean;
  canonicalPath?: string;
  errorCode?: string;
  errorMessage?: string;
  securityViolations?: string[];
}

export interface PathValidationOptions {
  allowSymbolicLinks?: boolean;
  maxDepth?: number;
  checkPermissions?: boolean;
  strictMode?: boolean;
}

export class PathValidationService {
  private config: Configuration;

  constructor(config: Configuration) {
    this.config = config;
  }

  /**
   * Validates and canonicalizes a file system path
   */
  validatePath(
    path: string,
    options: PathValidationOptions = {}
  ): PathValidationResult {
    try {
      // Basic validation
      const basicValidation = this.validateBasicPathFormat(path);
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // Canonicalize path
      const canonicalPath = this.canonicalizePath(path);
      
      // Security validation
      const securityValidation = this.validateSecurityConstraints(canonicalPath, options);
      if (!securityValidation.isValid) {
        return securityValidation;
      }

      // Configuration-based validation
      const configValidation = this.validateConfigurationConstraints(canonicalPath);
      if (!configValidation.isValid) {
        return configValidation;
      }

      return {
        isValid: true,
        canonicalPath,
      };
    } catch (error) {
      return {
        isValid: false,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  /**
   * Validates multiple paths in batch
   */
  validatePaths(
    paths: string[],
    options: PathValidationOptions = {}
  ): Map<string, PathValidationResult> {
    const results = new Map<string, PathValidationResult>();
    
    for (const path of paths) {
      results.set(path, this.validatePath(path, options));
    }
    
    return results;
  }

  /**
   * Checks if a path is allowed by configuration
   */
  isPathAllowed(path: string): boolean {
    return this.config.isPathAllowed(path);
  }

  /**
   * Checks if a path is denied by configuration
   */
  isPathDenied(path: string): boolean {
    return this.config.isPathDenied(path);
  }

  /**
   * Gets the relative path from a base path
   */
  getRelativePath(absolutePath: string, basePath: string): string {
    this.validateBasicPathFormat(absolutePath);
    this.validateBasicPathFormat(basePath);

    if (!absolutePath.startsWith(basePath)) {
      throw new Error('Absolute path does not start with base path');
    }

    const relativePath = absolutePath.substring(basePath.length);
    return relativePath || '/';
  }

  /**
   * Checks if a path is within allowed depth
   */
  isWithinDepthLimit(path: string, maxDepth?: number): boolean {
    const depth = this.getPathDepth(path);
    const limit = maxDepth || this.config.security.maxDirectoryDepth;
    return depth <= limit;
  }

  /**
   * Gets the depth of a path
   */
  getPathDepth(path: string): number {
    const canonicalPath = this.canonicalizePath(path);
    return canonicalPath.split('/').filter(segment => segment.length > 0).length;
  }

  /**
   * Checks if a path contains symbolic links
   */
  containsSymbolicLinks(path: string): boolean {
    // This would require file system access to check actual symbolic links
    // For now, we'll do basic pattern matching
    const segments = path.split('/');
    return segments.some(segment => segment.includes('->') || segment.startsWith('symlink_'));
  }

  /**
   * Sanitizes a path by removing dangerous characters
   */
  sanitizePath(path: string): string {
    if (!path || typeof path !== 'string') {
      throw new Error('Path must be a non-empty string');
    }

    // Remove null bytes
    let sanitized = path.replace(/\x00/g, '');

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

    // Normalize slashes
    sanitized = sanitized.replace(/\/+/g, '/');

    // Remove trailing slashes (except for root)
    if (sanitized !== '/' && sanitized.endsWith('/')) {
      sanitized = sanitized.slice(0, -1);
    }

    return sanitized;
  }

  /**
   * Updates configuration
   */
  updateConfiguration(config: Configuration): void {
    this.config = config;
  }

  // Private methods

  private validateBasicPathFormat(path: string): PathValidationResult {
    if (!path || typeof path !== 'string') {
      return {
        isValid: false,
        errorCode: 'INVALID_PATH',
        errorMessage: 'Path is required and must be a string',
      };
    }

    if (path.length === 0) {
      return {
        isValid: false,
        errorCode: 'INVALID_PATH',
        errorMessage: 'Path cannot be empty',
      };
    }

    if (path.length > 4096) {
      return {
        isValid: false,
        errorCode: 'INVALID_PATH',
        errorMessage: 'Path too long (max 4096 characters)',
      };
    }

    // Check for null bytes
    if (path.includes('\x00')) {
      return {
        isValid: false,
        errorCode: 'SECURITY_VIOLATION',
        errorMessage: 'Path contains null bytes',
        securityViolations: ['null_bytes'],
      };
    }

    // Check for control characters
    if (/[\x00-\x1f\x7f]/.test(path)) {
      return {
        isValid: false,
        errorCode: 'SECURITY_VIOLATION',
        errorMessage: 'Path contains control characters',
        securityViolations: ['control_characters'],
      };
    }

    // Check for directory traversal attempts
    if (path.includes('..') || path.includes('~')) {
      return {
        isValid: false,
        errorCode: 'SECURITY_VIOLATION',
        errorMessage: 'Path contains directory traversal sequences',
        securityViolations: ['directory_traversal'],
      };
    }

    return { isValid: true };
  }

  private validateSecurityConstraints(
    path: string,
    options: PathValidationOptions
  ): PathValidationResult {
    const violations: string[] = [];

    // Check for absolute path requirement
    if (!path.startsWith('/')) {
      return {
        isValid: false,
        errorCode: 'INVALID_PATH',
        errorMessage: 'Path must be absolute (start with /)',
      };
    }

    // Check for double slashes
    if (path.includes('//')) {
      return {
        isValid: false,
        errorCode: 'INVALID_PATH',
        errorMessage: 'Path contains double slashes',
      };
    }

    // Check for symbolic links if not allowed
    if (!options.allowSymbolicLinks && this.config.security.allowSymbolicLinks === false) {
      if (this.containsSymbolicLinks(path)) {
        violations.push('symbolic_links');
      }
    }

    // Check depth limit
    if (options.maxDepth !== undefined || options.strictMode) {
      const maxDepth = options.maxDepth || this.config.security.maxDirectoryDepth;
      const depth = this.getPathDepth(path);
      if (depth > maxDepth) {
        return {
          isValid: false,
          errorCode: 'DEPTH_LIMIT_EXCEEDED',
          errorMessage: `Path exceeds maximum depth of ${maxDepth}`,
        };
      }
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /\/proc\//,
      /\/sys\//,
      /\/dev\//,
      /\/etc\//,
      /\/root\//,
      /\/boot\//,
      /\/var\/log\//,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(path)) {
        violations.push('system_path_access');
      }
    }

    if (violations.length > 0) {
      return {
        isValid: false,
        errorCode: 'SECURITY_VIOLATION',
        errorMessage: 'Path violates security constraints',
        securityViolations: violations,
      };
    }

    return { isValid: true };
  }

  private validateConfigurationConstraints(path: string): PathValidationResult {
    // Check if path is explicitly denied
    if (this.config.isPathDenied(path)) {
      return {
        isValid: false,
        errorCode: 'PERMISSION_DENIED',
        errorMessage: 'Path is in denied list',
      };
    }

    // Check if path is allowed (if allowed paths are configured)
    if (!this.config.isPathAllowed(path)) {
      return {
        isValid: false,
        errorCode: 'PERMISSION_DENIED',
        errorMessage: 'Path is not in allowed list',
      };
    }

    return { isValid: true };
  }

  private canonicalizePath(path: string): string {
    // Remove leading/trailing whitespace
    let canonical = path.trim();

    // Normalize slashes
    canonical = canonical.replace(/\/+/g, '/');

    // Handle special cases
    if (canonical === '') {
      canonical = '/';
    }

    // Remove trailing slash (except for root)
    if (canonical !== '/' && canonical.endsWith('/')) {
      canonical = canonical.slice(0, -1);
    }

    // Handle relative path segments
    const segments = canonical.split('/').filter(segment => segment !== '.');
    
    // Remove empty segments and handle '..' (should not exist after validation)
    const normalizedSegments: string[] = [];
    for (const segment of segments) {
      if (segment === '..') {
        // This should not happen after security validation, but handle gracefully
        if (normalizedSegments.length > 0) {
          normalizedSegments.pop();
        }
      } else if (segment !== '') {
        normalizedSegments.push(segment);
      }
    }

    // Reconstruct path
    canonical = '/' + normalizedSegments.join('/');

    // Handle edge case where all segments were removed
    if (canonical === '') {
      canonical = '/';
    }

    return canonical;
  }

  /**
   * Validates path for specific operations
   */
  validatePathForOperation(
    path: string,
    operation: 'read' | 'write' | 'execute' | 'list',
    options: PathValidationOptions = {}
  ): PathValidationResult {
    const baseValidation = this.validatePath(path, options);
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Additional operation-specific validation
    switch (operation) {
      case 'read':
        return this.validateForRead(baseValidation.canonicalPath!, options);
      case 'write':
        return this.validateForWrite(baseValidation.canonicalPath!, options);
      case 'execute':
        return this.validateForExecute(baseValidation.canonicalPath!, options);
      case 'list':
        return this.validateForList(baseValidation.canonicalPath!, options);
      default:
        return {
          isValid: false,
          errorCode: 'INVALID_OPERATION',
          errorMessage: `Unknown operation: ${operation}`,
        };
    }
  }

  private validateForRead(path: string, options: PathValidationOptions): PathValidationResult {
    // Additional read-specific validation could go here
    return { isValid: true, canonicalPath: path };
  }

  private validateForWrite(path: string, options: PathValidationOptions): PathValidationResult {
    // Additional write-specific validation could go here
    // For example, checking if parent directory is writable
    return { isValid: true, canonicalPath: path };
  }

  private validateForExecute(path: string, options: PathValidationOptions): PathValidationResult {
    // Additional execute-specific validation could go here
    // For example, checking file extensions, shebangs, etc.
    return { isValid: true, canonicalPath: path };
  }

  private validateForList(path: string, options: PathValidationOptions): PathValidationResult {
    // Additional list-specific validation could go here
    // For example, checking if it's actually a directory
    return { isValid: true, canonicalPath: path };
  }

  /**
   * Static utility methods
   */
  static isAbsolutePath(path: string): boolean {
    return path.startsWith('/');
  }

  static isRelativePath(path: string): boolean {
    return !PathValidationService.isAbsolutePath(path);
  }

  static getPathSegments(path: string): string[] {
    return path.split('/').filter(segment => segment.length > 0);
  }

  static getParentPath(path: string): string {
    if (path === '/') {
      return '/';
    }
    const lastSlashIndex = path.lastIndexOf('/');
    return lastSlashIndex === 0 ? '/' : path.substring(0, lastSlashIndex);
  }

  static getFileName(path: string): string {
    if (path === '/') {
      return '/';
    }
    const lastSlashIndex = path.lastIndexOf('/');
    return path.substring(lastSlashIndex + 1);
  }

  static getFileExtension(path: string): string {
    const fileName = PathValidationService.getFileName(path);
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.substring(lastDotIndex + 1) : '';
  }

  static getFileNameWithoutExtension(path: string): string {
    const fileName = PathValidationService.getFileName(path);
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
  }

  static joinPaths(...paths: string[]): string {
    const validPaths = paths.filter(path => path && path.length > 0);
    if (validPaths.length === 0) {
      return '/';
    }

    let result = validPaths[0];
    for (let i = 1; i < validPaths.length; i++) {
      const path = validPaths[i];
      if (result.endsWith('/') && path.startsWith('/')) {
        result = result + path.substring(1);
      } else if (!result.endsWith('/') && !path.startsWith('/')) {
        result = result + '/' + path;
      } else {
        result = result + path;
      }
    }

    // Normalize the result
    result = result.replace(/\/+/g, '/');
    if (result !== '/' && result.endsWith('/')) {
      result = result.slice(0, -1);
    }

    return result;
  }
}
