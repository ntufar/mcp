"use strict";
/**
 * Permission Service
 *
 * Implements security-first permission checking with comprehensive validation.
 * Enforces access control and permission boundaries.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionService = void 0;
class PermissionService {
    config;
    pathValidationService;
    userPermissions = new Map();
    constructor(config, pathValidationService) {
        this.config = config;
        this.pathValidationService = pathValidationService;
        this.initializeDefaultPermissions();
    }
    /**
     * Checks if a user has permission to perform an operation on a path
     */
    async checkPermission(context) {
        try {
            // Validate context
            const contextValidation = this.validateContext(context);
            if (!contextValidation.valid) {
                return {
                    allowed: false,
                    reason: contextValidation.error,
                    errorCode: 'INVALID_CONTEXT',
                };
            }
            // Validate path
            const pathValidation = this.pathValidationService.validatePathForOperation(context.targetPath, context.operation);
            if (!pathValidation.isValid) {
                return {
                    allowed: false,
                    reason: pathValidation.errorMessage,
                    errorCode: pathValidation.errorCode,
                };
            }
            // Check user permissions
            const userPermissions = this.getUserPermissions(context.userId);
            if (!userPermissions) {
                return {
                    allowed: false,
                    reason: 'User not found or has no permissions',
                    errorCode: 'USER_NOT_FOUND',
                };
            }
            // Check path-based permissions
            const pathPermissionCheck = this.checkPathPermissions(context, userPermissions);
            if (!pathPermissionCheck.allowed) {
                return pathPermissionCheck;
            }
            // Check operation permissions
            const operationPermissionCheck = this.checkOperationPermissions(context, userPermissions);
            if (!operationPermissionCheck.allowed) {
                return operationPermissionCheck;
            }
            // Check file system permissions (if available)
            const fileSystemPermissionCheck = await this.checkFileSystemPermissions(context);
            if (!fileSystemPermissionCheck.allowed) {
                return fileSystemPermissionCheck;
            }
            return {
                allowed: true,
                userPermissions: userPermissions.permissions,
            };
        }
        catch (error) {
            return {
                allowed: false,
                reason: error instanceof Error ? error.message : 'Unknown permission error',
                errorCode: 'PERMISSION_ERROR',
            };
        }
    }
    /**
     * Checks permissions for multiple operations in batch
     */
    async checkPermissions(contexts) {
        const results = new Map();
        // Process in parallel for better performance
        const promises = contexts.map(async (context, index) => {
            const result = await this.checkPermission(context);
            results.set(`${context.userId}:${context.operation}:${context.targetPath}:${index}`, result);
        });
        await Promise.all(promises);
        return results;
    }
    /**
     * Gets user permissions
     */
    getUserPermissions(userId) {
        return this.userPermissions.get(userId);
    }
    /**
     * Sets user permissions
     */
    setUserPermissions(userId, permissions) {
        this.validateUserPermissions(permissions);
        this.userPermissions.set(userId, permissions);
    }
    /**
     * Removes user permissions
     */
    removeUserPermissions(userId) {
        this.userPermissions.delete(userId);
    }
    /**
     * Checks if user has admin permissions
     */
    isUserAdmin(userId) {
        const userPermissions = this.getUserPermissions(userId);
        return userPermissions?.permissions.admin || false;
    }
    /**
     * Checks if user can access a specific path
     */
    canUserAccessPath(userId, path) {
        const userPermissions = this.getUserPermissions(userId);
        if (!userPermissions) {
            return false;
        }
        // Check denied paths first
        for (const deniedPath of userPermissions.deniedPaths) {
            if (path.startsWith(deniedPath)) {
                return false;
            }
        }
        // Check allowed paths
        if (userPermissions.allowedPaths.length === 0) {
            return true; // No restrictions
        }
        for (const allowedPath of userPermissions.allowedPaths) {
            if (path.startsWith(allowedPath)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Updates configuration
     */
    updateConfiguration(config) {
        this.config = config;
    }
    /**
     * Updates path validation service
     */
    updatePathValidationService(pathValidationService) {
        this.pathValidationService = pathValidationService;
    }
    // Private methods
    validateContext(context) {
        if (!context.userId || typeof context.userId !== 'string') {
            return { valid: false, error: 'User ID is required' };
        }
        if (!context.clientId || typeof context.clientId !== 'string') {
            return { valid: false, error: 'Client ID is required' };
        }
        if (!context.clientType || typeof context.clientType !== 'string') {
            return { valid: false, error: 'Client type is required' };
        }
        if (!['read', 'write', 'execute', 'list'].includes(context.operation)) {
            return { valid: false, error: 'Invalid operation' };
        }
        if (!context.targetPath || typeof context.targetPath !== 'string') {
            return { valid: false, error: 'Target path is required' };
        }
        if (context.userGroups && !Array.isArray(context.userGroups)) {
            return { valid: false, error: 'User groups must be an array' };
        }
        return { valid: true };
    }
    checkPathPermissions(context, userPermissions) {
        // Check if path is in user's denied list
        for (const deniedPath of userPermissions.deniedPaths) {
            if (context.targetPath.startsWith(deniedPath)) {
                return {
                    allowed: false,
                    reason: 'Path is in user denied list',
                    errorCode: 'PATH_DENIED',
                    requiredPermissions: ['path_access'],
                };
            }
        }
        // Check if path is in user's allowed list (if configured)
        if (userPermissions.allowedPaths.length > 0) {
            let pathAllowed = false;
            for (const allowedPath of userPermissions.allowedPaths) {
                if (context.targetPath.startsWith(allowedPath)) {
                    pathAllowed = true;
                    break;
                }
            }
            if (!pathAllowed) {
                return {
                    allowed: false,
                    reason: 'Path is not in user allowed list',
                    errorCode: 'PATH_NOT_ALLOWED',
                    requiredPermissions: ['path_access'],
                };
            }
        }
        // Check global configuration
        if (this.config.isPathDenied(context.targetPath)) {
            return {
                allowed: false,
                reason: 'Path is globally denied',
                errorCode: 'PATH_GLOBALLY_DENIED',
                requiredPermissions: ['global_path_access'],
            };
        }
        if (!this.config.isPathAllowed(context.targetPath)) {
            return {
                allowed: false,
                reason: 'Path is not globally allowed',
                errorCode: 'PATH_NOT_GLOBALLY_ALLOWED',
                requiredPermissions: ['global_path_access'],
            };
        }
        return { allowed: true };
    }
    checkOperationPermissions(context, userPermissions) {
        // Check if operation is in user's allowed operations
        if (userPermissions.allowedOperations.length > 0) {
            if (!userPermissions.allowedOperations.includes(context.operation)) {
                return {
                    allowed: false,
                    reason: 'Operation not allowed for user',
                    errorCode: 'OPERATION_NOT_ALLOWED',
                    requiredPermissions: [context.operation],
                };
            }
        }
        // Check specific operation permissions
        switch (context.operation) {
            case 'read':
                if (!userPermissions.permissions.read) {
                    return {
                        allowed: false,
                        reason: 'User does not have read permissions',
                        errorCode: 'READ_PERMISSION_DENIED',
                        requiredPermissions: ['read'],
                    };
                }
                break;
            case 'write':
                if (!userPermissions.permissions.write) {
                    return {
                        allowed: false,
                        reason: 'User does not have write permissions',
                        errorCode: 'WRITE_PERMISSION_DENIED',
                        requiredPermissions: ['write'],
                    };
                }
                break;
            case 'execute':
                if (!userPermissions.permissions.execute) {
                    return {
                        allowed: false,
                        reason: 'User does not have execute permissions',
                        errorCode: 'EXECUTE_PERMISSION_DENIED',
                        requiredPermissions: ['execute'],
                    };
                }
                break;
            case 'list':
                if (!userPermissions.permissions.read) {
                    return {
                        allowed: false,
                        reason: 'User does not have read permissions for listing',
                        errorCode: 'LIST_PERMISSION_DENIED',
                        requiredPermissions: ['read'],
                    };
                }
                break;
        }
        return { allowed: true };
    }
    async checkFileSystemPermissions(context) {
        // This would integrate with actual file system permission checking
        // For now, we'll simulate the check
        try {
            // Simulate file system permission check
            const hasPermission = await this.simulateFileSystemPermissionCheck(context);
            if (!hasPermission) {
                return {
                    allowed: false,
                    reason: 'File system permission denied',
                    errorCode: 'FILE_SYSTEM_PERMISSION_DENIED',
                    requiredPermissions: [context.operation],
                };
            }
            return { allowed: true };
        }
        catch (error) {
            return {
                allowed: false,
                reason: 'Error checking file system permissions',
                errorCode: 'FILE_SYSTEM_ERROR',
            };
        }
    }
    async simulateFileSystemPermissionCheck(context) {
        // This is a simulation - in a real implementation, this would check actual file system permissions
        // For now, we'll return true for most cases, false for some restricted paths
        const restrictedPaths = ['/etc', '/root', '/proc', '/sys', '/dev'];
        for (const restrictedPath of restrictedPaths) {
            if (context.targetPath.startsWith(restrictedPath)) {
                return false;
            }
        }
        return true;
    }
    validateUserPermissions(permissions) {
        if (!permissions.userId || typeof permissions.userId !== 'string') {
            throw new Error('User ID is required');
        }
        if (!Array.isArray(permissions.groups)) {
            throw new Error('Groups must be an array');
        }
        if (!permissions.permissions || typeof permissions.permissions !== 'object') {
            throw new Error('Permissions object is required');
        }
        const requiredPermissionKeys = ['read', 'write', 'execute', 'admin'];
        for (const key of requiredPermissionKeys) {
            if (typeof permissions.permissions[key] !== 'boolean') {
                throw new Error(`Permission ${key} must be a boolean`);
            }
        }
        if (!Array.isArray(permissions.allowedPaths)) {
            throw new Error('Allowed paths must be an array');
        }
        if (!Array.isArray(permissions.deniedPaths)) {
            throw new Error('Denied paths must be an array');
        }
        if (typeof permissions.maxFileSize !== 'string') {
            throw new Error('Max file size must be a string');
        }
        if (!Array.isArray(permissions.allowedOperations)) {
            throw new Error('Allowed operations must be an array');
        }
    }
    initializeDefaultPermissions() {
        // Initialize with some default permissions for testing
        const defaultUser = {
            userId: 'default',
            groups: ['users'],
            permissions: {
                read: true,
                write: false,
                execute: false,
                admin: false,
            },
            allowedPaths: ['/home', '/tmp'],
            deniedPaths: ['/etc', '/root', '/proc', '/sys', '/dev'],
            maxFileSize: '10MB',
            allowedOperations: ['read', 'list'],
        };
        const adminUser = {
            userId: 'admin',
            groups: ['admin', 'users'],
            permissions: {
                read: true,
                write: true,
                execute: true,
                admin: true,
            },
            allowedPaths: [], // No restrictions
            deniedPaths: [], // No restrictions
            maxFileSize: '1GB',
            allowedOperations: ['read', 'write', 'execute', 'list'],
        };
        this.userPermissions.set('default', defaultUser);
        this.userPermissions.set('admin', adminUser);
    }
    /**
     * Static utility methods
     */
    static createDefaultUserPermissions(userId) {
        return {
            userId,
            groups: ['users'],
            permissions: {
                read: true,
                write: false,
                execute: false,
                admin: false,
            },
            allowedPaths: ['/home', '/tmp'],
            deniedPaths: ['/etc', '/root', '/proc', '/sys', '/dev'],
            maxFileSize: '10MB',
            allowedOperations: ['read', 'list'],
        };
    }
    static createAdminUserPermissions(userId) {
        return {
            userId,
            groups: ['admin', 'users'],
            permissions: {
                read: true,
                write: true,
                execute: true,
                admin: true,
            },
            allowedPaths: [], // No restrictions
            deniedPaths: [], // No restrictions
            maxFileSize: '1GB',
            allowedOperations: ['read', 'write', 'execute', 'list'],
        };
    }
    static createReadOnlyUserPermissions(userId) {
        return {
            userId,
            groups: ['readonly'],
            permissions: {
                read: true,
                write: false,
                execute: false,
                admin: false,
            },
            allowedPaths: ['/home', '/tmp'],
            deniedPaths: ['/etc', '/root', '/proc', '/sys', '/dev', '/home/*/private'],
            maxFileSize: '5MB',
            allowedOperations: ['read', 'list'],
        };
    }
    static createRestrictedUserPermissions(userId) {
        return {
            userId,
            groups: ['restricted'],
            permissions: {
                read: false,
                write: false,
                execute: false,
                admin: false,
            },
            allowedPaths: [],
            deniedPaths: ['/'],
            maxFileSize: '0B',
            allowedOperations: [],
        };
    }
}
exports.PermissionService = PermissionService;
//# sourceMappingURL=PermissionService.js.map