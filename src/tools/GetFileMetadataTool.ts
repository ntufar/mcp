/**
 * Get File Metadata Tool
 * 
 * MCP tool for retrieving detailed metadata for files and directories.
 * Implements comprehensive metadata operations with security validation.
 */

import { MetadataService } from '../services/MetadataService';
import { PathValidationService } from '../services/PathValidationService';
import { PermissionService } from '../services/PermissionService';
import { AuditLoggingService } from '../services/AuditLoggingService';
import { Configuration } from '../models/Configuration';

export interface GetFileMetadataToolOptions {
  path: string;
  includeContentHash?: boolean;
  includePermissions?: boolean;
  includeSymlinkTarget?: boolean;
  includeFileTypes?: boolean;
  includeSize?: boolean;
  includeTimestamps?: boolean;
  includeOwnerInfo?: boolean;
  recursive?: boolean;
  maxDepth?: number;
}

export interface GetFileMetadataToolResult {
  success: boolean;
  path: string;
  type: 'file' | 'directory' | 'symlink' | 'unknown';
  exists: boolean;
  accessible: boolean;
  metadata: any;
  error?: string;
  executionTime: number;
  cacheHit: boolean;
}

export class GetFileMetadataTool {
  private metadataService: MetadataService;

  constructor(
    config: Configuration,
    pathValidationService: PathValidationService,
    permissionService: PermissionService,
    auditLoggingService: AuditLoggingService
  ) {
    this.metadataService = new MetadataService(
      config,
      pathValidationService,
      permissionService,
      auditLoggingService
    );
  }

  /**
   * Gets metadata for a single file or directory
   */
  async execute(
    options: GetFileMetadataToolOptions,
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<GetFileMetadataToolResult> {
    try {
      this.validateOptions(options);

      const result = await this.metadataService.getMetadata(
        options.path,
        {
          includeContentHash: options.includeContentHash || false,
          includePermissions: options.includePermissions !== false,
          includeSymlinkTarget: options.includeSymlinkTarget !== false,
          includeFileTypes: options.includeFileTypes !== false,
          includeSize: options.includeSize !== false,
          includeTimestamps: options.includeTimestamps !== false,
          includeOwnerInfo: options.includeOwnerInfo !== false,
          recursive: options.recursive || false,
          maxDepth: options.maxDepth || 1,
        },
        context
      );

      return {
        success: true,
        path: result.path,
        type: result.type,
        exists: result.exists,
        accessible: result.accessible,
        metadata: result.metadata?.toJSON() || null,
        executionTime: result.executionTime,
        cacheHit: result.cacheHit,
      };
    } catch (error) {
      return {
        success: false,
        path: options.path,
        type: 'unknown',
        exists: false,
        accessible: false,
        metadata: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: 0,
        cacheHit: false,
      };
    }
  }

  /**
   * Gets metadata for multiple paths in batch
   */
  async getBatchMetadata(
    paths: string[],
    options: Partial<GetFileMetadataToolOptions> = {},
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<any> {
    try {
      this.validatePaths(paths);

      const result = await this.metadataService.getBatchMetadata(
        paths,
        {
          includeContentHash: options.includeContentHash || false,
          includePermissions: options.includePermissions !== false,
          includeSymlinkTarget: options.includeSymlinkTarget !== false,
          includeFileTypes: options.includeFileTypes !== false,
          includeSize: options.includeSize !== false,
          includeTimestamps: options.includeTimestamps !== false,
          includeOwnerInfo: options.includeOwnerInfo !== false,
          recursive: options.recursive || false,
          maxDepth: options.maxDepth || 1,
        },
        context
      );

      return {
        success: true,
        results: result.results.map(r => ({
          success: r.exists && r.accessible,
          path: r.path,
          type: r.type,
          exists: r.exists,
          accessible: r.accessible,
          metadata: r.metadata?.toJSON() || null,
          error: r.error,
          executionTime: r.executionTime,
          cacheHit: r.cacheHit,
        })),
        totalResults: result.totalResults,
        successfulResults: result.successfulResults,
        failedResults: result.failedResults,
        executionTime: result.executionTime,
        cacheHit: result.cacheHit,
      };
    } catch (error) {
      throw new Error(`Failed to get batch metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets metadata for all items in a directory
   */
  async getDirectoryMetadata(
    directoryPath: string,
    options: Partial<GetFileMetadataToolOptions> = {},
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<any> {
    try {
      if (!directoryPath || typeof directoryPath !== 'string') {
        throw new Error('Directory path is required and must be a string');
      }

      const result = await this.metadataService.getDirectoryMetadata(
        directoryPath,
        {
          includeContentHash: options.includeContentHash || false,
          includePermissions: options.includePermissions !== false,
          includeSymlinkTarget: options.includeSymlinkTarget !== false,
          includeFileTypes: options.includeFileTypes !== false,
          includeSize: options.includeSize !== false,
          includeTimestamps: options.includeTimestamps !== false,
          includeOwnerInfo: options.includeOwnerInfo !== false,
          recursive: options.recursive || false,
          maxDepth: options.maxDepth || 1,
        },
        context
      );

      return {
        success: true,
        results: result.results.map(r => ({
          success: r.exists && r.accessible,
          path: r.path,
          type: r.type,
          exists: r.exists,
          accessible: r.accessible,
          metadata: r.metadata?.toJSON() || null,
          error: r.error,
          executionTime: r.executionTime,
          cacheHit: r.cacheHit,
        })),
        totalResults: result.totalResults,
        successfulResults: result.successfulResults,
        failedResults: result.failedResults,
        executionTime: result.executionTime,
        cacheHit: result.cacheHit,
      };
    } catch (error) {
      throw new Error(`Failed to get directory metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets metadata statistics
   */
  getMetadataStats(): any {
    return this.metadataService.getMetadataStats();
  }

  /**
   * Clears metadata cache
   */
  clearCache(path?: string): void {
    this.metadataService.clearCache(path);
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): any {
    return this.metadataService.getCacheStats();
  }

  /**
   * Validates tool options
   */
  private validateOptions(options: GetFileMetadataToolOptions): void {
    if (!options.path || typeof options.path !== 'string') {
      throw new Error('Path is required and must be a string');
    }

    if (options.path.length === 0) {
      throw new Error('Path cannot be empty');
    }

    if (options.maxDepth !== undefined && (options.maxDepth < 1 || options.maxDepth > 20)) {
      throw new Error('Max depth must be between 1 and 20');
    }

    // Validate boolean options
    const booleanOptions = [
      'includeContentHash', 'includePermissions', 'includeSymlinkTarget',
      'includeFileTypes', 'includeSize', 'includeTimestamps', 'includeOwnerInfo', 'recursive'
    ];

    for (const option of booleanOptions) {
      if (options[option as keyof GetFileMetadataToolOptions] !== undefined) {
        const value = options[option as keyof GetFileMetadataToolOptions];
        if (typeof value !== 'boolean') {
          throw new Error(`${option} must be a boolean`);
        }
      }
    }
  }

  /**
   * Validates array of paths
   */
  private validatePaths(paths: string[]): void {
    if (!Array.isArray(paths)) {
      throw new Error('Paths must be an array');
    }

    if (paths.length === 0) {
      throw new Error('Paths array cannot be empty');
    }

    if (paths.length > 1000) {
      throw new Error('Too many paths (max 1000)');
    }

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      if (typeof path !== 'string') {
        throw new Error(`Path at index ${i} must be a string`);
      }
      if (path.length === 0) {
        throw new Error(`Path at index ${i} cannot be empty`);
      }
    }
  }

  /**
   * Gets tool metadata
   */
  static getMetadata(): any {
    return {
      name: 'get_file_metadata',
      description: 'Get detailed metadata for a file or directory',
      version: '1.0.0',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File or directory path',
            minLength: 1,
          },
          includeContentHash: {
            type: 'boolean',
            description: 'Include content hash for files',
            default: false,
          },
          includePermissions: {
            type: 'boolean',
            description: 'Include permission information',
            default: true,
          },
          includeSymlinkTarget: {
            type: 'boolean',
            description: 'Include symlink target for symbolic links',
            default: true,
          },
          includeFileTypes: {
            type: 'boolean',
            description: 'Include file type information',
            default: true,
          },
          includeSize: {
            type: 'boolean',
            description: 'Include size information',
            default: true,
          },
          includeTimestamps: {
            type: 'boolean',
            description: 'Include timestamp information',
            default: true,
          },
          includeOwnerInfo: {
            type: 'boolean',
            description: 'Include owner information',
            default: true,
          },
          recursive: {
            type: 'boolean',
            description: 'Get metadata recursively for directories',
            default: false,
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum depth for recursive operations',
            minimum: 1,
            maximum: 20,
            default: 1,
          },
        },
        required: ['path'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the operation was successful',
          },
          path: {
            type: 'string',
            description: 'The path that was queried',
          },
          type: {
            type: 'string',
            enum: ['file', 'directory', 'symlink', 'unknown'],
            description: 'Type of the item',
          },
          exists: {
            type: 'boolean',
            description: 'Whether the path exists',
          },
          accessible: {
            type: 'boolean',
            description: 'Whether the path is accessible',
          },
          metadata: {
            type: 'object',
            description: 'Detailed metadata for the item',
            properties: {
              path: {
                type: 'string',
                description: 'Item path',
              },
              name: {
                type: 'string',
                description: 'Item name',
              },
              type: {
                type: 'string',
                enum: ['file', 'directory'],
                description: 'Item type',
              },
              size: {
                type: 'number',
                description: 'Size in bytes',
              },
              permissions: {
                type: 'object',
                description: 'Permission information',
              },
              timestamps: {
                type: 'object',
                description: 'Timestamp information',
              },
              owner: {
                type: 'object',
                description: 'Owner information',
              },
              contentType: {
                type: 'string',
                description: 'MIME type',
              },
              encoding: {
                type: 'string',
                description: 'File encoding',
              },
              isSymbolicLink: {
                type: 'boolean',
                description: 'Whether this is a symbolic link',
              },
              symlinkTarget: {
                type: 'string',
                description: 'Symbolic link target path',
              },
              contentHash: {
                type: 'string',
                description: 'Content hash (SHA-256)',
              },
            },
          },
          error: {
            type: 'string',
            description: 'Error message if operation failed',
          },
          executionTime: {
            type: 'number',
            description: 'Execution time in milliseconds',
          },
          cacheHit: {
            type: 'boolean',
            description: 'Whether the result was served from cache',
          },
        },
        required: ['success', 'path', 'type', 'exists', 'accessible', 'metadata'],
      },
    };
  }
}
