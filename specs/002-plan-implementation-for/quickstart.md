# Quickstart Guide: MCP File Browser Server

**Date**: 2025-01-27  
**Branch**: `002-plan-implementation-for`  
**Purpose**: Step-by-step validation guide for MCP File Browser Server functionality

## Prerequisites

- Node.js 18+ installed
- MCP client configured
- Test directory structure prepared
- Server running and accessible

## Test Environment Setup

### 1. Create Test Directory Structure
```bash
# Create test directories and files
mkdir -p /tmp/mcp-test/{documents,projects,private}
echo "Hello World" > /tmp/mcp-test/documents/hello.txt
echo "Configuration data" > /tmp/mcp-test/projects/config.json
echo "Sensitive data" > /tmp/mcp-test/private/secret.txt
chmod 600 /tmp/mcp-test/private/secret.txt
```

### 2. Configure Server
```json
{
  "allowedPaths": ["/tmp/mcp-test"],
  "deniedPaths": ["/tmp/mcp-test/private"],
  "maxFileSize": "10MB",
  "maxDirectoryDepth": 5,
  "cacheSize": "50MB",
  "cacheTTL": 300
}
```

## Validation Scenarios

### Scenario 1: Directory Listing
**Objective**: Validate directory listing functionality with metadata

**Steps**:
1. Connect MCP client to server
2. Call `list_directory` tool with path `/tmp/mcp-test`
3. Verify response structure and content

**Expected Results**:
```json
{
  "success": true,
  "data": {
    "path": "/tmp/mcp-test",
    "name": "mcp-test",
    "files": [],
    "directories": [
      {
        "path": "/tmp/mcp-test/documents",
        "name": "documents",
        "fileCount": 1,
        "subdirectoryCount": 0,
        "isAccessible": true
      },
      {
        "path": "/tmp/mcp-test/projects", 
        "name": "projects",
        "fileCount": 1,
        "subdirectoryCount": 0,
        "isAccessible": true
      },
      {
        "path": "/tmp/mcp-test/private",
        "name": "private", 
        "fileCount": 1,
        "subdirectoryCount": 0,
        "isAccessible": false
      }
    ],
    "totalFiles": 3,
    "totalDirectories": 3,
    "permissions": {
      "user": {"read": true, "write": true, "execute": true},
      "group": {"read": true, "write": false, "execute": true},
      "other": {"read": true, "write": false, "execute": true}
    }
  }
}
```

**Validation Points**:
- ✅ Response structure matches API contract
- ✅ Directory metadata is accurate
- ✅ Permissions are correctly reported
- ✅ Denied directories show as inaccessible

### Scenario 2: File Reading
**Objective**: Validate file content reading with encoding detection

**Steps**:
1. Call `read_file` tool with path `/tmp/mcp-test/documents/hello.txt`
2. Verify content and metadata
3. Test with different encoding options

**Expected Results**:
```json
{
  "success": true,
  "data": {
    "path": "/tmp/mcp-test/documents/hello.txt",
    "name": "hello.txt",
    "size": 11,
    "content": "Hello World",
    "encoding": "utf-8",
    "contentType": "text/plain",
    "isTruncated": false,
    "contentHash": "sha256:...",
    "permissions": {
      "user": {"read": true, "write": true, "execute": false},
      "group": {"read": true, "write": false, "execute": false},
      "other": {"read": true, "write": false, "execute": false}
    },
    "modifiedTime": "2025-01-27T10:00:00.000Z",
    "isSymbolicLink": false
  }
}
```

**Validation Points**:
- ✅ File content is correctly read
- ✅ Encoding is properly detected
- ✅ File metadata is accurate
- ✅ Content hash is computed

### Scenario 3: File Search
**Objective**: Validate file search functionality

**Steps**:
1. Call `search_files` tool with query "config"
2. Search in `/tmp/mcp-test` directory
3. Filter by file type `.json`

**Expected Results**:
```json
{
  "success": true,
  "data": {
    "query": "config",
    "results": [
      {
        "path": "/tmp/mcp-test/projects/config.json",
        "name": "config.json",
        "size": 19,
        "contentType": "application/json",
        "modifiedTime": "2025-01-27T10:00:00.000Z"
      }
    ],
    "totalResults": 1,
    "searchPath": "/tmp/mcp-test",
    "duration": 45
  }
}
```

**Validation Points**:
- ✅ Search finds matching files
- ✅ File type filtering works
- ✅ Search performance is acceptable
- ✅ Results include relevant metadata

### Scenario 4: Permission Checking
**Objective**: Validate permission verification system

**Steps**:
1. Call `check_permissions` for readable file
2. Call `check_permissions` for restricted file
3. Verify permission responses

**Expected Results**:
```json
// For accessible file
{
  "success": true,
  "data": {
    "path": "/tmp/mcp-test/documents/hello.txt",
    "operation": "read",
    "allowed": true,
    "permissions": {...},
    "reason": null
  }
}

// For restricted file
{
  "success": true,
  "data": {
    "path": "/tmp/mcp-test/private/secret.txt",
    "operation": "read", 
    "allowed": false,
    "permissions": {...},
    "reason": "Path is in denied list"
  }
}
```

**Validation Points**:
- ✅ Permission checking is accurate
- ✅ Denied paths are properly blocked
- ✅ Permission details are provided
- ✅ Clear reasons for denials

### Scenario 5: Security Validation
**Objective**: Validate security measures and attack prevention

**Steps**:
1. Attempt directory traversal attack
2. Try to access system files
3. Verify audit logging

**Test Cases**:
```javascript
// Directory traversal attempt
await mcpClient.callTool('read_file', {
  path: '../../../etc/passwd'
});
// Expected: Error with SECURITY_VIOLATION code

// System file access attempt  
await mcpClient.callTool('list_directory', {
  path: '/etc'
});
// Expected: Error with ACCESS_DENIED code

// Audit log verification
const logs = await getAuditLogs();
const securityLogs = logs.filter(log => 
  log.operation === 'SECURITY_VIOLATION'
);
// Expected: Security attempts logged
```

**Validation Points**:
- ✅ Directory traversal attacks blocked
- ✅ System file access prevented
- ✅ Security violations logged
- ✅ Clear error messages provided

### Scenario 6: Performance Validation
**Objective**: Validate performance requirements

**Steps**:
1. Create large directory structure
2. Measure response times
3. Test concurrent operations

**Performance Tests**:
```bash
# Create large directory structure
mkdir -p /tmp/mcp-test/large/{1..1000}
for i in {1..1000}; do
  echo "File $i content" > /tmp/mcp-test/large/$i/file.txt
done

# Test directory listing performance
time curl -X POST http://localhost:3000/tools/list_directory \
  -d '{"path": "/tmp/mcp-test/large"}'
# Expected: Response time < 2 seconds

# Test concurrent operations
for i in {1..10}; do
  curl -X POST http://localhost:3000/tools/get_file_metadata \
    -d "{\"path\": \"/tmp/mcp-test/large/$i/file.txt\"}" &
done
wait
# Expected: All operations complete successfully
```

**Validation Points**:
- ✅ Directory listing < 2 seconds for 1000+ files
- ✅ File metadata < 500ms response time
- ✅ Concurrent operations handled properly
- ✅ Memory usage within limits

### Scenario 7: Error Handling
**Objective**: Validate comprehensive error handling

**Steps**:
1. Test invalid inputs
2. Test file not found scenarios
3. Test resource limit scenarios

**Error Test Cases**:
```javascript
// Invalid path format
await mcpClient.callTool('list_directory', {
  path: 'invalid/path/format'
});
// Expected: INVALID_PATH error

// File not found
await mcpClient.callTool('read_file', {
  path: '/tmp/mcp-test/nonexistent.txt'
});
// Expected: FILE_NOT_FOUND error

// File too large
await mcpClient.callTool('read_file', {
  path: '/path/to/very/large/file.bin',
  maxSize: '1MB'
});
// Expected: FILE_TOO_LARGE error
```

**Validation Points**:
- ✅ Invalid inputs handled gracefully
- ✅ File not found errors clear
- ✅ Resource limits enforced
- ✅ Error messages helpful

### Scenario 8: Caching Validation
**Objective**: Validate caching functionality

**Steps**:
1. Perform repeated operations
2. Verify cache hits
3. Test cache invalidation

**Cache Tests**:
```javascript
// First access - cache miss
const start1 = Date.now();
await mcpClient.callTool('list_directory', {
  path: '/tmp/mcp-test'
});
const duration1 = Date.now() - start1;

// Second access - cache hit
const start2 = Date.now();
await mcpClient.callTool('list_directory', {
  path: '/tmp/mcp-test'
});
const duration2 = Date.now() - start2;

// Verify cache performance improvement
expect(duration2).toBeLessThan(duration1);
```

**Validation Points**:
- ✅ Cache improves performance
- ✅ Cache invalidation works
- ✅ Cache size limits respected
- ✅ TTL expiration handled

## Success Criteria

### Functional Requirements
- ✅ All 16 functional requirements validated
- ✅ MCP protocol compliance confirmed
- ✅ Security measures working
- ✅ Performance benchmarks met

### Non-Functional Requirements
- ✅ Error handling comprehensive
- ✅ Logging and monitoring functional
- ✅ Resource management effective
- ✅ Cross-platform compatibility

### User Acceptance
- ✅ Directory browsing intuitive
- ✅ File operations reliable
- ✅ Search functionality useful
- ✅ Permission system clear

## Troubleshooting

### Common Issues

**Connection Problems**:
- Verify server is running
- Check MCP client configuration
- Validate network connectivity

**Permission Errors**:
- Check file system permissions
- Verify server configuration
- Review audit logs

**Performance Issues**:
- Monitor resource usage
- Check cache configuration
- Review concurrent operation limits

**Security Violations**:
- Review allowed/denied paths
- Check path validation logic
- Verify audit logging

### Debug Information

**Server Logs**:
```bash
# Check server logs
tail -f /var/log/mcp-file-browser/server.log

# Check audit logs
tail -f /var/log/mcp-file-browser/audit.log
```

**Client Debugging**:
```javascript
// Enable debug logging
process.env.DEBUG = 'mcp:*';
```

**Performance Monitoring**:
```bash
# Monitor resource usage
htop
iostat -x 1
```

## Next Steps

After successful validation:
1. **Deploy to production** with appropriate configuration
2. **Set up monitoring** and alerting
3. **Configure backup** and recovery procedures
4. **Document operational** procedures
5. **Plan scaling** for increased load

## Support

For issues or questions:
- Check the [README.md](../../README.md) for general information
- Review the [specification](./spec.md) for detailed requirements
- Consult the [constitution](../../.specify/memory/constitution.md) for principles
- Open an issue on GitHub for bug reports
