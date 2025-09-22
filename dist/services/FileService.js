"use strict";
/**
 * File Service
 *
 * Implements file reading and metadata operations with security validation.
 * Provides efficient file access with streaming and caching.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileService = void 0;
const File_1 = require("../models/File");
const PermissionInfo_1 = require("../models/PermissionInfo");
const PathValidationService_1 = require("./PathValidationService");
class FileService {
    config;
    pathValidationService;
    permissionService;
    auditLoggingService;
    metadataCache = new Map();
    contentCache = new Map();
    constructor(config, pathValidationService, permissionService, auditLoggingService) {
        this.config = config;
        this.pathValidationService = pathValidationService;
        this.permissionService = permissionService;
        this.auditLoggingService = auditLoggingService;
    }
    /**
     * Reads file content with security validation
     */
    async readFile(path, options = {}, context) {
        const startTime = Date.now();
        try {
            // Validate path
            const pathValidation = this.pathValidationService.validatePathForOperation(path, 'read');
            if (!pathValidation.isValid) {
                await this.auditLoggingService.logFailure(context.userId, context.clientId, context.clientType, 'read_file', pathValidation.errorCode || 'PATH_VALIDATION_FAILED', pathValidation.errorMessage || 'Path validation failed', Date.now() - startTime, { targetPath: path });
                throw new Error(pathValidation.errorMessage || 'Path validation failed');
            }
            const validatedPath = pathValidation.canonicalPath;
            // Check permissions
            const permissionCheck = await this.permissionService.checkPermission({
                userId: context.userId,
                userGroups: [],
                clientId: context.clientId,
                clientType: context.clientType,
                operation: 'read',
                targetPath: validatedPath,
            });
            if (!permissionCheck.allowed) {
                await this.auditLoggingService.logFailure(context.userId, context.clientId, context.clientType, 'read_file', permissionCheck.errorCode || 'PERMISSION_DENIED', permissionCheck.reason || 'Permission denied', Date.now() - startTime, { targetPath: validatedPath });
                throw new Error(permissionCheck.reason || 'Permission denied');
            }
            // Check file size limits
            const maxFileSize = options.maxSize || this.config.getMaxFileSizeBytes();
            // Check cache
            const cacheKey = this.generateCacheKey(validatedPath, options);
            const cachedResult = this.contentCache.get(cacheKey);
            if (cachedResult && !this.isCacheExpired(cacheKey)) {
                cachedResult.cacheHit = true;
                cachedResult.executionTime = Date.now() - startTime;
                await this.auditLoggingService.logSuccess(context.userId, context.clientId, context.clientType, 'read_file', Date.now() - startTime, {
                    targetPath: validatedPath,
                    cacheHit: true,
                    fileSize: cachedResult.size
                });
                return cachedResult;
            }
            // Read file content
            const result = await this.performFileRead(validatedPath, options);
            result.executionTime = Date.now() - startTime;
            result.cacheHit = false;
            // Check size limits
            if (result.size > maxFileSize) {
                await this.auditLoggingService.logFailure(context.userId, context.clientId, context.clientType, 'read_file', 'FILE_TOO_LARGE', `File size ${result.size} exceeds limit ${maxFileSize}`, Date.now() - startTime, { targetPath: validatedPath, fileSize: result.size });
                throw new Error(`File size ${result.size} exceeds limit ${maxFileSize}`);
            }
            // Cache the result
            this.cacheResult(cacheKey, result);
            // Log success
            await this.auditLoggingService.logSuccess(context.userId, context.clientId, context.clientType, 'read_file', result.executionTime, {
                targetPath: validatedPath,
                fileSize: result.size,
                contentHash: result.contentHash,
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            await this.auditLoggingService.logFailure(context.userId, context.clientId, context.clientType, 'read_file', 'FILE_READ_ERROR', error instanceof Error ? error.message : 'Unknown error', duration, { targetPath: path });
            throw error;
        }
    }
    /**
     * Gets file metadata
     */
    async getFileMetadata(path, context) {
        const startTime = Date.now();
        try {
            // Validate path
            const pathValidation = this.pathValidationService.validatePathForOperation(path, 'read');
            if (!pathValidation.isValid) {
                await this.auditLoggingService.logFailure(context.userId, context.clientId, context.clientType, 'get_file_metadata', pathValidation.errorCode || 'PATH_VALIDATION_FAILED', pathValidation.errorMessage || 'Path validation failed', Date.now() - startTime, { targetPath: path });
                throw new Error(pathValidation.errorMessage || 'Path validation failed');
            }
            const validatedPath = pathValidation.canonicalPath;
            // Check permissions
            const permissionCheck = await this.permissionService.checkPermission({
                userId: context.userId,
                userGroups: [],
                clientId: context.clientId,
                clientType: context.clientType,
                operation: 'read',
                targetPath: validatedPath,
            });
            if (!permissionCheck.allowed) {
                await this.auditLoggingService.logFailure(context.userId, context.clientId, context.clientType, 'get_file_metadata', permissionCheck.errorCode || 'PERMISSION_DENIED', permissionCheck.reason || 'Permission denied', Date.now() - startTime, { targetPath: validatedPath });
                throw new Error(permissionCheck.reason || 'Permission denied');
            }
            // Check cache
            const cacheKey = `metadata:${validatedPath}`;
            const cachedResult = this.metadataCache.get(cacheKey);
            if (cachedResult && !this.isCacheExpired(cacheKey)) {
                cachedResult.cacheHit = true;
                cachedResult.executionTime = Date.now() - startTime;
                await this.auditLoggingService.logSuccess(context.userId, context.clientId, context.clientType, 'get_file_metadata', Date.now() - startTime, { targetPath: validatedPath, cacheHit: true });
                return cachedResult;
            }
            // Get file metadata
            const result = await this.performMetadataRead(validatedPath);
            result.executionTime = Date.now() - startTime;
            result.cacheHit = false;
            // Cache the result
            this.metadataCache.set(cacheKey, result);
            // Log success
            await this.auditLoggingService.logSuccess(context.userId, context.clientId, context.clientType, 'get_file_metadata', result.executionTime, {
                targetPath: validatedPath,
                fileSize: result.metadata.size,
                contentType: result.metadata.contentType,
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            await this.auditLoggingService.logFailure(context.userId, context.clientId, context.clientType, 'get_file_metadata', 'METADATA_ERROR', error instanceof Error ? error.message : 'Unknown error', duration, { targetPath: path });
            throw error;
        }
    }
    /**
     * Streams file content for large files
     */
    async streamFile(path, options = {}, context) {
        const startTime = Date.now();
        try {
            // Validate path
            const pathValidation = this.pathValidationService.validatePathForOperation(path, 'read');
            if (!pathValidation.isValid) {
                throw new Error(pathValidation.errorMessage || 'Path validation failed');
            }
            // Check permissions
            const permissionCheck = await this.permissionService.checkPermission({
                userId: context.userId,
                userGroups: [],
                clientId: context.clientId,
                clientType: context.clientType,
                operation: 'read',
                targetPath: pathValidation.canonicalPath,
            });
            if (!permissionCheck.allowed) {
                throw new Error(permissionCheck.reason || 'Permission denied');
            }
            // Stream file content
            const result = await this.performFileStream(pathValidation.canonicalPath, options);
            result.executionTime = Date.now() - startTime;
            // Log success
            await this.auditLoggingService.logSuccess(context.userId, context.clientId, context.clientType, 'stream_file', result.executionTime, {
                targetPath: pathValidation.canonicalPath,
                fileSize: result.size,
                contentHash: result.contentHash,
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            await this.auditLoggingService.logFailure(context.userId, context.clientId, context.clientType, 'stream_file', 'STREAM_ERROR', error instanceof Error ? error.message : 'Unknown error', duration, { targetPath: path });
            throw error;
        }
    }
    /**
     * Checks if file exists and is accessible
     */
    async checkFileAccess(path, context) {
        const startTime = Date.now();
        try {
            // Validate path
            const pathValidation = this.pathValidationService.validatePath(path);
            if (!pathValidation.isValid) {
                return {
                    exists: false,
                    accessible: false,
                    permissions: null,
                    executionTime: Date.now() - startTime,
                };
            }
            // Check permissions
            const permissionCheck = await this.permissionService.checkPermission({
                userId: context.userId,
                userGroups: [],
                clientId: context.clientId,
                clientType: context.clientType,
                operation: 'read',
                targetPath: pathValidation.canonicalPath,
            });
            // Simulate file existence check
            const exists = Math.random() > 0.1; // 90% chance file exists
            const accessible = exists && permissionCheck.allowed;
            const permissions = accessible ? PermissionInfo_1.PermissionInfo.createFromStats({
                mode: 0o644,
                uid: 1000,
                gid: 1000,
            }) : null;
            return {
                exists,
                accessible,
                permissions,
                executionTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                exists: false,
                accessible: false,
                permissions: null,
                executionTime: Date.now() - startTime,
            };
        }
    }
    /**
     * Clears file caches
     */
    clearCache(path) {
        if (path) {
            // Clear cache for specific path
            const pathPrefix = path + '|';
            for (const key of this.contentCache.keys()) {
                if (key.startsWith(pathPrefix)) {
                    this.contentCache.delete(key);
                }
            }
            this.metadataCache.delete(`metadata:${path}`);
        }
        else {
            // Clear entire cache
            this.contentCache.clear();
            this.metadataCache.clear();
        }
    }
    /**
     * Gets cache statistics
     */
    getCacheStats() {
        let contentHits = 0;
        let contentAccess = 0;
        let metadataHits = 0;
        let metadataAccess = 0;
        let memoryUsage = 0;
        for (const result of this.contentCache.values()) {
            contentAccess++;
            if (result.cacheHit) {
                contentHits++;
            }
            memoryUsage += JSON.stringify(result).length;
        }
        for (const result of this.metadataCache.values()) {
            metadataAccess++;
            if (result.cacheHit) {
                metadataHits++;
            }
            memoryUsage += JSON.stringify(result).length;
        }
        return {
            contentCacheSize: this.contentCache.size,
            metadataCacheSize: this.metadataCache.size,
            contentCacheHitRate: contentAccess > 0 ? contentHits / contentAccess : 0,
            metadataCacheHitRate: metadataAccess > 0 ? metadataHits / metadataAccess : 0,
            memoryUsage,
        };
    }
    // Private methods
    async performFileRead(path, options) {
        // This is a simulation - in a real implementation, this would read from the file system
        const encoding = options.encoding || 'utf-8';
        const includeMetadata = options.includeMetadata !== false;
        const generateHash = options.generateHash !== false;
        // Simulate file reading
        const mockContent = this.generateMockContent(path, options);
        const mockMetadata = this.generateMockMetadata(path);
        let contentHash;
        if (generateHash) {
            const crypto = require('crypto');
            const hash = crypto.createHash('sha256').update(mockContent).digest('hex');
            contentHash = `sha256:${hash}`;
        }
        return {
            content: mockContent,
            metadata: mockMetadata,
            contentHash,
            encoding,
            size: mockMetadata.size,
            executionTime: 0, // Will be set by caller
            cacheHit: false,
            memoryOptimized: false,
        };
    }
    async performMetadataRead(path) {
        // This is a simulation - in a real implementation, this would read file system metadata
        const metadata = this.generateMockMetadata(path);
        return {
            metadata,
            executionTime: 0, // Will be set by caller
            cacheHit: false,
        };
    }
    async performFileStream(path, options) {
        // This is a simulation - in a real implementation, this would create a file stream
        const metadata = this.generateMockMetadata(path);
        const mockContent = this.generateMockContent(path, options);
        // Create a simple readable stream
        const stream = new ReadableStream({
            start(controller) {
                const encoder = new TextEncoder();
                const chunks = encoder.encode(mockContent);
                controller.enqueue(chunks);
                controller.close();
            }
        });
        let contentHash;
        if (options.generateHash !== false) {
            const crypto = require('crypto');
            const hash = crypto.createHash('sha256').update(mockContent).digest('hex');
            contentHash = `sha256:${hash}`;
        }
        return {
            stream,
            metadata,
            contentHash,
            size: metadata.size,
            executionTime: 0, // Will be set by caller
        };
    }
    generateMockContent(path, options) {
        // Generate mock content based on file type
        const extension = PathValidationService_1.PathValidationService.getFileExtension(path);
        switch (extension) {
            case 'txt':
                return 'This is a mock text file content.\nIt contains multiple lines.\nAnd some sample data.';
            case 'json':
                return JSON.stringify({
                    mock: true,
                    path,
                    timestamp: new Date().toISOString(),
                    data: Array.from({ length: 10 }, (_, i) => ({ id: i, value: `item_${i}` }))
                }, null, 2);
            case 'html':
                return '<html><head><title>Mock HTML</title></head><body><h1>Mock Content</h1></body></html>';
            case 'css':
                return 'body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }';
            case 'js':
                return 'console.log("Mock JavaScript content");\nfunction mockFunction() {\n  return "Hello, World!";\n}';
            default:
                return `Mock content for ${path}\nGenerated at ${new Date().toISOString()}`;
        }
    }
    generateMockMetadata(path) {
        const extension = PathValidationService_1.PathValidationService.getFileExtension(path);
        const contentType = this.getContentType(extension);
        return File_1.File.createFromFileSystem(path, {
            size: Math.floor(Math.random() * 10000) + 100,
            mtime: new Date(),
            birthtime: new Date(),
            ctime: new Date(),
            isSymbolicLink: () => false,
        }, PermissionInfo_1.PermissionInfo.createFromStats({
            mode: 0o644,
            uid: 1000,
            gid: 1000,
        }), contentType, 'utf-8');
    }
    getContentType(extension) {
        const contentTypes = {
            txt: 'text/plain',
            json: 'application/json',
            html: 'text/html',
            css: 'text/css',
            js: 'application/javascript',
            xml: 'application/xml',
            yaml: 'application/yaml',
            yml: 'application/yaml',
            md: 'text/markdown',
            csv: 'text/csv',
            pdf: 'application/pdf',
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            svg: 'image/svg+xml',
        };
        return contentTypes[extension] || 'application/octet-stream';
    }
    generateCacheKey(path, options) {
        const optionsStr = JSON.stringify(options);
        return `${path}|${optionsStr}`;
    }
    isCacheExpired(cacheKey) {
        // Simple cache expiration - in a real implementation, this would be more sophisticated
        return false;
    }
    cacheResult(cacheKey, result) {
        // Simple caching - in a real implementation, this would use a proper cache with TTL
        this.contentCache.set(cacheKey, result);
        // Limit cache size
        if (this.contentCache.size > 1000) {
            const firstKey = this.contentCache.keys().next().value;
            this.contentCache.delete(firstKey);
        }
    }
}
exports.FileService = FileService;
//# sourceMappingURL=FileService.js.map