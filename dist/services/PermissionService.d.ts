/**
 * Permission Service
 *
 * Implements security-first permission checking with comprehensive validation.
 * Enforces access control and permission boundaries.
 */
import { Configuration } from '../models/Configuration';
import { PermissionInfo } from '../models/PermissionInfo';
import { PathValidationService } from './PathValidationService';
export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
    errorCode?: string;
    requiredPermissions?: string[];
    userPermissions?: PermissionInfo;
    filePermissions?: PermissionInfo;
}
export interface PermissionContext {
    userId: string;
    userGroups: string[];
    clientId: string;
    clientType: string;
    operation: 'read' | 'write' | 'execute' | 'list';
    targetPath: string;
    ipAddress?: string;
    sessionId?: string;
}
export interface UserPermissions {
    userId: string;
    groups: string[];
    permissions: {
        read: boolean;
        write: boolean;
        execute: boolean;
        admin: boolean;
    };
    allowedPaths: string[];
    deniedPaths: string[];
    maxFileSize: string;
    allowedOperations: string[];
}
export declare class PermissionService {
    private config;
    private pathValidationService;
    private userPermissions;
    constructor(config: Configuration, pathValidationService: PathValidationService);
    /**
     * Checks if a user has permission to perform an operation on a path
     */
    checkPermission(context: PermissionContext): Promise<PermissionCheckResult>;
    /**
     * Checks permissions for multiple operations in batch
     */
    checkPermissions(contexts: PermissionContext[]): Promise<Map<string, PermissionCheckResult>>;
    /**
     * Gets user permissions
     */
    getUserPermissions(userId: string): UserPermissions | undefined;
    /**
     * Sets user permissions
     */
    setUserPermissions(userId: string, permissions: UserPermissions): void;
    /**
     * Removes user permissions
     */
    removeUserPermissions(userId: string): void;
    /**
     * Checks if user has admin permissions
     */
    isUserAdmin(userId: string): boolean;
    /**
     * Checks if user can access a specific path
     */
    canUserAccessPath(userId: string, path: string): boolean;
    /**
     * Updates configuration
     */
    updateConfiguration(config: Configuration): void;
    /**
     * Updates path validation service
     */
    updatePathValidationService(pathValidationService: PathValidationService): void;
    private validateContext;
    private checkPathPermissions;
    private checkOperationPermissions;
    private checkFileSystemPermissions;
    private simulateFileSystemPermissionCheck;
    private validateUserPermissions;
    private initializeDefaultPermissions;
    /**
     * Static utility methods
     */
    static createDefaultUserPermissions(userId: string): UserPermissions;
    static createAdminUserPermissions(userId: string): UserPermissions;
    static createReadOnlyUserPermissions(userId: string): UserPermissions;
    static createRestrictedUserPermissions(userId: string): UserPermissions;
}
//# sourceMappingURL=PermissionService.d.ts.map