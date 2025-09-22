# Claude Desktop Integration

This guide shows how to configure Claude Desktop to use the MCP File Browser Server.

## Prerequisites

- **Claude Desktop** installed and running
- **MCP File Browser Server** running
- **Node.js 18+** (for the MCP server)

## Configuration

### 1. Claude Desktop Configuration

Create or edit the Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "file-browser": {
      "command": "node",
      "args": ["/path/to/your/mcp/src/server/MCPServer.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 2. MCP Server Configuration

Create a configuration file for the MCP server:

```json
{
  "server": {
    "name": "mcp-file-browser",
    "version": "1.0.0"
  },
  "security": {
    "allowedPaths": [
      "/Users/yourusername/Documents",
      "/Users/yourusername/Projects",
      "/Users/yourusername/Desktop"
    ],
    "deniedPaths": [
      "/etc",
      "/root",
      "/sys",
      "/private"
    ],
    "maxFileSize": "100MB",
    "maxDirectoryDepth": 10
  },
  "performance": {
    "cacheSize": "50MB",
    "cacheTTL": 300,
    "maxConcurrentOperations": 50
  },
  "logging": {
    "level": "info",
    "auditEnabled": true
  }
}
```

## Usage Examples

### Basic File Operations

Once configured, you can ask Claude to:

```
"List the contents of my Documents folder"
"Read the README.md file in my Projects directory"
"Search for all Python files in my codebase"
"Show me the metadata for the largest file in my Downloads folder"
```

### Advanced Workflows

```
"Analyze the structure of my project and suggest improvements"
"Find all TODO comments in my codebase and create a summary"
"Compare the file sizes between two directories"
"Help me organize my files by creating a folder structure based on file types"
```

## Example Conversations

### 1. Project Analysis
**User**: "Can you analyze my project structure and tell me what I'm working on?"

**Claude** (using MCP tools):
- Uses `list_directory` to explore the project root
- Uses `get_file_metadata` to understand file types and sizes
- Uses `read_file` to examine key files like README.md, package.json
- Provides a comprehensive analysis of the project

### 2. Code Review
**User**: "Review the main source files in my project for potential issues"

**Claude** (using MCP tools):
- Uses `search_files` to find source code files
- Uses `read_file` to examine each source file
- Uses `list_directory` to understand the project structure
- Provides detailed code review with suggestions

### 3. File Organization
**User**: "Help me organize my Downloads folder by file type"

**Claude** (using MCP tools):
- Uses `list_directory` to see all files in Downloads
- Uses `get_file_metadata` to determine file types
- Uses `search_files` to find files by extension
- Suggests a folder structure and can help implement it

## Security Features

The MCP File Browser Server provides several security features when used with Claude:

1. **Path Validation**: Prevents access to restricted directories
2. **Permission Checking**: Respects file system permissions
3. **Audit Logging**: Logs all file operations for security monitoring
4. **Resource Limits**: Prevents excessive resource usage

## Troubleshooting

### Common Issues

1. **Claude can't connect to MCP server**
   - Check the server is running: `ps aux | grep MCPServer`
   - Verify the path in claude_desktop_config.json is correct
   - Check server logs for errors

2. **Permission denied errors**
   - Verify the allowed paths in your configuration
   - Check file system permissions
   - Ensure the MCP server process has appropriate access

3. **Performance issues**
   - Check resource limits in configuration
   - Monitor cache usage
   - Consider reducing maxConcurrentOperations

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
export DEBUG=mcp:*
node /path/to/your/mcp/src/server/MCPServer.js
```

## Advanced Configuration

### Custom Tools

You can extend the MCP server with custom tools by modifying the server configuration:

```json
{
  "tools": {
    "custom_file_analyzer": {
      "enabled": true,
      "config": {
        "maxFileSize": "50MB",
        "supportedFormats": [".txt", ".md", ".py", ".js"]
      }
    }
  }
}
```

### Multiple Claude Instances

To use the MCP server with multiple Claude instances:

1. Run the MCP server as a standalone service
2. Configure each Claude instance to connect to the same server
3. Use different user contexts for each instance

## Best Practices

1. **Start with restricted paths** and gradually expand access
2. **Monitor audit logs** regularly for security issues
3. **Use specific queries** rather than broad file operations
4. **Set appropriate resource limits** based on your system
5. **Keep the MCP server updated** for security patches

## Next Steps

- Try the [OpenAI GPT-4 integration](./openai-gpt.md)
- Explore [local LLM options](./ollama-local.md)
- Check out [usage scenarios](./scenarios/) for more examples

