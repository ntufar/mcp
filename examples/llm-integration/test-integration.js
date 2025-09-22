#!/usr/bin/env node

/**
 * MCP File Browser Server - LLM Integration Test
 * 
 * This script demonstrates how to test the MCP File Browser Server
 * with different LLM configurations.
 */

const { spawn } = require('child_process');
const path = require('path');

// Test configurations for different LLMs
const testConfigs = {
  claude: {
    name: 'Claude Desktop',
    command: 'node',
    args: [path.join(__dirname, '..', '..', 'src', 'server', 'MCPServer.js')],
    env: {
      NODE_ENV: 'test',
      MCP_CONFIG_PATH: path.join(__dirname, 'claude-config.json')
    }
  },
  gpt4: {
    name: 'OpenAI GPT-4',
    command: 'node',
    args: [path.join(__dirname, '..', '..', 'src', 'server', 'MCPServer.js')],
    env: {
      NODE_ENV: 'test',
      MCP_CONFIG_PATH: path.join(__dirname, 'gpt4-config.json')
    }
  },
  ollama: {
    name: 'Ollama Local LLM',
    command: 'node',
    args: [path.join(__dirname, '..', '..', 'src', 'server', 'MCPServer.js')],
    env: {
      NODE_ENV: 'test',
      MCP_CONFIG_PATH: path.join(__dirname, 'ollama-config.json')
    }
  }
};

// Test scenarios
const testScenarios = [
  {
    name: 'Directory Listing',
    description: 'Test listing directory contents',
    test: async (mcpClient) => {
      const result = await mcpClient.callTool('list_directory', {
        path: process.cwd(),
        includeHidden: false
      });
      console.log('✅ Directory listing successful');
      console.log(`Found ${result.contents?.length || 0} items`);
      return result;
    }
  },
  {
    name: 'File Reading',
    description: 'Test reading file contents',
    test: async (mcpClient) => {
      const result = await mcpClient.callTool('read_file', {
        path: path.join(process.cwd(), 'README.md'),
        encoding: 'utf-8',
        maxSize: '1MB'
      });
      console.log('✅ File reading successful');
      console.log(`Read ${result.content?.length || 0} characters`);
      return result;
    }
  },
  {
    name: 'File Search',
    description: 'Test searching for files',
    test: async (mcpClient) => {
      const result = await mcpClient.callTool('search_files', {
        query: '*.md',
        searchPath: process.cwd(),
        fileTypes: ['.md'],
        maxResults: 10
      });
      console.log('✅ File search successful');
      console.log(`Found ${result.results?.length || 0} files`);
      return result;
    }
  },
  {
    name: 'Metadata Retrieval',
    description: 'Test getting file metadata',
    test: async (mcpClient) => {
      const result = await mcpClient.callTool('get_file_metadata', {
        path: path.join(process.cwd(), 'package.json')
      });
      console.log('✅ Metadata retrieval successful');
      console.log(`File size: ${result.size} bytes`);
      return result;
    }
  },
  {
    name: 'Permission Check',
    description: 'Test checking file permissions',
    test: async (mcpClient) => {
      const result = await mcpClient.callTool('check_permissions', {
        path: process.cwd(),
        operation: 'read'
      });
      console.log('✅ Permission check successful');
      console.log(`Has read permission: ${result.hasPermission}`);
      return result;
    }
  }
];

// Mock MCP client for testing
class MockMCPClient {
  constructor(serverProcess) {
    this.serverProcess = serverProcess;
    this.requestId = 0;
  }

  async callTool(toolName, parameters) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      const request = {
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: parameters
        }
      };

      let responseData = '';
      
      this.serverProcess.stdout.on('data', (data) => {
        responseData += data.toString();
        
        // Try to parse complete JSON responses
        const lines = responseData.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              if (response.id === requestId) {
                if (response.error) {
                  reject(new Error(response.error.message));
                } else {
                  resolve(response.result);
                }
                return;
              }
            } catch (e) {
              // Not a complete JSON response yet
            }
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      // Send the request
      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');

      // Set timeout
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }

  close() {
    this.serverProcess.kill();
  }
}

// Test runner
async function runTests() {
  console.log('🧪 MCP File Browser Server - LLM Integration Tests');
  console.log('==================================================');
  console.log('');

  for (const [configName, config] of Object.entries(testConfigs)) {
    console.log(`\n🔍 Testing ${config.name} Configuration`);
    console.log('=====================================');

    try {
      // Start the MCP server
      const serverProcess = spawn(config.command, config.args, {
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mcpClient = new MockMCPClient(serverProcess);

      // Run test scenarios
      for (const scenario of testScenarios) {
        console.log(`\n📋 ${scenario.name}`);
        console.log(`   ${scenario.description}`);
        
        try {
          await scenario.test(mcpClient);
        } catch (error) {
          console.log(`❌ ${scenario.name} failed: ${error.message}`);
        }
      }

      // Clean up
      mcpClient.close();
      console.log(`\n✅ ${config.name} tests completed`);

    } catch (error) {
      console.log(`❌ ${config.name} configuration failed: ${error.message}`);
    }
  }

  console.log('\n🎉 All integration tests completed!');
  console.log('\nNext steps:');
  console.log('1. Review the test results above');
  console.log('2. Check the configuration files in this directory');
  console.log('3. Customize the configurations for your environment');
  console.log('4. Run the complete example: npm run example:complete');
}

// Create sample configuration files
function createConfigFiles() {
  const fs = require('fs');
  const configDir = __dirname;

  // Claude Desktop configuration
  const claudeConfig = {
    server: {
      name: 'mcp-file-browser',
      version: '1.0.0'
    },
    security: {
      allowedPaths: [process.cwd()],
      deniedPaths: ['/etc', '/root', '/sys'],
      maxFileSize: '100MB',
      maxDirectoryDepth: 10
    },
    performance: {
      cacheSize: '50MB',
      cacheTTL: 300,
      maxConcurrentOperations: 50
    }
  };

  // GPT-4 configuration
  const gpt4Config = {
    ...claudeConfig,
    security: {
      ...claudeConfig.security,
      maxFileSize: '50MB',
      maxDirectoryDepth: 8
    },
    performance: {
      cacheSize: '100MB',
      cacheTTL: 600,
      maxConcurrentOperations: 30
    }
  };

  // Ollama configuration
  const ollamaConfig = {
    ...claudeConfig,
    performance: {
      cacheSize: '200MB',
      cacheTTL: 1800,
      maxConcurrentOperations: 10
    }
  };

  // Write configuration files
  fs.writeFileSync(
    path.join(configDir, 'claude-config.json'),
    JSON.stringify(claudeConfig, null, 2)
  );
  
  fs.writeFileSync(
    path.join(configDir, 'gpt4-config.json'),
    JSON.stringify(gpt4Config, null, 2)
  );
  
  fs.writeFileSync(
    path.join(configDir, 'ollama-config.json'),
    JSON.stringify(ollamaConfig, null, 2)
  );

  console.log('📁 Configuration files created:');
  console.log('   - claude-config.json');
  console.log('   - gpt4-config.json');
  console.log('   - ollama-config.json');
}

// Main execution
if (require.main === module) {
  console.log('🚀 Setting up MCP File Browser Server integration tests...');
  createConfigFiles();
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  createConfigFiles,
  testConfigs,
  testScenarios
};

