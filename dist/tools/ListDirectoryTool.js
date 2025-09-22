"use strict";
/**
 * List Directory Tool
 *
 * MCP tool for listing directory contents with comprehensive filtering and sorting.
 * Implements security validation and audit logging.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListDirectoryTool = void 0;
const DirectoryService_1 = require("../services/DirectoryService");
class ListDirectoryTool {
    directoryService;
    constructor(config, pathValidationService, permissionService, auditLoggingService) {
        this.directoryService = new DirectoryService_1.DirectoryService(config, pathValidationService, permissionService, auditLoggingService);
    }
    /**
     * Lists directory contents
     */
    async execute(options, context) {
        try {
            const result = await this.directoryService.listDirectory(options.path, {
                includeHidden: options.includeHidden || false,
                maxDepth: options.maxDepth || 1,
                sortBy: options.sortBy || 'name',
                sortOrder: options.sortOrder || 'asc',
                maxResults: options.maxResults || 1000,
                includeMetadata: options.includeMetadata !== false,
                followSymbolicLinks: options.followSymbolicLinks || false,
            }, context);
            return {
                success: true,
                path: result.path,
                directories: result.directories.map(d => d.toJSON()),
                files: result.files.map(f => f.toJSON()),
                totalDirectories: result.totalDirectories,
                totalFiles: result.totalFiles,
                totalSize: result.totalSize,
                maxDepthReached: result.maxDepthReached,
                hasMore: result.hasMore,
                executionTime: result.executionTime,
                cacheHit: result.cacheHit,
                memoryOptimized: result.memoryOptimized,
            };
        }
        catch (error) {
            return {
                success: false,
                path: options.path,
                directories: [],
                files: [],
                totalDirectories: 0,
                totalFiles: 0,
                totalSize: 0,
                maxDepthReached: false,
                hasMore: false,
                executionTime: 0,
                cacheHit: false,
                memoryOptimized: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Gets directory statistics
     */
    async getDirectoryStats(path, context) {
        try {
            return await this.directoryService.getDirectoryStats(path, context);
        }
        catch (error) {
            throw new Error(`Failed to get directory stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Streams directory contents for large directories
     */
    async *streamDirectoryListing(path, options = {}, context) {
        try {
            const stream = this.directoryService.streamDirectoryListing(path, {
                includeHidden: options.includeHidden || false,
                maxDepth: options.maxDepth || 1,
                sortBy: options.sortBy || 'name',
                sortOrder: options.sortOrder || 'asc',
                maxResults: options.maxResults || 1000,
                includeMetadata: options.includeMetadata !== false,
                followSymbolicLinks: options.followSymbolicLinks || false,
            }, context);
            for await (const batch of stream) {
                yield {
                    success: true,
                    path: batch.path,
                    directories: batch.directories.map(d => d.toJSON()),
                    files: batch.files.map(f => f.toJSON()),
                    totalDirectories: batch.totalDirectories,
                    totalFiles: batch.totalFiles,
                    totalSize: batch.totalSize,
                    maxDepthReached: batch.maxDepthReached,
                    hasMore: batch.hasMore,
                    executionTime: batch.executionTime,
                    cacheHit: batch.cacheHit,
                    memoryOptimized: batch.memoryOptimized,
                };
            }
        }
        catch (error) {
            yield {
                success: false,
                path,
                directories: [],
                files: [],
                totalDirectories: 0,
                totalFiles: 0,
                totalSize: 0,
                maxDepthReached: false,
                hasMore: false,
                executionTime: 0,
                cacheHit: false,
                memoryOptimized: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Clears directory cache
     */
    clearCache(path) {
        this.directoryService.clearCache(path);
    }
    /**
     * Gets cache statistics
     */
    getCacheStats() {
        return this.directoryService.getCacheStats();
    }
    /**
     * Validates tool options
     */
    validateOptions(options) {
        if (!options.path || typeof options.path !== 'string') {
            throw new Error('Path is required and must be a string');
        }
        if (options.path.length === 0) {
            throw new Error('Path cannot be empty');
        }
        if (options.maxDepth !== undefined && (options.maxDepth < 1 || options.maxDepth > 20)) {
            throw new Error('Max depth must be between 1 and 20');
        }
        if (options.maxResults !== undefined && (options.maxResults < 1 || options.maxResults > 10000)) {
            throw new Error('Max results must be between 1 and 10000');
        }
        if (options.sortBy && !['name', 'size', 'modified', 'type'].includes(options.sortBy)) {
            throw new Error('Invalid sort by option');
        }
        if (options.sortOrder && !['asc', 'desc'].includes(options.sortOrder)) {
            throw new Error('Invalid sort order option');
        }
    }
    /**
     * Gets tool metadata
     */
    static getMetadata() {
        return {
            name: 'list_directory',
            description: 'List contents of a directory with optional filtering and sorting',
            version: '1.0.0',
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
                    includeMetadata: {
                        type: 'boolean',
                        description: 'Include detailed metadata for each item',
                        default: true,
                    },
                    followSymbolicLinks: {
                        type: 'boolean',
                        description: 'Follow symbolic links',
                        default: false,
                    },
                    recursive: {
                        type: 'boolean',
                        description: 'Recursively list subdirectories',
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
                    path: {
                        type: 'string',
                        description: 'The directory path that was listed',
                    },
                    directories: {
                        type: 'array',
                        items: {
                            type: 'object',
                            description: 'Directory information',
                        },
                        description: 'List of directories',
                    },
                    files: {
                        type: 'array',
                        items: {
                            type: 'object',
                            description: 'File information',
                        },
                        description: 'List of files',
                    },
                    totalDirectories: {
                        type: 'number',
                        description: 'Total number of directories found',
                    },
                    totalFiles: {
                        type: 'number',
                        description: 'Total number of files found',
                    },
                    totalSize: {
                        type: 'number',
                        description: 'Total size of all files in bytes',
                    },
                    maxDepthReached: {
                        type: 'boolean',
                        description: 'Whether the maximum depth was reached',
                    },
                    hasMore: {
                        type: 'boolean',
                        description: 'Whether there are more results available',
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
                required: ['success', 'path', 'directories', 'files', 'totalDirectories', 'totalFiles', 'totalSize'],
            },
        };
    }
}
exports.ListDirectoryTool = ListDirectoryTool;
//# sourceMappingURL=ListDirectoryTool.js.map