/**
 * Streaming Integration
 *
 * Implements streaming functionality for large files and directories.
 * Provides efficient streaming with memory optimization and progress tracking.
 */
import { Configuration } from '../models/Configuration';
import { FileSystemIntegration, IntegrationContext } from './FileSystemIntegration';
import { Readable } from 'stream';
export interface StreamingOptions {
    chunkSize?: number;
    maxConcurrentStreams?: number;
    enableCompression?: boolean;
    enableProgress?: boolean;
    bufferSize?: number;
    timeout?: number;
}
export interface StreamProgress {
    totalBytes: number;
    processedBytes: number;
    percentage: number;
    speed: number;
    eta: number;
    startTime: Date;
    lastUpdate: Date;
}
export interface StreamMetadata {
    totalSize: number;
    chunkSize: number;
    compressionEnabled: boolean;
    startTime: Date;
    streamId: string;
}
export declare class StreamingIntegration {
    private config;
    private fileSystemIntegration;
    private options;
    private activeStreams;
    constructor(config: Configuration, fileSystemIntegration: FileSystemIntegration, options?: StreamingOptions);
    /**
     * Streams file content with progress tracking
     */
    streamFile(filePath: string, context: IntegrationContext, options?: Partial<StreamingOptions>): Promise<{
        stream: Readable;
        metadata: StreamMetadata;
        progress: StreamProgress;
    }>;
    /**
     * Streams directory listing with pagination
     */
    streamDirectoryListing(directoryPath: string, context: IntegrationContext, options?: Partial<StreamingOptions>): AsyncGenerator<{
        batch: any[];
        progress: StreamProgress;
        metadata: StreamMetadata;
        hasMore: boolean;
    }>;
    /**
     * Streams file search results with pagination
     */
    streamSearchResults(query: string, searchPath: string, context: IntegrationContext, options?: Partial<StreamingOptions>): AsyncGenerator<{
        results: any[];
        progress: StreamProgress;
        metadata: StreamMetadata;
        hasMore: boolean;
    }>;
    /**
     * Gets progress for an active stream
     */
    getStreamProgress(streamId: string): StreamProgress | null;
    /**
     * Cancels an active stream
     */
    cancelStream(streamId: string): boolean;
    /**
     * Gets all active streams
     */
    getActiveStreams(): Array<{
        streamId: string;
        progress: StreamProgress;
        metadata: StreamMetadata;
        context: IntegrationContext;
    }>;
    /**
     * Gets streaming statistics
     */
    getStreamingStats(): {
        activeStreams: number;
        totalStreamsProcessed: number;
        averageStreamSize: number;
        averageStreamDuration: number;
        totalBytesStreamed: number;
    };
    /**
     * Updates streaming options
     */
    updateOptions(newOptions: Partial<StreamingOptions>): void;
    /**
     * Cleans up all active streams
     */
    cleanup(): void;
    private generateStreamId;
    private getDirectoryBatch;
}
//# sourceMappingURL=StreamingIntegration.d.ts.map