/**
 * Check Permissions Tool
 *
 * MCP tool for checking user permissions on files and directories.
 * Implements comprehensive permission validation with security auditing.
 */
import { PathValidationService } from '../services/PathValidationService';
import { AuditLoggingService } from '../services/AuditLoggingService';
import { Configuration } from '../models/Configuration';
export interface CheckPermissionsToolOptions {
    path: string;
    operation: 'read' | 'write' | 'execute' | 'list';
    userId?: string;
    userGroups?: string[];
    clientId?: string;
    clientType?: string;
    ipAddress?: string;
    sessionId?: string;
    includeFilePermissions?: boolean;
    includeUserPermissions?: boolean;
    includeRequiredPermissions?: boolean;
}
export interface CheckPermissionsToolResult {
    success: boolean;
    allowed: boolean;
    reason?: string;
    errorCode?: string;
    path: string;
    operation: string;
    userId: string;
    requiredPermissions: string[];
    userPermissions: string[];
    filePermissions: any;
    executionTime: number;
    error?: string;
}
export declare class CheckPermissionsTool {
    private permissionService;
    constructor(config: Configuration, pathValidationService: PathValidationService, auditLoggingService: AuditLoggingService);
    /**
     * Checks permissions for a single operation
     */
    execute(options: CheckPermissionsToolOptions, context: {
        userId: string;
        clientId: string;
        clientType: string;
        ipAddress?: string;
        sessionId?: string;
    }): Promise<CheckPermissionsToolResult>;
    /**
     * Checks multiple permissions in batch
     */
    checkBatchPermissions(requests: Array<{
        path: string;
        operation: 'read' | 'write' | 'execute' | 'list';
        userId?: string;
    }>, context: {
        userId: string;
        clientId: string;
        clientType: string;
        ipAddress?: string;
        sessionId?: string;
    }): Promise<Array<CheckPermissionsToolResult>>;
    /**
     * Gets detailed permission information for a path
     */
    getDetailedPermissions(path: string, userId: string, context: {
        clientId: string;
        clientType: string;
        ipAddress?: string;
        sessionId?: string;
    }): Promise<{
        success: boolean;
        path: string;
        userId: string;
        permissions: {
            read: boolean;
            write: boolean;
            execute: boolean;
            list: boolean;
        };
        filePermissions: any;
        userPermissions: any;
        executionTime: number;
        error?: string;
    }>;
    /**
     * Gets permission statistics
     */
    getPermissionStats(): any;
    /**
     * Validates tool options
     */
    private validateOptions;
    /**
     * Validates batch requests
     */
    private validateBatchRequests;
    /**
     * Gets tool metadata
     */
    static getMetadata(): any;
}
//# sourceMappingURL=CheckPermissionsTool.d.ts.map