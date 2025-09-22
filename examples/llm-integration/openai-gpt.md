# OpenAI GPT-4 Integration

This guide shows how to integrate the MCP File Browser Server with OpenAI's GPT-4 using MCP clients.

## Prerequisites

- **OpenAI API Key** with GPT-4 access
- **MCP File Browser Server** running
- **Node.js 18+** (for the MCP server)
- **MCP Client** (we'll use a custom implementation)

## Setup Options

### Option 1: Custom MCP Client (Recommended)

Create a custom MCP client that connects to both OpenAI and your MCP server:

```typescript
// examples/llm-integration/openai-mcp-client.ts
import OpenAI from 'openai';
import { MCPServer } from '../../src/server/MCPServer';

class OpenAIMCPClient {
  private openai: OpenAI;
  private mcpServer: MCPServer;

  constructor(apiKey: string, mcpConfig: any) {
    this.openai = new OpenAI({ apiKey });
    this.mcpServer = new MCPServer(mcpConfig);
  }

  async chatWithFileAccess(messages: any[], context: any) {
    // Get available MCP tools
    const tools = await this.mcpServer.getAvailableTools();
    
    // Add MCP tools to OpenAI function calling
    const openaiTools = tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      tools: openaiTools,
      tool_choice: 'auto'
    });

    // Handle tool calls
    if (response.choices[0].message.tool_calls) {
      const toolCalls = response.choices[0].message.tool_calls;
      const toolResults = [];

      for (const toolCall of toolCalls) {
        const result = await this.mcpServer.executeTool(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments),
          context
        );
        toolResults.push({
          tool_call_id: toolCall.id,
          output: result
        });
      }

      // Continue conversation with tool results
      const followUpMessages = [
        ...messages,
        response.choices[0].message,
        {
          role: 'tool',
          content: JSON.stringify(toolResults)
        }
      ];

      return await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: followUpMessages
      });
    }

    return response;
  }
}
```

### Option 2: Using Existing MCP Clients

If you have access to an existing MCP client that supports OpenAI:

```json
{
  "mcpServers": {
    "file-browser": {
      "command": "node",
      "args": ["/path/to/your/mcp/src/server/MCPServer.js"]
    }
  },
  "openai": {
    "apiKey": "your-api-key-here",
    "model": "gpt-4"
  }
}
```

## Configuration

### 1. Environment Setup

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# Set MCP server configuration
export MCP_CONFIG_PATH="/path/to/your/mcp-config.json"
```

### 2. MCP Server Configuration

```json
{
  "server": {
    "name": "mcp-file-browser",
    "version": "1.0.0"
  },
  "security": {
    "allowedPaths": [
      "/Users/yourusername/Documents",
      "/Users/yourusername/Projects"
    ],
    "deniedPaths": [
      "/etc",
      "/root",
      "/sys"
    ],
    "maxFileSize": "50MB",
    "maxDirectoryDepth": 8
  },
  "performance": {
    "cacheSize": "100MB",
    "cacheTTL": 600,
    "maxConcurrentOperations": 30
  }
}
```

## Usage Examples

### Basic File Operations

```typescript
import { OpenAIMCPClient } from './openai-mcp-client';

const client = new OpenAIMCPClient(process.env.OPENAI_API_KEY!, mcpConfig);

// List directory contents
const response = await client.chatWithFileAccess([
  {
    role: 'user',
    content: 'List the contents of my Documents folder and tell me what files are there'
  }
], {
  userId: 'user123',
  clientId: 'gpt4-client',
  clientType: 'openai-gpt4',
  requestId: 'req-001',
  operation: 'list_directory',
  timestamp: new Date()
});
```

### Advanced File Analysis

```typescript
// Analyze project structure
const analysisResponse = await client.chatWithFileAccess([
  {
    role: 'user',
    content: 'Analyze my project structure, identify the main components, and suggest improvements'
  }
], context);

// Code review
const reviewResponse = await client.chatWithFileAccess([
  {
    role: 'user',
    content: 'Review the main source files in my project for potential issues and improvements'
  }
], context);
```

## Example Conversations

### 1. Project Analysis
**User**: "Can you analyze my React project and tell me what needs to be improved?"

**GPT-4** (using MCP tools):
- Uses `list_directory` to explore the project structure
- Uses `read_file` to examine package.json, src files, and configuration
- Uses `search_files` to find specific patterns or issues
- Provides detailed analysis with specific recommendations

### 2. Code Documentation
**User**: "Help me document my Python project by reading the main files and creating a comprehensive README"

**GPT-4** (using MCP tools):
- Uses `list_directory` to understand project structure
- Uses `read_file` to examine main Python files
- Uses `get_file_metadata` to understand file purposes
- Generates comprehensive documentation

### 3. File Organization
**User**: "My Downloads folder is a mess. Help me organize it by file type and suggest a cleanup strategy"

**GPT-4** (using MCP tools):
- Uses `list_directory` to see all files
- Uses `get_file_metadata` to categorize by type and size
- Uses `search_files` to find specific file patterns
- Provides organization strategy and cleanup recommendations

## Integration with OpenAI Function Calling

The MCP File Browser Server tools are designed to work seamlessly with OpenAI's function calling:

```typescript
const tools = [
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List contents of a directory with metadata',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list'
          },
          includeHidden: {
            type: 'boolean',
            description: 'Include hidden files and directories'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read file contents with encoding detection',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path to read'
          },
          maxSize: {
            type: 'string',
            description: 'Maximum file size to read'
          }
        },
        required: ['path']
      }
    }
  }
  // ... other MCP tools
];
```

## Security Considerations

When using with OpenAI GPT-4:

1. **API Key Security**: Store your OpenAI API key securely
2. **Path Restrictions**: Configure allowed paths carefully
3. **Audit Logging**: Monitor all file operations
4. **Rate Limiting**: Respect OpenAI's rate limits
5. **Data Privacy**: Be aware that file contents may be sent to OpenAI

## Performance Optimization

### Caching Strategy
```json
{
  "performance": {
    "cacheSize": "200MB",
    "cacheTTL": 1800,
    "preloadCommonPaths": true,
    "cacheStrategy": "lru"
  }
}
```

### Concurrent Operations
```json
{
  "performance": {
    "maxConcurrentOperations": 20,
    "requestTimeout": 30000,
    "retryAttempts": 3
  }
}
```

## Error Handling

```typescript
try {
  const response = await client.chatWithFileAccess(messages, context);
  return response;
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Handle rate limiting
    await new Promise(resolve => setTimeout(resolve, 60000));
    return await client.chatWithFileAccess(messages, context);
  } else if (error.code === 'INVALID_PATH') {
    // Handle path validation errors
    return { error: 'Invalid file path provided' };
  }
  throw error;
}
```

## Testing

Create test cases for your integration:

```typescript
// examples/llm-integration/test-openai-integration.ts
import { OpenAIMCPClient } from './openai-mcp-client';

describe('OpenAI MCP Integration', () => {
  let client: OpenAIMCPClient;

  beforeEach(() => {
    client = new OpenAIMCPClient(process.env.OPENAI_API_KEY!, testConfig);
  });

  test('should list directory contents', async () => {
    const response = await client.chatWithFileAccess([
      { role: 'user', content: 'List the contents of /tmp' }
    ], testContext);
    
    expect(response.choices[0].message.content).toContain('directory');
  });

  test('should read file contents', async () => {
    const response = await client.chatWithFileAccess([
      { role: 'user', content: 'Read the README.md file' }
    ], testContext);
    
    expect(response.choices[0].message.content).toContain('file content');
  });
});
```

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Verify your OpenAI API key is valid
   - Check you have GPT-4 access
   - Ensure billing is set up correctly

2. **MCP Connection Issues**
   - Verify the MCP server is running
   - Check the server configuration
   - Test the MCP server independently

3. **Function Calling Issues**
   - Ensure tools are properly defined
   - Check parameter validation
   - Verify response format

### Debug Mode

Enable detailed logging:

```typescript
const client = new OpenAIMCPClient(apiKey, {
  ...mcpConfig,
  logging: {
    level: 'debug',
    enableToolCalls: true,
    enableResponses: true
  }
});
```

## Next Steps

- Try the [Claude Desktop integration](./claude-desktop.md)
- Explore [local LLM options](./ollama-local.md)
- Check out [usage scenarios](./scenarios/) for more examples

