/**
 * Check Permissions Tool
 * 
 * MCP tool for checking user permissions on files and directories.
 * Implements comprehensive permission validation with security auditing.
 */

import { PermissionService } from '../services/PermissionService';
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

export class CheckPermissionsTool {
  private permissionService: PermissionService;

  constructor(
    config: Configuration,
    pathValidationService: PathValidationService,
    auditLoggingService: AuditLoggingService
  ) {
    this.permissionService = new PermissionService(
      config,
      pathValidationService
    );
  }

  /**
   * Checks permissions for a single operation
   */
  async execute(
    options: CheckPermissionsToolOptions,
    context: {
      userId: string;
      clientId: string;
      clientType: string;
      ipAddress?: string;
      sessionId?: string;
    }
  ): Promise<CheckPermissionsToolResult> {
    const startTime = Date.now();
    
    try {
      this.validateOptions(options);

      const permissionCheck = await this.permissionService.checkPermission({
        userId: options.userId || context.userId,
        userGroups: options.userGroups || [],
        clientId: options.clientId || context.clientId,
        clientType: options.clientType || context.clientType,
        operation: options.operation,
        targetPath: options.path,
        ipAddress: options.ipAddress || context.ipAddress,
        sessionId: options.sessionId || context.sessionId,
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        allowed: permissionCheck.allowed,
        reason: permissionCheck.reason,
        errorCode: permissionCheck.errorCode,
        path: options.path,
        operation: options.operation,
        userId: options.userId || context.userId,
        requiredPermissions: permissionCheck.requiredPermissions || [],
        userPermissions: permissionCheck.userPermissions || [],
        filePermissions: options.includeFilePermissions ? permissionCheck.filePermissions : undefined,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        allowed: false,
        path: options.path,
        operation: options.operation,
        userId: options.userId || 'unknown',
        requiredPermissions: [],
        userPermissions: [],
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Checks multiple permissions in batch
   */
  async checkBatchPermissions(
    requests: Array<{
      path: string;
      operation: 'read' | 'write' | 'execute' | 'list';
      userId?: string;
    }>,
    context: {
      userId: string;
      clientId: string;
      clientType: string;
      ipAddress?: string;
      sessionId?: string;
    }
  ): Promise<Array<CheckPermissionsToolResult>> {
    const startTime = Date.now();
    const results: CheckPermissionsToolResult[] = [];

    try {
      this.validateBatchRequests(requests);

      // Process requests in parallel
      const promises = requests.map(async (request) => {
        const options: CheckPermissionsToolOptions = {
          path: request.path,
          operation: request.operation,
          userId: request.userId || context.userId,
          userGroups: [],
          clientId: context.clientId,
          clientType: context.clientType,
          ipAddress: context.ipAddress,
          sessionId: context.sessionId,
        };

        return this.execute(options, context);
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      return results;
    } catch (error) {
      // If batch processing fails, return error for all requests
      return requests.map(request => ({
        success: false,
        allowed: false,
        path: request.path,
        operation: request.operation,
        userId: request.userId || context.userId,
        requiredPermissions: [],
        userPermissions: [],
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }

  /**
   * Gets detailed permission information for a path
   */
  async getDetailedPermissions(
    path: string,
    userId: string,
    context: {
      clientId: string;
      clientType: string;
      ipAddress?: string;
      sessionId?: string;
    }
  ): Promise<{
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
  }> {
    const startTime = Date.now();
    
    try {
      if (!path || typeof path !== 'string') {
        throw new Error('Path is required and must be a string');
      }

      if (!userId || typeof userId !== 'string') {
        throw new Error('User ID is required and must be a string');
      }

      // Check all permission types
      const operations: Array<'read' | 'write' | 'execute' | 'list'> = ['read', 'write', 'execute', 'list'];
      const permissionResults: { [key: string]: boolean } = {};

      for (const operation of operations) {
        const result = await this.execute(
          {
            path,
            operation,
            userId,
            includeFilePermissions: true,
            includeUserPermissions: true,
            includeRequiredPermissions: true,
          },
          context
        );
        
        permissionResults[operation] = result.allowed;
      }

      // Get detailed file permissions
      const filePermissions = await this.permissionService.getDetailedFilePermissions(path);
      
      // Get user permissions
      const userPermissions = await this.permissionService.getUserPermissions(userId);

      return {
        success: true,
        path,
        userId,
        permissions: {
          read: permissionResults.read,
          write: permissionResults.write,
          execute: permissionResults.execute,
          list: permissionResults.list,
        },
        filePermissions,
        userPermissions,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        path,
        userId,
        permissions: {
          read: false,
          write: false,
          execute: false,
          list: false,
        },
        filePermissions: null,
        userPermissions: null,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gets permission statistics
   */
  getPermissionStats(): any {
    return this.permissionService.getPermissionStats();
  }

  /**
   * Validates tool options
   */
  private validateOptions(options: CheckPermissionsToolOptions): void {
    if (!options.path || typeof options.path !== 'string') {
      throw new Error('Path is required and must be a string');
    }

    if (options.path.length === 0) {
      throw new Error('Path cannot be empty');
    }

    if (!options.operation || typeof options.operation !== 'string') {
      throw new Error('Operation is required and must be a string');
    }

    if (!['read', 'write', 'execute', 'list'].includes(options.operation)) {
      throw new Error('Invalid operation. Must be one of: read, write, execute, list');
    }

    if (options.userId !== undefined && typeof options.userId !== 'string') {
      throw new Error('User ID must be a string');
    }

    if (options.userGroups !== undefined && !Array.isArray(options.userGroups)) {
      throw new Error('User groups must be an array');
    }

    if (options.userGroups) {
      for (const group of options.userGroups) {
        if (typeof group !== 'string') {
          throw new Error('User group must be a string');
        }
      }
    }

    if (options.clientId !== undefined && typeof options.clientId !== 'string') {
      throw new Error('Client ID must be a string');
    }

    if (options.clientType !== undefined && typeof options.clientType !== 'string') {
      throw new Error('Client type must be a string');
    }

    if (options.ipAddress !== undefined && typeof options.ipAddress !== 'string') {
      throw new Error('IP address must be a string');
    }

    if (options.sessionId !== undefined && typeof options.sessionId !== 'string') {
      throw new Error('Session ID must be a string');
    }
  }

  /**
   * Validates batch requests
   */
  private validateBatchRequests(requests: Array<{ path: string; operation: string; userId?: string }>): void {
    if (!Array.isArray(requests)) {
      throw new Error('Requests must be an array');
    }

    if (requests.length === 0) {
      throw new Error('Requests array cannot be empty');
    }

    if (requests.length > 100) {
      throw new Error('Too many requests (max 100)');
    }

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      
      if (!request || typeof request !== 'object') {
        throw new Error(`Request at index ${i} must be an object`);
      }

      if (!request.path || typeof request.path !== 'string') {
        throw new Error(`Request at index ${i}: path is required and must be a string`);
      }

      if (!request.operation || typeof request.operation !== 'string') {
        throw new Error(`Request at index ${i}: operation is required and must be a string`);
      }

      if (!['read', 'write', 'execute', 'list'].includes(request.operation)) {
        throw new Error(`Request at index ${i}: invalid operation. Must be one of: read, write, execute, list`);
      }

      if (request.userId !== undefined && typeof request.userId !== 'string') {
        throw new Error(`Request at index ${i}: user ID must be a string`);
      }
    }
  }

  /**
   * Gets tool metadata
   */
  static getMetadata(): any {
    return {
      name: 'check_permissions',
      description: 'Check if a user has permission to perform an operation on a path',
      version: '1.0.0',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to check permissions for',
            minLength: 1,
          },
          operation: {
            type: 'string',
            enum: ['read', 'write', 'execute', 'list'],
            description: 'Operation to check',
          },
          userId: {
            type: 'string',
            description: 'User ID to check permissions for',
            default: 'current_user',
          },
          userGroups: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'User groups to check permissions for',
          },
          clientId: {
            type: 'string',
            description: 'Client ID making the request',
          },
          clientType: {
            type: 'string',
            description: 'Type of client making the request',
          },
          ipAddress: {
            type: 'string',
            description: 'IP address of the client',
          },
          sessionId: {
            type: 'string',
            description: 'Session ID of the client',
          },
          includeFilePermissions: {
            type: 'boolean',
            description: 'Include detailed file permission information',
            default: false,
          },
          includeUserPermissions: {
            type: 'boolean',
            description: 'Include user permission information',
            default: false,
          },
          includeRequiredPermissions: {
            type: 'boolean',
            description: 'Include required permissions for the operation',
            default: false,
          },
        },
        required: ['path', 'operation'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the operation was successful',
          },
          allowed: {
            type: 'boolean',
            description: 'Whether the permission is granted',
          },
          reason: {
            type: 'string',
            description: 'Reason for the permission decision',
          },
          errorCode: {
            type: 'string',
            description: 'Error code if permission denied',
          },
          path: {
            type: 'string',
            description: 'Path that was checked',
          },
          operation: {
            type: 'string',
            description: 'Operation that was checked',
          },
          userId: {
            type: 'string',
            description: 'User ID that was checked',
          },
          requiredPermissions: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Required permissions for the operation',
          },
          userPermissions: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'User permissions',
          },
          filePermissions: {
            type: 'object',
            description: 'Detailed file permission information',
          },
          executionTime: {
            type: 'number',
            description: 'Execution time in milliseconds',
          },
          error: {
            type: 'string',
            description: 'Error message if operation failed',
          },
        },
        required: ['success', 'allowed', 'path', 'operation', 'userId'],
      },
    };
  }
}
