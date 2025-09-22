# API Documentation

## MCP File Browser Server API

This document provides comprehensive API documentation for the MCP File Browser Server.

### Overview

The MCP File Browser Server implements the Model Context Protocol (MCP) to provide secure file system access for Large Language Models.

### MCP Tools

#### list_directory

Lists the contents of a directory with comprehensive metadata.

**Parameters:**
- `path` (string, required): Canonical path to directory
- `includeHidden` (boolean, optional): Whether to include hidden files (default: false)
- `maxDepth` (number, optional): Maximum directory depth (default: 1, max: 10)
- `sortBy` (string, optional): Sort order - "name", "size", "modified", "type" (default: "name")
- `sortOrder` (string, optional): Sort direction - "asc", "desc" (default: "asc")

**Response:**
```json
{
  "path": "/home/user/documents",
  "name": "documents",
  "files": [...],
  "directories": [...],
  "totalFiles": 10,
  "totalDirectories": 3,
  "totalSize": 1024000,
  "permissions": {...},
  "modifiedTime": "2025-01-27T10:00:00.000Z",
  "isSymbolicLink": false
}
```

#### read_file

Reads file contents with encoding detection and size validation.

**Parameters:**
- `path` (string, required): Canonical path to file
- `encoding` (string, optional): File encoding - "utf-8", "utf-16", "ascii", "binary", "auto" (default: "auto")
- `maxSize` (string, optional): Maximum file size (default: "100MB")
- `offset` (number, optional): Byte offset to start reading (default: 0)
- `limit` (number, optional): Maximum bytes to read

**Response:**
```json
{
  "path": "/home/user/documents/example.txt",
  "name": "example.txt",
  "size": 1024,
  "encoding": "utf-8",
  "content": "File content here",
  "contentType": "text/plain",
  "isTruncated": false,
  "contentHash": "sha256:...",
  "permissions": {...},
  "modifiedTime": "2025-01-27T10:00:00.000Z",
  "isSymbolicLink": false
}
```

#### search_files

Searches for files by name, extension, or content patterns.

**Parameters:**
- `query` (string, required): Search query
- `searchPath` (string, optional): Base path to search from (default: "/")
- `fileTypes` (array, optional): File extensions to search for
- `includeContent` (boolean, optional): Whether to search file contents (default: false)
- `maxResults` (number, optional): Maximum number of results (default: 100, max: 1000)
- `caseSensitive` (boolean, optional): Whether search is case sensitive (default: false)

**Response:**
```json
{
  "query": "configuration",
  "results": [...],
  "totalResults": 5,
  "searchPath": "/home/user",
  "duration": 45
}
```

#### get_file_metadata

Retrieves detailed metadata for a file or directory.

**Parameters:**
- `path` (string, required): Canonical path to file or directory
- `includeContentHash` (boolean, optional): Whether to compute content hash (default: false)

**Response:**
```json
{
  "path": "/home/user/documents/example.txt",
  "name": "example.txt",
  "size": 1024,
  "permissions": {...},
  "modifiedTime": "2025-01-27T10:00:00.000Z",
  "createdTime": "2025-01-27T09:00:00.000Z",
  "contentType": "text/plain",
  "encoding": "utf-8",
  "isSymbolicLink": false,
  "targetPath": null,
  "isAccessible": true,
  "isReadable": true,
  "contentHash": "sha256:..."
}
```

#### check_permissions

Verifies access permissions for a file or directory.

**Parameters:**
- `path` (string, required): Canonical path to file or directory
- `operation` (string, required): Operation to check - "read", "write", "execute", "delete"

**Response:**
```json
{
  "path": "/home/user/documents/example.txt",
  "operation": "read",
  "allowed": true,
  "permissions": {...},
  "reason": null
}
```

### Error Responses

All tools return structured error responses:

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Access denied to path: /etc/passwd",
    "details": {
      "path": "/etc/passwd",
      "reason": "Path is in denied list"
    },
    "timestamp": "2025-01-27T10:00:00.000Z",
    "requestId": "req_123456789"
  }
}
```

### Error Codes

- `INVALID_PATH`: Invalid or malformed path
- `PATH_NOT_FOUND`: File or directory does not exist
- `PERMISSION_DENIED`: Access denied due to permissions
- `FILE_TOO_LARGE`: File exceeds size limits
- `SECURITY_VIOLATION`: Security policy violation (e.g., directory traversal)
- `RESOURCE_LIMIT_EXCEEDED`: Resource limits exceeded
- `INVALID_INPUT`: Invalid input parameters
- `INTERNAL_ERROR`: Internal server error

### Rate Limiting

The server implements rate limiting to prevent abuse:
- Maximum 50 concurrent operations
- Request queuing when limits are exceeded
- Graceful degradation under high load

### Security Features

- Path validation prevents directory traversal attacks
- Configurable allowlist/denylist for directory access
- Comprehensive audit logging
- Resource limits prevent system overload
- Input validation and sanitization

### Performance

- Directory listing: < 2 seconds for 10,000+ files
- File metadata: < 500ms for files up to 100MB
- Streaming support for large files
- Intelligent caching with TTL
- Memory usage: < 100MB for normal operations

### LLM Integration

This server can be used from multiple LLM clients that support MCP. See examples and guides:

- Claude Desktop setup: `examples/llm-integration/claude-desktop.md`
- OpenAI GPT-4 integration: `examples/llm-integration/openai-gpt.md`
- Local LLM with Ollama: `examples/llm-integration/ollama-local.md`
- Complete runnable demo: `npm run example:complete`
- Integration tests runner: `npm run example:test`
