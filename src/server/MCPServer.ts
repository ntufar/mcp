/**
 * MCP Server
 * 
 * Main MCP (Model Context Protocol) server implementation.
 * Provides secure file system access for LLM clients with comprehensive validation.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Configuration } from '../models/Configuration';
import { PathValidationService } from '../services/PathValidationService';
import { PermissionService } from '../services/PermissionService';
import { AuditLoggingService } from '../services/AuditLoggingService';
import { DirectoryService } from '../services/DirectoryService';
import { FileService } from '../services/FileService';
import { FileSearchService } from '../services/FileSearchService';
import { MetadataService } from '../services/MetadataService';
import { CacheService } from '../services/CacheService';
import { CacheInvalidationService } from '../services/CacheInvalidationService';

export interface MCPServerOptions {
  config?: Configuration;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  maxConcurrentRequests?: number;
}

export interface ClientContext {
  clientId: string;
  clientType: string;
  userId: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ServerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  activeConnections: number;
  toolUsage: Map<string, number>;
  clientTypes: Map<string, number>;
  errorTypes: Map<string, number>;
}

export class MCPServer {
  private server: Server;
  private config: Configuration;
  private pathValidationService: PathValidationService;
  private permissionService: PermissionService;
  private auditLoggingService: AuditLoggingService;
  private directoryService: DirectoryService;
  private fileService: FileService;
  private fileSearchService: FileSearchService;
  private metadataService: MetadataService;
  private cacheService: CacheService;
  private cacheInvalidationService: CacheInvalidationService;
  
  private stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalResponseTime: number;
    toolUsage: Map<string, number>;
    clientTypes: Map<string, number>;
    errorTypes: Map<string, number>;
    activeConnections: number;
  };

  constructor(options: MCPServerOptions = {}) {
    this.config = options.config || Configuration.createDefault();
    this.initializeServices();
    this.initializeStats();
    this.server = new Server(
      {
        name: this.config.server.name,
        version: this.config.server.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    this.setupHandlers();
  }

  /**
   * Starts the MCP server
   */
  async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.log(`MCP File Browser Server v${this.config.server.version} started`);
      console.log(`Server: ${this.config.server.name}`);
      console.log(`Allowed paths: ${this.config.security.allowedPaths.join(', ')}`);
      console.log(`Denied paths: ${this.config.security.deniedPaths.join(', ')}`);
      console.log(`Max file size: ${this.config.security.maxFileSize}`);
      console.log(`Max concurrent operations: ${this.config.performance.maxConcurrentOperations}`);
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  /**
   * Stops the MCP server
   */
  async stop(): Promise<void> {
    try {
      await this.server.close();
      console.log('MCP File Browser Server stopped');
    } catch (error) {
      console.error('Failed to stop MCP server:', error);
      throw error;
    }
  }

  /**
   * Gets server statistics
   */
  getStats(): ServerStats {
    const totalRequests = this.stats.totalRequests;
    const averageResponseTime = totalRequests > 0 ? 
      this.stats.totalResponseTime / totalRequests : 0;

    return {
      totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      averageResponseTime,
      activeConnections: this.stats.activeConnections,
      toolUsage: new Map(this.stats.toolUsage),
      clientTypes: new Map(this.stats.clientTypes),
      errorTypes: new Map(this.stats.errorTypes),
    };
  }

  /**
   * Updates server configuration
   */
  updateConfiguration(newConfig: Configuration): void {
    this.config = newConfig;
    this.pathValidationService.updateConfiguration(newConfig);
    this.permissionService.updateConfiguration(newConfig);
    this.auditLoggingService.updateConfiguration(newConfig);
    this.cacheService.updateOptions({
      maxSize: newConfig.getCacheSizeBytes(),
    });
  }

  /**
   * Gets server health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  } {
    const stats = this.getStats();
    const errorRate = stats.totalRequests > 0 ? 
      stats.failedRequests / stats.totalRequests : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (errorRate > 0.1) {
      status = 'unhealthy';
    } else if (errorRate > 0.05 || stats.averageResponseTime > 5000) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        errorRate,
        averageResponseTime: stats.averageResponseTime,
        totalRequests: stats.totalRequests,
        activeConnections: stats.activeConnections,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    };
  }

  // Private methods

  private initializeServices(): void {
    this.pathValidationService = new PathValidationService(this.config);
    this.permissionService = new PermissionService(this.config, this.pathValidationService);
    this.auditLoggingService = new AuditLoggingService(this.config);
    
    this.directoryService = new DirectoryService(
      this.config,
      this.pathValidationService,
      this.permissionService,
      this.auditLoggingService
    );
    
    this.fileService = new FileService(
      this.config,
      this.pathValidationService,
      this.permissionService,
      this.auditLoggingService
    );
    
    this.fileSearchService = new FileSearchService(
      this.config,
      this.pathValidationService,
      this.permissionService,
      this.auditLoggingService
    );
    
    this.metadataService = new MetadataService(
      this.config,
      this.pathValidationService,
      this.permissionService,
      this.auditLoggingService
    );
    
    this.cacheService = new CacheService(this.config);
    this.cacheInvalidationService = new CacheInvalidationService(
      this.config,
      this.cacheService,
      this.pathValidationService,
      this.auditLoggingService
    );
  }

  private initializeStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      toolUsage: new Map(),
      clientTypes: new Map(),
      errorTypes: new Map(),
      activeConnections: 0,
    };
  }

  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_directory',
            description: 'List contents of a directory with optional filtering and sorting',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Directory path to list',
                },
                includeHidden: {
                  type: 'boolean',
                  description: 'Include hidden files and directories',
                  default: false,
                },
                maxDepth: {
                  type: 'number',
                  description: 'Maximum directory depth to traverse',
                  minimum: 1,
                  maximum: 20,
                  default: 1,
                },
                sortBy: {
                  type: 'string',
                  enum: ['name', 'size', 'modified', 'type'],
                  description: 'Sort results by this field',
                  default: 'name',
                },
                sortOrder: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  description: 'Sort order',
                  default: 'asc',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  minimum: 1,
                  maximum: 10000,
                  default: 1000,
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'read_file',
            description: 'Read contents of a file with optional encoding and size limits',
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
                  default: 'utf-8',
                },
                maxSize: {
                  type: 'number',
                  description: 'Maximum file size to read in bytes',
                  default: 10485760, // 10MB
                },
                includeMetadata: {
                  type: 'boolean',
                  description: 'Include file metadata in response',
                  default: true,
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'search_files',
            description: 'Search for files by name, content, or metadata',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
                searchPath: {
                  type: 'string',
                  description: 'Base path to search in',
                },
                includeContent: {
                  type: 'boolean',
                  description: 'Search file contents',
                  default: false,
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results',
                  minimum: 1,
                  maximum: 1000,
                  default: 100,
                },
                fileTypes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by file extensions',
                },
                caseSensitive: {
                  type: 'boolean',
                  description: 'Case sensitive search',
                  default: false,
                },
              },
              required: ['query', 'searchPath'],
            },
          },
          {
            name: 'get_file_metadata',
            description: 'Get detailed metadata for a file or directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'File or directory path',
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
              },
              required: ['path'],
            },
          },
          {
            name: 'check_permissions',
            description: 'Check if a user has permission to perform an operation on a path',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to check permissions for',
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
              },
              required: ['path', 'operation'],
            },
          },
        ],
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      
      try {
        this.stats.totalRequests++;
        this.stats.activeConnections++;

        // Extract client context from request
        const context = this.extractClientContext(request);
        
        // Update client type statistics
        const clientTypeCount = this.stats.clientTypes.get(context.clientType) || 0;
        this.stats.clientTypes.set(context.clientType, clientTypeCount + 1);

        // Route to appropriate tool handler
        const result = await this.handleToolCall(request, context);
        
        // Update statistics
        this.stats.successfulRequests++;
        this.stats.totalResponseTime += Date.now() - startTime;
        
        const toolUsageCount = this.stats.toolUsage.get(request.params.name) || 0;
        this.stats.toolUsage.set(request.params.name, toolUsageCount + 1);

        return result;
      } catch (error) {
        this.stats.failedRequests++;
        this.stats.totalResponseTime += Date.now() - startTime;
        
        const errorType = error instanceof McpError ? error.code : 'UNKNOWN_ERROR';
        const errorTypeCount = this.stats.errorTypes.get(errorType) || 0;
        this.stats.errorTypes.set(errorType, errorTypeCount + 1);

        // Log error
        await this.auditLoggingService.logFailure(
          'system',
          'mcp-server',
          'mcp-server',
          'tool_call',
          errorType,
          error instanceof Error ? error.message : 'Unknown error',
          Date.now() - startTime,
          { toolName: request.params.name }
        );

        throw error;
      } finally {
        this.stats.activeConnections--;
      }
    });
  }

  private extractClientContext(request: any): ClientContext {
    // Extract client information from request headers or metadata
    // This is a simplified implementation - in a real scenario, this would be more sophisticated
    return {
      clientId: request.metadata?.clientId || 'unknown',
      clientType: request.metadata?.clientType || 'unknown',
      userId: request.metadata?.userId || 'anonymous',
      sessionId: request.metadata?.sessionId,
      ipAddress: request.metadata?.ipAddress,
      userAgent: request.metadata?.userAgent,
    };
  }

  private async handleToolCall(request: any, context: ClientContext): Promise<any> {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'list_directory':
        return this.handleListDirectory(args, context);
      case 'read_file':
        return this.handleReadFile(args, context);
      case 'search_files':
        return this.handleSearchFiles(args, context);
      case 'get_file_metadata':
        return this.handleGetFileMetadata(args, context);
      case 'check_permissions':
        return this.handleCheckPermissions(args, context);
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  }

  private async handleListDirectory(args: any, context: ClientContext): Promise<any> {
    const result = await this.directoryService.listDirectory(
      args.path,
      {
        includeHidden: args.includeHidden || false,
        maxDepth: args.maxDepth || 1,
        sortBy: args.sortBy || 'name',
        sortOrder: args.sortOrder || 'asc',
        maxResults: args.maxResults || 1000,
        includeMetadata: true,
      },
      context
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            path: result.path,
            directories: result.directories.map(d => d.toJSON()),
            files: result.files.map(f => f.toJSON()),
            totalDirectories: result.totalDirectories,
            totalFiles: result.totalFiles,
            totalSize: result.totalSize,
            executionTime: result.executionTime,
            cacheHit: result.cacheHit,
          }, null, 2),
        },
      ],
    };
  }

  private async handleReadFile(args: any, context: ClientContext): Promise<any> {
    const result = await this.fileService.readFile(
      args.path,
      {
        encoding: args.encoding || 'utf-8',
        maxSize: args.maxSize || 10485760, // 10MB
        includeMetadata: args.includeMetadata !== false,
        generateHash: true,
      },
      context
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            content: result.content,
            metadata: result.metadata.toJSON(),
            contentHash: result.contentHash,
            encoding: result.encoding,
            size: result.size,
            executionTime: result.executionTime,
            cacheHit: result.cacheHit,
          }, null, 2),
        },
      ],
    };
  }

  private async handleSearchFiles(args: any, context: ClientContext): Promise<any> {
    const result = await this.fileSearchService.searchFiles(
      {
        query: args.query,
        searchPath: args.searchPath,
        includeContent: args.includeContent || false,
        maxResults: args.maxResults || 100,
        fileTypes: args.fileTypes,
        caseSensitive: args.caseSensitive || false,
        recursive: true,
      },
      context
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            results: result.results,
            totalResults: result.totalResults,
            searchTime: result.searchTime,
            query: result.query,
            searchPath: result.searchPath,
            hasMore: result.hasMore,
            cacheHit: result.cacheHit,
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetFileMetadata(args: any, context: ClientContext): Promise<any> {
    const result = await this.metadataService.getMetadata(
      args.path,
      {
        includeContentHash: args.includeContentHash || false,
        includePermissions: args.includePermissions !== false,
        includeSymlinkTarget: args.includeSymlinkTarget !== false,
        includeFileTypes: true,
        includeSize: true,
        includeTimestamps: true,
        includeOwnerInfo: true,
      },
      context
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            path: result.path,
            type: result.type,
            exists: result.exists,
            accessible: result.accessible,
            metadata: result.metadata?.toJSON(),
            error: result.error,
            executionTime: result.executionTime,
            cacheHit: result.cacheHit,
          }, null, 2),
        },
      ],
    };
  }

  private async handleCheckPermissions(args: any, context: ClientContext): Promise<any> {
    const permissionCheck = await this.permissionService.checkPermission({
      userId: args.userId || context.userId,
      userGroups: [],
      clientId: context.clientId,
      clientType: context.clientType,
      operation: args.operation,
      targetPath: args.path,
      ipAddress: context.ipAddress,
      sessionId: context.sessionId,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            allowed: permissionCheck.allowed,
            reason: permissionCheck.reason,
            errorCode: permissionCheck.errorCode,
            requiredPermissions: permissionCheck.requiredPermissions,
            userPermissions: permissionCheck.userPermissions,
            filePermissions: permissionCheck.filePermissions,
          }, null, 2),
        },
      ],
    };
  }
}
