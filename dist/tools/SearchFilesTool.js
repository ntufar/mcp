"use strict";
/**
 * Search Files Tool
 *
 * MCP tool for searching files by name, content, or metadata.
 * Implements comprehensive search functionality with security validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchFilesTool = void 0;
const FileSearchService_1 = require("../services/FileSearchService");
class SearchFilesTool {
    fileSearchService;
    constructor(config, pathValidationService, permissionService, auditLoggingService) {
        this.fileSearchService = new FileSearchService_1.FileSearchService(config, pathValidationService, permissionService, auditLoggingService);
    }
    /**
     * Searches for files
     */
    async execute(options, context) {
        try {
            this.validateOptions(options);
            const result = await this.fileSearchService.searchFiles({
                query: options.query,
                searchPath: options.searchPath,
                includeContent: options.includeContent || false,
                includeMetadata: options.includeMetadata !== false,
                maxResults: options.maxResults || 100,
                fileTypes: options.fileTypes,
                minSize: options.minSize,
                maxSize: options.maxSize,
                dateFrom: options.dateFrom,
                dateTo: options.dateTo,
                caseSensitive: options.caseSensitive || false,
                useRegex: options.useRegex || false,
                recursive: options.recursive !== false,
                maxDepth: options.maxDepth || 10,
            }, context);
            return {
                success: true,
                results: result.results,
                totalResults: result.totalResults,
                searchTime: result.searchTime,
                query: result.query,
                searchPath: result.searchPath,
                hasMore: result.hasMore,
                cacheHit: result.cacheHit,
                memoryOptimized: result.memoryOptimized,
            };
        }
        catch (error) {
            return {
                success: false,
                results: [],
                totalResults: 0,
                searchTime: 0,
                query: options.query,
                searchPath: options.searchPath,
                hasMore: false,
                cacheHit: false,
                memoryOptimized: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Searches files by name pattern
     */
    async searchByName(namePattern, searchPath, options = {}, context) {
        const searchOptions = {
            query: namePattern,
            searchPath,
            includeContent: false,
            includeMetadata: false,
            ...options,
        };
        return this.execute(searchOptions, context);
    }
    /**
     * Searches files by content
     */
    async searchByContent(contentQuery, searchPath, options = {}, context) {
        const searchOptions = {
            query: contentQuery,
            searchPath,
            includeContent: true,
            includeMetadata: false,
            ...options,
        };
        return this.execute(searchOptions, context);
    }
    /**
     * Searches files by metadata
     */
    async searchByMetadata(metadataQuery, searchPath, options = {}, context) {
        const searchOptions = {
            query: metadataQuery,
            searchPath,
            includeContent: false,
            includeMetadata: true,
            ...options,
        };
        return this.execute(searchOptions, context);
    }
    /**
     * Gets search statistics
     */
    getSearchStats() {
        return this.fileSearchService.getSearchStats();
    }
    /**
     * Clears search cache
     */
    clearCache(searchPath) {
        this.fileSearchService.clearCache(searchPath);
    }
    /**
     * Gets cache statistics
     */
    getCacheStats() {
        return this.fileSearchService.getCacheStats();
    }
    /**
     * Validates tool options
     */
    validateOptions(options) {
        if (!options.query || typeof options.query !== 'string') {
            throw new Error('Query is required and must be a string');
        }
        if (options.query.length === 0) {
            throw new Error('Query cannot be empty');
        }
        if (options.query.length > 1000) {
            throw new Error('Query too long (max 1000 characters)');
        }
        if (!options.searchPath || typeof options.searchPath !== 'string') {
            throw new Error('Search path is required and must be a string');
        }
        if (options.searchPath.length === 0) {
            throw new Error('Search path cannot be empty');
        }
        if (options.maxResults !== undefined && (options.maxResults < 1 || options.maxResults > 10000)) {
            throw new Error('Max results must be between 1 and 10000');
        }
        if (options.maxDepth !== undefined && (options.maxDepth < 1 || options.maxDepth > 20)) {
            throw new Error('Max depth must be between 1 and 20');
        }
        if (options.minSize !== undefined && options.minSize < 0) {
            throw new Error('Min size cannot be negative');
        }
        if (options.maxSize !== undefined && options.maxSize < 0) {
            throw new Error('Max size cannot be negative');
        }
        if (options.minSize !== undefined && options.maxSize !== undefined && options.minSize > options.maxSize) {
            throw new Error('Min size cannot be greater than max size');
        }
        if (options.dateFrom && options.dateTo && options.dateFrom > options.dateTo) {
            throw new Error('Date from cannot be after date to');
        }
        if (options.fileTypes && !Array.isArray(options.fileTypes)) {
            throw new Error('File types must be an array');
        }
        if (options.fileTypes) {
            for (const fileType of options.fileTypes) {
                if (typeof fileType !== 'string') {
                    throw new Error('File type must be a string');
                }
                if (fileType.length === 0) {
                    throw new Error('File type cannot be empty');
                }
                if (!/^[a-zA-Z0-9]+$/.test(fileType)) {
                    throw new Error('File type contains invalid characters');
                }
            }
        }
        // Validate regex pattern if useRegex is true
        if (options.useRegex) {
            try {
                new RegExp(options.query);
            }
            catch (error) {
                throw new Error(`Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    /**
     * Gets tool metadata
     */
    static getMetadata() {
        return {
            name: 'search_files',
            description: 'Search for files by name, content, or metadata',
            version: '1.0.0',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search query',
                        minLength: 1,
                        maxLength: 1000,
                    },
                    searchPath: {
                        type: 'string',
                        description: 'Base path to search in',
                        minLength: 1,
                    },
                    includeContent: {
                        type: 'boolean',
                        description: 'Search file contents',
                        default: false,
                    },
                    includeMetadata: {
                        type: 'boolean',
                        description: 'Search file metadata',
                        default: true,
                    },
                    maxResults: {
                        type: 'number',
                        description: 'Maximum number of results',
                        minimum: 1,
                        maximum: 10000,
                        default: 100,
                    },
                    fileTypes: {
                        type: 'array',
                        items: {
                            type: 'string',
                            pattern: '^[a-zA-Z0-9]+$',
                        },
                        description: 'Filter by file extensions',
                    },
                    minSize: {
                        type: 'number',
                        description: 'Minimum file size in bytes',
                        minimum: 0,
                    },
                    maxSize: {
                        type: 'number',
                        description: 'Maximum file size in bytes',
                        minimum: 0,
                    },
                    dateFrom: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Search files modified after this date',
                    },
                    dateTo: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Search files modified before this date',
                    },
                    caseSensitive: {
                        type: 'boolean',
                        description: 'Case sensitive search',
                        default: false,
                    },
                    useRegex: {
                        type: 'boolean',
                        description: 'Use regular expression for search',
                        default: false,
                    },
                    recursive: {
                        type: 'boolean',
                        description: 'Search recursively in subdirectories',
                        default: true,
                    },
                    maxDepth: {
                        type: 'number',
                        description: 'Maximum directory depth to search',
                        minimum: 1,
                        maximum: 20,
                        default: 10,
                    },
                },
                required: ['query', 'searchPath'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        description: 'Whether the operation was successful',
                    },
                    results: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: 'File or directory path',
                                },
                                name: {
                                    type: 'string',
                                    description: 'File or directory name',
                                },
                                type: {
                                    type: 'string',
                                    enum: ['file', 'directory'],
                                    description: 'Type of the item',
                                },
                                size: {
                                    type: 'number',
                                    description: 'Size in bytes',
                                },
                                modifiedTime: {
                                    type: 'string',
                                    format: 'date-time',
                                    description: 'Last modified time',
                                },
                                contentType: {
                                    type: 'string',
                                    description: 'MIME type of the file',
                                },
                                matchType: {
                                    type: 'string',
                                    enum: ['name', 'content', 'metadata'],
                                    description: 'Type of match',
                                },
                                matchScore: {
                                    type: 'number',
                                    description: 'Relevance score',
                                },
                                matchedContent: {
                                    type: 'string',
                                    description: 'Matched content snippet',
                                },
                                lineNumber: {
                                    type: 'number',
                                    description: 'Line number where match was found',
                                },
                                context: {
                                    type: 'string',
                                    description: 'Context around the match',
                                },
                            },
                        },
                        description: 'Search results',
                    },
                    totalResults: {
                        type: 'number',
                        description: 'Total number of results found',
                    },
                    searchTime: {
                        type: 'number',
                        description: 'Search time in milliseconds',
                    },
                    query: {
                        type: 'string',
                        description: 'Original search query',
                    },
                    searchPath: {
                        type: 'string',
                        description: 'Search path used',
                    },
                    hasMore: {
                        type: 'boolean',
                        description: 'Whether there are more results available',
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
                required: ['success', 'results', 'totalResults', 'query', 'searchPath'],
            },
        };
    }
}
exports.SearchFilesTool = SearchFilesTool;
//# sourceMappingURL=SearchFilesTool.js.map