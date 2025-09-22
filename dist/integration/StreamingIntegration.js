"use strict";
/**
 * Streaming Integration
 *
 * Implements streaming functionality for large files and directories.
 * Provides efficient streaming with memory optimization and progress tracking.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingIntegration = void 0;
const stream_1 = require("stream");
const fs = __importStar(require("fs/promises"));
class StreamingIntegration {
    config;
    fileSystemIntegration;
    options;
    activeStreams = new Map();
    constructor(config, fileSystemIntegration, options = {}) {
        this.config = config;
        this.fileSystemIntegration = fileSystemIntegration;
        this.options = {
            chunkSize: 64 * 1024, // 64KB default
            maxConcurrentStreams: 10,
            enableCompression: false,
            enableProgress: true,
            bufferSize: 1024 * 1024, // 1MB buffer
            timeout: 30000, // 30 seconds
            ...options,
        };
    }
    /**
     * Streams file content with progress tracking
     */
    async streamFile(filePath, context, options = {}) {
        const streamOptions = { ...this.options, ...options };
        const streamId = this.generateStreamId();
        try {
            // Validate file exists and get metadata
            const fileStats = await fs.stat(filePath);
            const totalSize = fileStats.size;
            // Check concurrent stream limit
            if (this.activeStreams.size >= streamOptions.maxConcurrentStreams) {
                throw new Error('Maximum concurrent streams exceeded');
            }
            // Create file stream
            const fileStream = fs.createReadStream(filePath, {
                highWaterMark: streamOptions.chunkSize,
            });
            // Create progress tracking
            const progress = {
                totalBytes: totalSize,
                processedBytes: 0,
                percentage: 0,
                speed: 0,
                eta: 0,
                startTime: new Date(),
                lastUpdate: new Date(),
            };
            // Create metadata
            const metadata = {
                totalSize,
                chunkSize: streamOptions.chunkSize,
                compressionEnabled: streamOptions.enableCompression,
                startTime: new Date(),
                streamId,
            };
            // Create transform stream for progress tracking
            const progressStream = new stream_1.Transform({
                transform(chunk, encoding, callback) {
                    progress.processedBytes += chunk.length;
                    progress.percentage = (progress.processedBytes / progress.totalBytes) * 100;
                    const now = new Date();
                    const timeDiff = (now.getTime() - progress.lastUpdate.getTime()) / 1000;
                    if (timeDiff >= 1) { // Update every second
                        const bytesDiff = progress.processedBytes - (progress.processedBytes - chunk.length);
                        progress.speed = bytesDiff / timeDiff;
                        if (progress.speed > 0) {
                            const remainingBytes = progress.totalBytes - progress.processedBytes;
                            progress.eta = remainingBytes / progress.speed;
                        }
                        progress.lastUpdate = now;
                    }
                    callback(null, chunk);
                },
            });
            // Create final stream
            const finalStream = fileStream.pipe(progressStream);
            // Store active stream
            this.activeStreams.set(streamId, {
                stream: finalStream,
                progress,
                metadata,
                context,
            });
            // Set up cleanup on stream end
            finalStream.on('end', () => {
                this.activeStreams.delete(streamId);
            });
            finalStream.on('error', (error) => {
                this.activeStreams.delete(streamId);
                throw error;
            });
            // Set timeout
            if (streamOptions.timeout) {
                setTimeout(() => {
                    if (this.activeStreams.has(streamId)) {
                        this.activeStreams.get(streamId).stream.destroy();
                        this.activeStreams.delete(streamId);
                        throw new Error('Stream timeout');
                    }
                }, streamOptions.timeout);
            }
            return {
                stream: finalStream,
                metadata,
                progress,
            };
        }
        catch (error) {
            this.activeStreams.delete(streamId);
            throw error;
        }
    }
    /**
     * Streams directory listing with pagination
     */
    async *streamDirectoryListing(directoryPath, context, options = {}) {
        const streamOptions = { ...this.options, ...options };
        const streamId = this.generateStreamId();
        try {
            // Get directory stats
            const dirStats = await fs.stat(directoryPath);
            if (!dirStats.isDirectory()) {
                throw new Error('Path is not a directory');
            }
            // Create progress tracking
            const progress = {
                totalBytes: 0, // Will be updated as we discover files
                processedBytes: 0,
                percentage: 0,
                speed: 0,
                eta: 0,
                startTime: new Date(),
                lastUpdate: new Date(),
            };
            // Create metadata
            const metadata = {
                totalSize: 0,
                chunkSize: streamOptions.chunkSize,
                compressionEnabled: false,
                startTime: new Date(),
                streamId,
            };
            // Stream directory contents in batches
            const batchSize = 100; // Items per batch
            let offset = 0;
            let hasMore = true;
            let totalItems = 0;
            while (hasMore) {
                // Get batch of directory items
                const batch = await this.getDirectoryBatch(directoryPath, offset, batchSize);
                if (batch.length === 0) {
                    hasMore = false;
                    break;
                }
                totalItems += batch.length;
                progress.processedBytes = totalItems;
                progress.totalBytes = Math.max(progress.totalBytes, totalItems);
                progress.percentage = (progress.processedBytes / progress.totalBytes) * 100;
                // Update speed and ETA
                const now = new Date();
                const timeDiff = (now.getTime() - progress.lastUpdate.getTime()) / 1000;
                if (timeDiff >= 1) {
                    progress.speed = batch.length / timeDiff;
                    if (progress.speed > 0) {
                        const remainingItems = Math.max(0, progress.totalBytes - progress.processedBytes);
                        progress.eta = remainingItems / progress.speed;
                    }
                    progress.lastUpdate = now;
                }
                yield {
                    batch,
                    progress,
                    metadata,
                    hasMore: batch.length === batchSize,
                };
                offset += batchSize;
                // Check if we've reached the limit
                if (offset >= 10000) { // Max 10,000 items
                    hasMore = false;
                }
            }
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Streams file search results with pagination
     */
    async *streamSearchResults(query, searchPath, context, options = {}) {
        const streamOptions = { ...this.options, ...options };
        const streamId = this.generateStreamId();
        try {
            // Create progress tracking
            const progress = {
                totalBytes: 0,
                processedBytes: 0,
                percentage: 0,
                speed: 0,
                eta: 0,
                startTime: new Date(),
                lastUpdate: new Date(),
            };
            // Create metadata
            const metadata = {
                totalSize: 0,
                chunkSize: streamOptions.chunkSize,
                compressionEnabled: false,
                startTime: new Date(),
                streamId,
            };
            // Stream search results in batches
            const batchSize = 50; // Results per batch
            let offset = 0;
            let hasMore = true;
            let totalResults = 0;
            while (hasMore) {
                // Get batch of search results
                const searchResult = await this.fileSystemIntegration.searchFiles(query, searchPath, { maxResults: batchSize, offset }, context);
                const results = searchResult.data?.results || [];
                if (results.length === 0) {
                    hasMore = false;
                    break;
                }
                totalResults += results.length;
                progress.processedBytes = totalResults;
                progress.totalBytes = Math.max(progress.totalBytes, totalResults);
                progress.percentage = (progress.processedBytes / progress.totalBytes) * 100;
                // Update speed and ETA
                const now = new Date();
                const timeDiff = (now.getTime() - progress.lastUpdate.getTime()) / 1000;
                if (timeDiff >= 1) {
                    progress.speed = results.length / timeDiff;
                    if (progress.speed > 0) {
                        const remainingResults = Math.max(0, progress.totalBytes - progress.processedBytes);
                        progress.eta = remainingResults / progress.speed;
                    }
                    progress.lastUpdate = now;
                }
                yield {
                    results,
                    progress,
                    metadata,
                    hasMore: results.length === batchSize,
                };
                offset += batchSize;
                // Check if we've reached the limit
                if (offset >= 1000) { // Max 1,000 results
                    hasMore = false;
                }
            }
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Gets progress for an active stream
     */
    getStreamProgress(streamId) {
        const activeStream = this.activeStreams.get(streamId);
        return activeStream ? activeStream.progress : null;
    }
    /**
     * Cancels an active stream
     */
    cancelStream(streamId) {
        const activeStream = this.activeStreams.get(streamId);
        if (activeStream) {
            activeStream.stream.destroy();
            this.activeStreams.delete(streamId);
            return true;
        }
        return false;
    }
    /**
     * Gets all active streams
     */
    getActiveStreams() {
        return Array.from(this.activeStreams.entries()).map(([streamId, data]) => ({
            streamId,
            progress: data.progress,
            metadata: data.metadata,
            context: data.context,
        }));
    }
    /**
     * Gets streaming statistics
     */
    getStreamingStats() {
        const activeStreams = this.activeStreams.size;
        // In a real implementation, these would be tracked over time
        const totalStreamsProcessed = 0;
        const averageStreamSize = 0;
        const averageStreamDuration = 0;
        const totalBytesStreamed = 0;
        return {
            activeStreams,
            totalStreamsProcessed,
            averageStreamSize,
            averageStreamDuration,
            totalBytesStreamed,
        };
    }
    /**
     * Updates streaming options
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }
    /**
     * Cleans up all active streams
     */
    cleanup() {
        for (const [streamId, data] of this.activeStreams.entries()) {
            data.stream.destroy();
        }
        this.activeStreams.clear();
    }
    // Private methods
    generateStreamId() {
        return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async getDirectoryBatch(directoryPath, offset, batchSize) {
        try {
            // In a real implementation, this would read directory contents in batches
            // For now, we'll simulate it
            const mockItems = [];
            for (let i = 0; i < Math.min(batchSize, 10); i++) {
                mockItems.push({
                    name: `item_${offset + i}`,
                    type: i % 3 === 0 ? 'directory' : 'file',
                    size: Math.floor(Math.random() * 10000),
                    modifiedTime: new Date(),
                });
            }
            return mockItems;
        }
        catch (error) {
            throw new Error(`Failed to get directory batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.StreamingIntegration = StreamingIntegration;
//# sourceMappingURL=StreamingIntegration.js.map