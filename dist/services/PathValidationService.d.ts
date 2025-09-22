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
export declare class PathValidationService {
    private config;
    constructor(config: Configuration);
    /**
     * Validates and canonicalizes a file system path
     */
    validatePath(path: string, options?: PathValidationOptions): PathValidationResult;
    /**
     * Validates multiple paths in batch
     */
    validatePaths(paths: string[], options?: PathValidationOptions): Map<string, PathValidationResult>;
    /**
     * Checks if a path is allowed by configuration
     */
    isPathAllowed(path: string): boolean;
    /**
     * Checks if a path is denied by configuration
     */
    isPathDenied(path: string): boolean;
    /**
     * Gets the relative path from a base path
     */
    getRelativePath(absolutePath: string, basePath: string): string;
    /**
     * Checks if a path is within allowed depth
     */
    isWithinDepthLimit(path: string, maxDepth?: number): boolean;
    /**
     * Gets the depth of a path
     */
    getPathDepth(path: string): number;
    /**
     * Checks if a path contains symbolic links
     */
    containsSymbolicLinks(path: string): boolean;
    /**
     * Sanitizes a path by removing dangerous characters
     */
    sanitizePath(path: string): string;
    /**
     * Updates configuration
     */
    updateConfiguration(config: Configuration): void;
    private validateBasicPathFormat;
    private validateSecurityConstraints;
    private validateConfigurationConstraints;
    private canonicalizePath;
    /**
     * Validates path for specific operations
     */
    validatePathForOperation(path: string, operation: 'read' | 'write' | 'execute' | 'list', options?: PathValidationOptions): PathValidationResult;
    private validateForRead;
    private validateForWrite;
    private validateForExecute;
    private validateForList;
    /**
     * Static utility methods
     */
    static isAbsolutePath(path: string): boolean;
    static isRelativePath(path: string): boolean;
    static getPathSegments(path: string): string[];
    static getParentPath(path: string): string;
    static getFileName(path: string): string;
    static getFileExtension(path: string): string;
    static getFileNameWithoutExtension(path: string): string;
    static joinPaths(...paths: string[]): string;
}
//# sourceMappingURL=PathValidationService.d.ts.map