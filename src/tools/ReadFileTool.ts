/**
 * Read File Tool
 * 
 * MCP tool for reading file contents with security validation and streaming.
 * Implements comprehensive file access with caching and audit logging.
 */

import { FileService } from '../services/FileService';
import { PathValidationService } from '../services/PathValidationService';
import { PermissionService } from '../services/PermissionService';
import { AuditLoggingService } from '../services/AuditLoggingService';
import { Configuration } from '../models/Configuration';

export interface ReadFileToolOptions {
  path: string;
  encoding?: string;
  maxSize?: number;
  offset?: number;
  length?: number;
  includeMetadata?: boolean;
  generateHash?: boolean;
  streaming?: boolean;
}

export interface ReadFileToolResult {
  success: boolean;
  content: string | Buffer;
  metadata: any;
  contentHash?: string;
  encoding: string;
  size: number;
  executionTime: number;
  cacheHit: boolean;
  memoryOptimized: boolean;
  error?: string;
}

export class ReadFileTool {
  private fileService: FileService;

  constructor(
    config: Configuration,
    pathValidationService: PathValidationService,
    permissionService: PermissionService,
    auditLoggingService: AuditLoggingService
  ) {
    this.fileService = new FileService(
      config,
      pathValidationService,
      permissionService,
      auditLoggingService
    );
  }

  /**
   * Reads file content
   */
  async execute(
    options: ReadFileToolOptions,
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<ReadFileToolResult> {
    try {
      this.validateOptions(options);

      const result = await this.fileService.readFile(
        options.path,
        {
          encoding: options.encoding || 'utf-8',
          maxSize: options.maxSize || 10485760, // 10MB
          offset: options.offset,
          length: options.length,
          includeMetadata: options.includeMetadata !== false,
          generateHash: options.generateHash !== false,
        },
        context
      );

      return {
        success: true,
        content: result.content,
        metadata: result.metadata.toJSON(),
        contentHash: result.contentHash,
        encoding: result.encoding,
        size: result.size,
        executionTime: result.executionTime,
        cacheHit: result.cacheHit,
        memoryOptimized: result.memoryOptimized,
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        metadata: null,
        encoding: options.encoding || 'utf-8',
        size: 0,
        executionTime: 0,
        cacheHit: false,
        memoryOptimized: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Streams file content for large files
   */
  async streamFile(
    options: ReadFileToolOptions,
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<any> {
    try {
      this.validateOptions(options);

      const result = await this.fileService.streamFile(
        options.path,
        {
          encoding: options.encoding || 'utf-8',
          maxSize: options.maxSize || 10485760,
          offset: options.offset,
          length: options.length,
          includeMetadata: options.includeMetadata !== false,
          generateHash: options.generateHash !== false,
        },
        context
      );

      return {
        success: true,
        stream: result.stream,
        metadata: result.metadata.toJSON(),
        contentHash: result.contentHash,
        size: result.size,
        executionTime: result.executionTime,
      };
    } catch (error) {
      throw new Error(`Failed to stream file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets file metadata
   */
  async getFileMetadata(
    path: string,
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<any> {
    try {
      const result = await this.fileService.getFileMetadata(path, context);
      return result.metadata?.toJSON() || null;
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks file access
   */
  async checkFileAccess(
    path: string,
    context: {
      userId: string;
      clientId: string;
      clientType: string;
    }
  ): Promise<any> {
    try {
      return await this.fileService.checkFileAccess(path, context);
    } catch (error) {
      throw new Error(`Failed to check file access: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clears file cache
   */
  clearCache(path?: string): void {
    this.fileService.clearCache(path);
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): any {
    return this.fileService.getCacheStats();
  }

  /**
   * Validates tool options
   */
  private validateOptions(options: ReadFileToolOptions): void {
    if (!options.path || typeof options.path !== 'string') {
      throw new Error('Path is required and must be a string');
    }

    if (options.path.length === 0) {
      throw new Error('Path cannot be empty');
    }

    if (options.encoding && typeof options.encoding !== 'string') {
      throw new Error('Encoding must be a string');
    }

    if (options.maxSize !== undefined && (options.maxSize < 0 || options.maxSize > 104857600)) {
      throw new Error('Max size must be between 0 and 100MB');
    }

    if (options.offset !== undefined && options.offset < 0) {
      throw new Error('Offset cannot be negative');
    }

    if (options.length !== undefined && options.length < 0) {
      throw new Error('Length cannot be negative');
    }

    // Validate encoding
    if (options.encoding) {
      const validEncodings = [
        'utf-8', 'utf-16', 'ascii', 'binary', 'base64', 'hex',
        'latin1', 'ucs2', 'utf16le', 'cp1252', 'iso-8859-1'
      ];
      
      if (!validEncodings.includes(options.encoding.toLowerCase())) {
        throw new Error(`Unsupported encoding: ${options.encoding}`);
      }
    }
  }

  /**
   * Gets tool metadata
   */
  static getMetadata(): any {
    return {
      name: 'read_file',
      description: 'Read contents of a file with optional encoding and size limits',
      version: '1.0.0',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path to read',
          },
          encoding: {
            type: 'string',
            description: 'File encoding',
            enum: ['utf-8', 'utf-16', 'ascii', 'binary', 'base64', 'hex', 'latin1', 'ucs2', 'utf16le', 'cp1252', 'iso-8859-1'],
            default: 'utf-8',
          },
          maxSize: {
            type: 'number',
            description: 'Maximum file size to read in bytes',
            minimum: 0,
            maximum: 104857600, // 100MB
            default: 10485760, // 10MB
          },
          offset: {
            type: 'number',
            description: 'Byte offset to start reading from',
            minimum: 0,
            default: 0,
          },
          length: {
            type: 'number',
            description: 'Number of bytes to read',
            minimum: 0,
          },
          includeMetadata: {
            type: 'boolean',
            description: 'Include file metadata in response',
            default: true,
          },
          generateHash: {
            type: 'boolean',
            description: 'Generate content hash',
            default: true,
          },
          streaming: {
            type: 'boolean',
            description: 'Use streaming for large files',
            default: false,
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
          content: {
            type: 'string',
            description: 'File content',
          },
          metadata: {
            type: 'object',
            description: 'File metadata',
          },
          contentHash: {
            type: 'string',
            description: 'SHA-256 hash of file content',
          },
          encoding: {
            type: 'string',
            description: 'File encoding used',
          },
          size: {
            type: 'number',
            description: 'File size in bytes',
          },
          executionTime: {
            type: 'number',
            description: 'Execution time in milliseconds',
          },
          cacheHit: {
            type: 'boolean',
            description: 'Whether the result was served from cache',
          },
          memoryOptimized: {
            type: 'boolean',
            description: 'Whether memory optimization was applied',
          },
          error: {
            type: 'string',
            description: 'Error message if operation failed',
          },
        },
        required: ['success', 'content', 'metadata', 'encoding', 'size'],
      },
    };
  }
}
