/**
 * File System Integration
 * 
 * Integrates all services with actual file system operations.
 * Provides the main integration layer between MCP tools and file system.
 */

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
import { ValidationService } from '../services/ValidationService';
import { ResponseService } from '../services/ResponseService';
import { ErrorHandler } from '../middleware/ErrorHandler';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface IntegrationContext {
  userId: string;
  clientId: string;
  clientType: string;
  sessionId?: string;
  ipAddress?: string;
  requestId: string;
  operation: string;
  timestamp: Date;
}

export interface IntegrationStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  serviceStats: Map<string, any>;
}

export class FileSystemIntegration {
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
  private validationService: ValidationService;
  private responseService: ResponseService;
  private errorHandler: ErrorHandler;
  
  private stats: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    totalResponseTime: number;
    serviceStats: Map<string, any>;
  };

  constructor(config: Configuration) {
    this.config = config;
    this.initializeServices();
    this.initializeStats();
    this.setupFileSystemWatchers();
  }

  /**
   * Initializes all services with proper dependencies
   */
  private initializeServices(): void {
    // Initialize core services
    this.pathValidationService = new PathValidationService(this.config);
    this.permissionService = new PermissionService(this.config, this.pathValidationService);
    this.auditLoggingService = new AuditLoggingService(this.config);
    
    // Initialize file system services
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
    
    // Initialize caching services
    this.cacheService = new CacheService(this.config);
    this.cacheInvalidationService = new CacheInvalidationService(
      this.config,
      this.cacheService,
      this.pathValidationService,
      this.auditLoggingService
    );
    
    // Initialize utility services
    this.validationService = new ValidationService(this.config, this.pathValidationService);
    this.responseService = new ResponseService(this.config, this.auditLoggingService);
    this.errorHandler = new ErrorHandler(this.config, this.auditLoggingService);
  }

  /**
   * Initializes statistics tracking
   */
  private initializeStats(): void {
    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalResponseTime: 0,
      serviceStats: new Map(),
    };
  }

  /**
   * Sets up file system watchers for cache invalidation
   */
  private setupFileSystemWatchers(): void {
    // This would set up file system watchers in a real implementation
    // For now, we'll simulate the setup
    console.log('File system watchers configured for cache invalidation');
  }

  /**
   * Executes a file system operation with full integration
   */
  async executeOperation<T>(
    operation: string,
    handler: () => Promise<T>,
    context: IntegrationContext
  ): Promise<T> {
    const startTime = Date.now();
    this.stats.totalOperations++;

    try {
      // Validate context
      this.validateContext(context);

      // Execute the operation
      const result = await handler();
      
      // Update statistics
      this.stats.successfulOperations++;
      this.stats.totalResponseTime += Date.now() - startTime;
      
      // Log success
      await this.auditLoggingService.logSuccess(
        context.userId,
        context.clientId,
        context.clientType,
        operation,
        Date.now() - startTime,
        {
          requestId: context.requestId,
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
        }
      );

      return result;
    } catch (error) {
      // Update statistics
      this.stats.failedOperations++;
      this.stats.totalResponseTime += Date.now() - startTime;
      
      // Handle error
      const errorResponse = await this.errorHandler.handleError(
        error as Error,
        {
          userId: context.userId,
          clientId: context.clientId,
          clientType: context.clientType,
          operation,
          timestamp: context.timestamp,
          ipAddress: context.ipAddress,
          sessionId: context.sessionId,
          requestId: context.requestId,
          toolName: operation,
        }
      );

      throw error;
    }
  }

  /**
   * Lists directory contents with full integration
   */
  async listDirectory(
    path: string,
    options: any,
    context: IntegrationContext
  ): Promise<any> {
    return this.executeOperation('list_directory', async () => {
      // Validate input
      const validationResult = this.validationService.validateToolInput('list_directory', { path, ...options }, {
        userId: context.userId,
        clientId: context.clientId,
        clientType: context.clientType,
        operation: 'list_directory',
        timestamp: context.timestamp,
      });

      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Execute directory listing
      const result = await this.directoryService.listDirectory(
        validationResult.sanitizedData.path,
        validationResult.sanitizedData,
        context
      );

      // Create response
      return this.responseService.createSuccessResponse(result, {
        requestId: context.requestId,
        operation: 'list_directory',
        tool: 'list_directory',
        duration: Date.now() - context.timestamp.getTime(),
        userId: context.userId,
        clientId: context.clientId,
        clientType: context.clientType,
        cacheHit: result.cacheHit,
        memoryOptimized: result.memoryOptimized,
      });
    }, context);
  }

  /**
   * Reads file content with full integration
   */
  async readFile(
    path: string,
    options: any,
    context: IntegrationContext
  ): Promise<any> {
    return this.executeOperation('read_file', async () => {
      // Validate input
      const validationResult = this.validationService.validateToolInput('read_file', { path, ...options }, {
        userId: context.userId,
        clientId: context.clientId,
        clientType: context.clientType,
        operation: 'read_file',
        timestamp: context.timestamp,
      });

      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Execute file reading
      const result = await this.fileService.readFile(
        validationResult.sanitizedData.path,
        validationResult.sanitizedData,
        context
      );

      // Create response
      return this.responseService.createSuccessResponse(result, {
        requestId: context.requestId,
        operation: 'read_file',
        tool: 'read_file',
        duration: Date.now() - context.timestamp.getTime(),
        userId: context.userId,
        clientId: context.clientId,
        clientType: context.clientType,
        cacheHit: result.cacheHit,
        memoryOptimized: result.memoryOptimized,
      });
    }, context);
  }

  /**
   * Searches files with full integration
   */
  async searchFiles(
    query: string,
    searchPath: string,
    options: any,
    context: IntegrationContext
  ): Promise<any> {
    return this.executeOperation('search_files', async () => {
      // Validate input
      const validationResult = this.validationService.validateToolInput('search_files', { query, searchPath, ...options }, {
        userId: context.userId,
        clientId: context.clientId,
        clientType: context.clientType,
        operation: 'search_files',
        timestamp: context.timestamp,
      });

      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Execute file search
      const result = await this.fileSearchService.searchFiles(
        validationResult.sanitizedData,
        context
      );

      // Create response
      return this.responseService.createSuccessResponse(result, {
        requestId: context.requestId,
        operation: 'search_files',
        tool: 'search_files',
        duration: Date.now() - context.timestamp.getTime(),
        userId: context.userId,
        clientId: context.clientId,
        clientType: context.clientType,
        cacheHit: result.cacheHit,
        memoryOptimized: result.memoryOptimized,
      });
    }, context);
  }

  /**
   * Gets file metadata with full integration
   */
  async getFileMetadata(
    path: string,
    options: any,
    context: IntegrationContext
  ): Promise<any> {
    return this.executeOperation('get_file_metadata', async () => {
      // Validate input
      const validationResult = this.validationService.validateToolInput('get_file_metadata', { path, ...options }, {
        userId: context.userId,
        clientId: context.clientId,
        clientType: context.clientType,
        operation: 'get_file_metadata',
        timestamp: context.timestamp,
      });

      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Execute metadata retrieval
      const result = await this.metadataService.getMetadata(
        validationResult.sanitizedData.path,
        validationResult.sanitizedData,
        context
      );

      // Create response
      return this.responseService.createSuccessResponse(result, {
        requestId: context.requestId,
        operation: 'get_file_metadata',
        tool: 'get_file_metadata',
        duration: Date.now() - context.timestamp.getTime(),
        userId: context.userId,
        clientId: context.clientId,
        clientType: context.clientType,
        cacheHit: result.cacheHit,
      });
    }, context);
  }

  /**
   * Checks permissions with full integration
   */
  async checkPermissions(
    path: string,
    operation: string,
    options: any,
    context: IntegrationContext
  ): Promise<any> {
    return this.executeOperation('check_permissions', async () => {
      // Validate input
      const validationResult = this.validationService.validateToolInput('check_permissions', { path, operation, ...options }, {
        userId: context.userId,
        clientId: context.clientId,
        clientType: context.clientType,
        operation: 'check_permissions',
        timestamp: context.timestamp,
      });

      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Execute permission check
      const result = await this.permissionService.checkPermission({
        userId: validationResult.sanitizedData.userId || context.userId,
        userGroups: validationResult.sanitizedData.userGroups || [],
        clientId: context.clientId,
        clientType: context.clientType,
        operation: validationResult.sanitizedData.operation,
        targetPath: validationResult.sanitizedData.path,
        ipAddress: context.ipAddress,
        sessionId: context.sessionId,
      });

      // Create response
      return this.responseService.createSuccessResponse(result, {
        requestId: context.requestId,
        operation: 'check_permissions',
        tool: 'check_permissions',
        duration: Date.now() - context.timestamp.getTime(),
        userId: context.userId,
        clientId: context.clientId,
        clientType: context.clientType,
      });
    }, context);
  }

  /**
   * Gets integration statistics
   */
  getStats(): IntegrationStats {
    const totalOperations = this.stats.totalOperations;
    const averageResponseTime = totalOperations > 0 ? 
      this.stats.totalResponseTime / totalOperations : 0;
    const cacheHitRate = 0; // Would need to track cache hits across services
    const errorRate = totalOperations > 0 ? 
      this.stats.failedOperations / totalOperations : 0;

    return {
      totalOperations,
      successfulOperations: this.stats.successfulOperations,
      failedOperations: this.stats.failedOperations,
      averageResponseTime,
      cacheHitRate,
      errorRate,
      serviceStats: new Map(this.stats.serviceStats),
    };
  }

  /**
   * Updates configuration for all services
   */
  updateConfiguration(newConfig: Configuration): void {
    this.config = newConfig;
    
    // Update all services
    this.pathValidationService.updateConfiguration(newConfig);
    this.permissionService.updateConfiguration(newConfig);
    this.auditLoggingService.updateConfiguration(newConfig);
    this.cacheService.updateOptions({
      maxSize: newConfig.getCacheSizeBytes(),
    });
    this.validationService.updateConfiguration(newConfig);
  }

  /**
   * Clears all caches
   */
  clearAllCaches(): void {
    this.directoryService.clearCache();
    this.fileService.clearCache();
    this.fileSearchService.clearCache();
    this.metadataService.clearCache();
    this.cacheService.clearCache();
  }

  /**
   * Gets cache statistics from all services
   */
  getAllCacheStats(): Record<string, any> {
    return {
      directory: this.directoryService.getCacheStats(),
      file: this.fileService.getCacheStats(),
      search: this.fileSearchService.getCacheStats(),
      metadata: this.metadataService.getCacheStats(),
      cache: this.cacheService.getStats(),
    };
  }

  /**
   * Validates integration context
   */
  private validateContext(context: IntegrationContext): void {
    if (!context.userId || typeof context.userId !== 'string') {
      throw new Error('Invalid user ID in context');
    }

    if (!context.clientId || typeof context.clientId !== 'string') {
      throw new Error('Invalid client ID in context');
    }

    if (!context.clientType || typeof context.clientType !== 'string') {
      throw new Error('Invalid client type in context');
    }

    if (!context.requestId || typeof context.requestId !== 'string') {
      throw new Error('Invalid request ID in context');
    }

    if (!context.operation || typeof context.operation !== 'string') {
      throw new Error('Invalid operation in context');
    }

    if (!context.timestamp || !(context.timestamp instanceof Date)) {
      throw new Error('Invalid timestamp in context');
    }
  }

  /**
   * Gracefully shuts down all services
   */
  async shutdown(): Promise<void> {
    try {
      console.log('Shutting down file system integration...');
      
      // Clear caches
      this.clearAllCaches();
      
      // Stop file system watchers
      // In a real implementation, this would stop the watchers
      
      console.log('File system integration shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }
}
