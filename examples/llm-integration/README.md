# MCP File Browser Server - LLM Integration Examples

This directory contains practical examples of how to integrate the MCP File Browser Server with various Large Language Models (LLMs).

## Supported LLMs

The MCP File Browser Server is compatible with any LLM that supports the Model Context Protocol (MCP). Here are the main categories:

### 1. **Anthropic Claude** ✅
- **Claude Desktop** (Recommended)
- **Claude API** via MCP clients
- **Claude Sonnet, Haiku, Opus**

### 2. **OpenAI GPT Series** ✅
- **GPT-4** (via MCP clients)
- **GPT-3.5 Turbo** (via MCP clients)
- **Custom OpenAI API integrations**

### 3. **Google Gemini** ✅
- **Gemini Pro** (via MCP clients)
- **Gemini Advanced** (via MCP clients)

### 4. **Local LLMs** ✅
- **Ollama** (Llama, Mistral, CodeLlama, etc.)
- **LM Studio**
- **Custom local models**

### 5. **Other MCP-Compatible LLMs** ✅
- **Qwen** (Alibaba)
- **DeepSeek**
- **Custom MCP clients**

## Quick Start

1. **Start the MCP File Browser Server**:
   ```bash
   npm start
   # Server runs on stdio by default
   ```

2. **Configure your LLM client** (see specific examples below)

3. **Test the integration**:
   ```bash
   # Test with Claude Desktop
   npm run test:llm:claude
   
   # Test with GPT-4
   npm run test:llm:gpt4
   
   # Test with Gemini
   npm run test:llm:gemini
   ```

## Configuration Examples

- [`claude-desktop.md`](./claude-desktop.md) - Claude Desktop configuration
- [`openai-gpt.md`](./openai-gpt.md) - OpenAI GPT-4 configuration  
- [`ollama-local.md`](./ollama-local.md) - Local LLM with Ollama
- [`custom-client.md`](./custom-client.md) - Custom MCP client setup

## Usage Scenarios

- [`file-analysis.md`](./scenarios/file-analysis.md) - File content analysis workflows
- [`code-review.md`](./scenarios/code-review.md) - Code review and analysis
- [`document-search.md`](./scenarios/document-search.md) - Document search and retrieval
- [`project-navigation.md`](./scenarios/project-navigation.md) - Project structure navigation

## Security Considerations

⚠️ **Important**: Before using with any LLM, ensure you've configured:

1. **Allowed paths** in your MCP server configuration
2. **Permission levels** appropriate for your use case
3. **Audit logging** enabled for security monitoring
4. **Resource limits** to prevent abuse

See the main [Configuration Guide](../../docs/configuration.md) for details.

## Troubleshooting

- **Connection Issues**: Check MCP server is running and accessible
- **Permission Errors**: Verify allowed paths and user permissions
- **Performance Issues**: Check resource limits and cache configuration
- **LLM Integration**: Ensure your LLM client supports MCP protocol

## Contributing

To add support for a new LLM or improve existing examples:

1. Create a new configuration file following the existing patterns
2. Add test cases to the appropriate test suite
3. Update this README with the new LLM information
4. Submit a pull request

---

**Need Help?** Check the [main documentation](../../README.md) or [open an issue](https://github.com/ntufar/mcp/issues).

