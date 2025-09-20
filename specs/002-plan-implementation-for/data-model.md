# Data Model: MCP File Browser Server

**Date**: 2025-01-27  
**Branch**: `002-plan-implementation-for`  
**Purpose**: Data model definition for MCP File Browser Server entities and relationships

## Core Entities

### Directory
Represents a file system directory with comprehensive metadata.

**Fields**:
- `path`: string (required) - Canonical directory path
- `name`: string (required) - Directory name
- `parentPath`: string (optional) - Parent directory path
- `permissions`: PermissionInfo (required) - Read/write/execute permissions
- `modifiedTime`: Date (required) - Last modification timestamp
- `createdTime`: Date (required) - Creation timestamp
- `fileCount`: number (required) - Number of files in directory
- `subdirectoryCount`: number (required) - Number of subdirectories
- `totalSize`: number (required) - Total size in bytes
- `isSymbolicLink`: boolean (required) - Whether this is a symbolic link
- `targetPath`: string (optional) - Target path if symbolic link
- `isAccessible`: boolean (required) - Whether directory is accessible
- `lastAccessed`: Date (optional) - Last access timestamp

**Validation Rules**:
- Path must be canonical (resolved)
- Path must not contain traversal sequences
- Path must be within allowed base directories
- Permissions must be valid for current user
- Timestamps must be valid dates

**State Transitions**:
- `initializing` → `accessible` → `inaccessible`
- `accessible` → `permission_denied`
- `inaccessible` → `accessible` (if permissions change)

### File
Represents a file system file with metadata and content information.

**Fields**:
- `path`: string (required) - Canonical file path
- `name`: string (required) - File name
- `directoryPath`: string (required) - Parent directory path
- `size`: number (required) - File size in bytes
- `permissions`: PermissionInfo (required) - Read/write/execute permissions
- `modifiedTime`: Date (required) - Last modification timestamp
- `createdTime`: Date (required) - Creation timestamp
- `contentType`: string (optional) - MIME type or content type
- `encoding`: string (optional) - File encoding (utf-8, binary, etc.)
- `isSymbolicLink`: boolean (required) - Whether this is a symbolic link
- `targetPath`: string (optional) - Target path if symbolic link
- `isAccessible`: boolean (required) - Whether file is accessible
- `isReadable`: boolean (required) - Whether file is readable
- `lastAccessed`: Date (optional) - Last access timestamp
- `contentHash`: string (optional) - SHA-256 hash of file content

**Validation Rules**:
- Path must be canonical (resolved)
- Path must not contain traversal sequences
- Size must be non-negative
- Content type must be valid MIME type
- Encoding must be supported
- Hash must be valid SHA-256 if present

**State Transitions**:
- `initializing` → `accessible` → `inaccessible`
- `accessible` → `permission_denied`
- `inaccessible` → `accessible` (if permissions change)

### PermissionInfo
Represents file system permissions for users, groups, and others.

**Fields**:
- `user`: PermissionSet (required) - User permissions
- `group`: PermissionSet (required) - Group permissions
- `other`: PermissionSet (required) - Other permissions
- `owner`: string (required) - File/directory owner
- `group`: string (required) - File/directory group
- `sticky`: boolean (optional) - Sticky bit set
- `setuid`: boolean (optional) - Setuid bit set
- `setgid`: boolean (optional) - Setgid bit set

**Validation Rules**:
- All permission sets must be valid
- Owner and group must be valid system identifiers
- Special bits must be boolean

### PermissionSet
Represents read, write, and execute permissions.

**Fields**:
- `read`: boolean (required) - Read permission
- `write`: boolean (required) - Write permission
- `execute`: boolean (required) - Execute permission

**Validation Rules**:
- All fields must be boolean
- Permissions must be consistent with file type

### AccessLog
Represents an audit record of file system operations.

**Fields**:
- `id`: string (required) - Unique log entry identifier
- `timestamp`: Date (required) - Operation timestamp
- `userId`: string (required) - User/client identifier
- `operation`: OperationType (required) - Type of operation performed
- `targetPath`: string (required) - Path of file/directory accessed
- `success`: boolean (required) - Whether operation succeeded
- `errorCode`: string (optional) - Error code if operation failed
- `errorMessage`: string (optional) - Error message if operation failed
- `duration`: number (required) - Operation duration in milliseconds
- `bytesProcessed`: number (optional) - Number of bytes processed
- `metadata`: object (optional) - Additional operation metadata

**Validation Rules**:
- ID must be unique
- Timestamp must be valid date
- Operation must be valid type
- Target path must be canonical
- Duration must be non-negative
- Bytes processed must be non-negative if present

**State Transitions**:
- `started` → `completed` | `failed`
- `completed` → `logged`
- `failed` → `logged`

### OperationType
Enumeration of supported file system operations.

**Values**:
- `LIST_DIRECTORY`: List directory contents
- `READ_FILE`: Read file content
- `SEARCH_FILES`: Search for files
- `GET_METADATA`: Get file/directory metadata
- `CHECK_PERMISSIONS`: Check access permissions
- `CACHE_READ`: Read from cache
- `CACHE_WRITE`: Write to cache
- `CACHE_INVALIDATE`: Invalidate cache entry

### Configuration
Represents server configuration settings.

**Fields**:
- `allowedPaths`: string[] (required) - List of allowed base directories
- `deniedPaths`: string[] (required) - List of explicitly denied paths
- `maxFileSize`: number (required) - Maximum file size in bytes
- `maxDirectoryDepth`: number (required) - Maximum directory traversal depth
- `cacheSize`: number (required) - Maximum cache size in bytes
- `cacheTTL`: number (required) - Cache time-to-live in seconds
- `maxConcurrentOperations`: number (required) - Maximum concurrent operations
- `enableAuditLogging`: boolean (required) - Whether to enable audit logging
- `logRetentionDays`: number (required) - Log retention period in days
- `enableSymbolicLinkFollowing`: boolean (required) - Whether to follow symlinks
- `enableContentHashing`: boolean (required) - Whether to compute content hashes
- `defaultEncoding`: string (required) - Default file encoding

**Validation Rules**:
- All paths must be canonical
- All numeric values must be positive
- Encoding must be supported
- Configuration must be valid for target platform

### CacheEntry
Represents a cached file metadata or directory listing.

**Fields**:
- `key`: string (required) - Cache entry key
- `type`: CacheEntryType (required) - Type of cached data
- `data`: object (required) - Cached data payload
- `createdAt`: Date (required) - Cache entry creation time
- `lastAccessed`: Date (required) - Last access time
- `accessCount`: number (required) - Number of times accessed
- `ttl`: number (required) - Time-to-live in seconds
- `size`: number (required) - Size of cached data in bytes
- `isValid`: boolean (required) - Whether cache entry is valid

**Validation Rules**:
- Key must be unique
- Type must be valid
- Data must be serializable
- TTL must be positive
- Size must be non-negative

**State Transitions**:
- `created` → `valid` → `expired` | `invalidated`
- `valid` → `accessed`
- `expired` → `removed`
- `invalidated` → `removed`

### CacheEntryType
Enumeration of cache entry types.

**Values**:
- `DIRECTORY_LISTING`: Cached directory contents
- `FILE_METADATA`: Cached file metadata
- `PERMISSION_INFO`: Cached permission information
- `CONTENT_HASH`: Cached file content hash

## Entity Relationships

### Directory Relationships
- **Directory** `hasMany` **Directory** (subdirectories)
- **Directory** `hasMany` **File** (files)
- **Directory** `belongsTo` **Directory** (parent directory)
- **Directory** `hasOne` **PermissionInfo**

### File Relationships
- **File** `belongsTo` **Directory** (parent directory)
- **File** `hasOne` **PermissionInfo**
- **File** `hasMany` **AccessLog** (access records)

### AccessLog Relationships
- **AccessLog** `belongsTo` **File** (target file)
- **AccessLog** `belongsTo` **Directory** (target directory)

### CacheEntry Relationships
- **CacheEntry** `references` **File** (cached file data)
- **CacheEntry** `references` **Directory** (cached directory data)

## Data Validation Rules

### Path Validation
- All paths must be canonical (resolved using `path.resolve()`)
- Paths must not contain traversal sequences (`..`, `.`)
- Paths must be within configured allowed base directories
- Symbolic links must be resolved according to configuration

### Permission Validation
- All permission checks must respect OS-level permissions
- Permission overrides must be explicitly configured
- Permission changes must be logged for audit

### Size and Resource Validation
- File sizes must not exceed configured maximum
- Directory depth must not exceed configured maximum
- Memory usage must not exceed configured limits
- Cache size must not exceed configured limits

### Temporal Validation
- All timestamps must be valid dates
- Cache TTL must be positive
- Log retention periods must be reasonable
- Access times must be consistent with operation times

## State Management

### Entity Lifecycle
1. **Creation**: Entity created with initial state
2. **Validation**: Entity validated against rules
3. **Persistence**: Entity stored in cache or file system
4. **Access**: Entity accessed and potentially modified
5. **Cleanup**: Entity removed when no longer needed

### Cache Lifecycle
1. **Creation**: Cache entry created with TTL
2. **Access**: Cache entry accessed and updated
3. **Expiration**: Cache entry expires based on TTL
4. **Invalidation**: Cache entry invalidated due to changes
5. **Removal**: Cache entry removed from cache

### Audit Lifecycle
1. **Operation Start**: Access log entry created
2. **Operation Progress**: Log entry updated with progress
3. **Operation Complete**: Log entry finalized with result
4. **Retention**: Log entry retained according to policy
5. **Cleanup**: Log entry removed after retention period

## Error Handling

### Validation Errors
- Invalid paths: Return clear error messages
- Permission denied: Log attempt and return appropriate error
- Resource limits exceeded: Return resource limit error
- Configuration errors: Return configuration error

### System Errors
- File system errors: Handle gracefully with logging
- Memory errors: Implement graceful degradation
- Network errors: Retry with exponential backoff
- Cache errors: Fall back to direct file system access

### Recovery Strategies
- Invalid cache entries: Remove and regenerate
- Corrupted metadata: Rebuild from file system
- Permission changes: Refresh cached permissions
- System resource exhaustion: Implement backpressure
