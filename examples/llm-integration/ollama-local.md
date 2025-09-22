# Local LLM Integration with Ollama

This guide shows how to integrate the MCP File Browser Server with local LLMs using Ollama.

## Prerequisites

- **Ollama** installed and running
- **MCP File Browser Server** running
- **Node.js 18+** (for the MCP server)
- **Local model** (e.g., Llama 2, Mistral, CodeLlama)

## Why Use Local LLMs?

- **Privacy**: Your files never leave your machine
- **Cost**: No API costs for file operations
- **Speed**: No network latency for local operations
- **Control**: Full control over the model and data
- **Offline**: Works without internet connection

## Setup

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

### 2. Install a Model

```bash
# Install Llama 2 (7B parameters)
ollama pull llama2

# Install Mistral (7B parameters)
ollama pull mistral

# Install CodeLlama (7B parameters)
ollama pull codellama

# Install Llama 2 (13B parameters) - requires more RAM
ollama pull llama2:13b
```

### 3. Start Ollama

```bash
# Start Ollama server
ollama serve

# In another terminal, test the model
ollama run llama2
```

## MCP Client Implementation

Create a custom MCP client for Ollama:

```typescript
// examples/llm-integration/ollama-mcp-client.ts
import axios from 'axios';
import { MCPServer } from '../../src/server/MCPServer';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

class OllamaMCPClient {
  private ollamaUrl: string;
  private mcpServer: MCPServer;
  private model: string;

  constructor(ollamaUrl: string, model: string, mcpConfig: any) {
    this.ollamaUrl = ollamaUrl;
    this.model = model;
    this.mcpServer = new MCPServer(mcpConfig);
  }

  async chatWithFileAccess(prompt: string, context: any): Promise<string> {
    // Get available MCP tools
    const tools = await this.mcpServer.getAvailableTools();
    
    // Create a system prompt that includes available tools
    const systemPrompt = this.createSystemPrompt(tools);
    
    // Combine system prompt with user prompt
    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`;

    try {
      const response = await axios.post<OllamaResponse>(`${this.ollamaUrl}/api/generate`, {
        model: this.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2000
        }
      } as OllamaRequest);

      // Check if the response contains tool calls
      const toolCalls = this.extractToolCalls(response.data.response);
      
      if (toolCalls.length > 0) {
        // Execute tool calls
        const toolResults = await this.executeToolCalls(toolCalls, context);
        
        // Continue conversation with tool results
        const followUpPrompt = `${fullPrompt}\n\nTool Results: ${JSON.stringify(toolResults)}\n\nPlease provide a response based on the tool results.`;
        
        const followUpResponse = await axios.post<OllamaResponse>(`${this.ollamaUrl}/api/generate`, {
          model: this.model,
          prompt: followUpPrompt,
          stream: false
        } as OllamaRequest);

        return followUpResponse.data.response;
      }

      return response.data.response;
    } catch (error) {
      console.error('Ollama API error:', error);
      throw error;
    }
  }

  private createSystemPrompt(tools: any[]): string {
    return `You are a helpful AI assistant with access to file system operations through MCP (Model Context Protocol) tools.

Available tools:
${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

When you need to perform file operations, use this format:
TOOL_CALL: {"tool": "tool_name", "parameters": {"param1": "value1"}}

You can use multiple tools in sequence. Always explain what you're doing and provide helpful responses based on the results.

Be helpful, accurate, and respectful of file system permissions.`;
  }

  private extractToolCalls(response: string): any[] {
    const toolCallRegex = /TOOL_CALL:\s*(\{.*?\})/g;
    const toolCalls = [];
    let match;

    while ((match = toolCallRegex.exec(response)) !== null) {
      try {
        const toolCall = JSON.parse(match[1]);
        toolCalls.push(toolCall);
      } catch (error) {
        console.error('Error parsing tool call:', error);
      }
    }

    return toolCalls;
  }

  private async executeToolCalls(toolCalls: any[], context: any): Promise<any[]> {
    const results = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await this.mcpServer.executeTool(
          toolCall.tool,
          toolCall.parameters,
          context
        );
        results.push({
          tool: toolCall.tool,
          parameters: toolCall.parameters,
          result: result
        });
      } catch (error) {
        results.push({
          tool: toolCall.tool,
          parameters: toolCall.parameters,
          error: error.message
        });
      }
    }

    return results;
  }
}
```

## Configuration

### 1. MCP Server Configuration

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
    "cacheSize": "200MB",
    "cacheTTL": 1800,
    "maxConcurrentOperations": 10
  },
  "ollama": {
    "url": "http://localhost:11434",
    "model": "llama2",
    "timeout": 30000
  }
}
```

### 2. Environment Variables

```bash
# Ollama configuration
export OLLAMA_URL="http://localhost:11434"
export OLLAMA_MODEL="llama2"

# MCP server configuration
export MCP_CONFIG_PATH="/path/to/your/mcp-config.json"
```

## Usage Examples

### Basic File Operations

```typescript
import { OllamaMCPClient } from './ollama-mcp-client';

const client = new OllamaMCPClient(
  process.env.OLLAMA_URL!,
  process.env.OLLAMA_MODEL!,
  mcpConfig
);

// List directory contents
const response = await client.chatWithFileAccess(
  'List the contents of my Documents folder and tell me what files are there',
  {
    userId: 'user123',
    clientId: 'ollama-client',
    clientType: 'ollama-local',
    requestId: 'req-001',
    operation: 'list_directory',
    timestamp: new Date()
  }
);

console.log(response);
```

### Advanced File Analysis

```typescript
// Analyze project structure
const analysisResponse = await client.chatWithFileAccess(
  'Analyze my project structure, identify the main components, and suggest improvements',
  context
);

// Code review
const reviewResponse = await client.chatWithFileAccess(
  'Review the main source files in my project for potential issues and improvements',
  context
);

// File organization
const organizationResponse = await client.chatWithFileAccess(
  'Help me organize my Downloads folder by file type and suggest a cleanup strategy',
  context
);
```

## Example Conversations

### 1. Project Analysis
**User**: "Can you analyze my React project and tell me what needs to be improved?"

**Llama 2** (using MCP tools):
- Uses `list_directory` to explore the project structure
- Uses `read_file` to examine package.json and key source files
- Uses `search_files` to find specific patterns or issues
- Provides detailed analysis with specific recommendations

### 2. Code Documentation
**User**: "Help me document my Python project by reading the main files and creating a comprehensive README"

**CodeLlama** (using MCP tools):
- Uses `list_directory` to understand project structure
- Uses `read_file` to examine main Python files
- Uses `get_file_metadata` to understand file purposes
- Generates comprehensive documentation

### 3. File Search and Organization
**User**: "Find all my old backup files and help me decide what to keep"

**Mistral** (using MCP tools):
- Uses `search_files` to find backup files by pattern
- Uses `get_file_metadata` to check file ages and sizes
- Uses `list_directory` to understand file organization
- Provides cleanup recommendations

## Model-Specific Optimizations

### For CodeLlama (Code-focused tasks)
```typescript
const codeLlamaClient = new OllamaMCPClient(
  'http://localhost:11434',
  'codellama',
  {
    ...mcpConfig,
    ollama: {
      ...mcpConfig.ollama,
      options: {
        temperature: 0.3,  // Lower temperature for more focused code generation
        top_p: 0.9,
        max_tokens: 4000
      }
    }
  }
);
```

### For Llama 2 (General tasks)
```typescript
const llama2Client = new OllamaMCPClient(
  'http://localhost:11434',
  'llama2',
  {
    ...mcpConfig,
    ollama: {
      ...mcpConfig.ollama,
      options: {
        temperature: 0.7,  // Balanced creativity and accuracy
        top_p: 0.9,
        max_tokens: 2000
      }
    }
  }
);
```

### For Mistral (Efficient tasks)
```typescript
const mistralClient = new OllamaMCPClient(
  'http://localhost:11434',
  'mistral',
  {
    ...mcpConfig,
    ollama: {
      ...mcpConfig.ollama,
      options: {
        temperature: 0.5,  // More focused responses
        top_p: 0.8,
        max_tokens: 1500
      }
    }
  }
);
```

## Performance Considerations

### Memory Requirements
- **7B models**: ~8GB RAM minimum
- **13B models**: ~16GB RAM minimum
- **30B+ models**: ~32GB+ RAM

### Optimization Tips
1. **Use smaller models** for simple file operations
2. **Enable GPU acceleration** if available
3. **Adjust context length** based on your needs
4. **Use streaming** for long responses
5. **Cache frequently accessed files**

### Streaming Support
```typescript
async chatWithFileAccessStream(prompt: string, context: any): Promise<ReadableStream> {
  const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
    model: this.model,
    prompt: prompt,
    stream: true
  }, {
    responseType: 'stream'
  });

  return response.data;
}
```

## Security Benefits

Using local LLMs provides several security advantages:

1. **Data Privacy**: Files never leave your machine
2. **No API Logs**: No external service logs your data
3. **Offline Operation**: Works without internet
4. **Full Control**: You control the entire pipeline
5. **Audit Trail**: Complete control over logging

## Troubleshooting

### Common Issues

1. **Ollama not running**
   ```bash
   # Check if Ollama is running
   ps aux | grep ollama
   
   # Start Ollama
   ollama serve
   ```

2. **Model not found**
   ```bash
   # List available models
   ollama list
   
   # Pull the model
   ollama pull llama2
   ```

3. **Out of memory**
   - Use a smaller model
   - Close other applications
   - Increase swap space

4. **Slow responses**
   - Enable GPU acceleration
   - Use a smaller model
   - Reduce context length

### Debug Mode

```typescript
const client = new OllamaMCPClient(url, model, {
  ...mcpConfig,
  logging: {
    level: 'debug',
    enableToolCalls: true,
    enableResponses: true
  }
});
```

## Testing

```typescript
// examples/llm-integration/test-ollama-integration.ts
import { OllamaMCPClient } from './ollama-mcp-client';

describe('Ollama MCP Integration', () => {
  let client: OllamaMCPClient;

  beforeEach(() => {
    client = new OllamaMCPClient(
      'http://localhost:11434',
      'llama2',
      testConfig
    );
  });

  test('should list directory contents', async () => {
    const response = await client.chatWithFileAccess(
      'List the contents of /tmp',
      testContext
    );
    
    expect(response).toContain('directory');
  });

  test('should read file contents', async () => {
    const response = await client.chatWithFileAccess(
      'Read the README.md file',
      testContext
    );
    
    expect(response).toContain('file content');
  });
});
```

## Next Steps

- Try the [Claude Desktop integration](./claude-desktop.md)
- Explore [OpenAI GPT-4 integration](./openai-gpt.md)
- Check out [usage scenarios](./scenarios/) for more examples

