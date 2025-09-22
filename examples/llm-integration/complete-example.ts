/**
 * Complete MCP File Browser Server Integration Example
 * 
 * This example demonstrates how to integrate the MCP File Browser Server
 * with various LLMs for real-world file system operations.
 */

import { FileSystemIntegration } from '../../src/integration/FileSystemIntegration';
import { Configuration } from '../../src/models/Configuration';

// Example 1: Claude Desktop Integration
export class ClaudeDesktopExample {
  private integration: FileSystemIntegration;

  constructor() {
    const config = new Configuration({
      server: {
        name: 'mcp-file-browser',
        version: '1.0.0'
      },
      security: {
        allowedPaths: [
          '/Users/yourusername/Documents',
          '/Users/yourusername/Projects',
          '/Users/yourusername/Desktop'
        ],
        deniedPaths: [
          '/etc',
          '/root',
          '/sys',
          '/private'
        ],
        maxFileSize: '100MB',
        maxDirectoryDepth: 10
      },
      performance: {
        cacheSize: '50MB',
        cacheTTL: 300,
        maxConcurrentOperations: 50
      }
    });

    this.integration = new FileSystemIntegration(config);
  }

  async demonstrateProjectAnalysis(): Promise<void> {
    console.log('🔍 Claude Desktop: Project Analysis Demo');
    console.log('=====================================');

    const context = {
      userId: 'claude-user',
      clientId: 'claude-desktop',
      clientType: 'claude-desktop',
      requestId: 'demo-001',
      operation: 'project_analysis',
      timestamp: new Date()
    };

    try {
      // 1. List project root directory
      console.log('\n1. Exploring project structure...');
      const projectRoot = await this.integration.listDirectory(
        '/Users/yourusername/Projects/mcp',
        { includeHidden: false, maxDepth: 2 },
        context
      );
      console.log('Project structure:', projectRoot);

      // 2. Read key configuration files
      console.log('\n2. Reading configuration files...');
      const packageJson = await this.integration.readFile(
        '/Users/yourusername/Projects/mcp/package.json',
        { encoding: 'utf-8' },
        context
      );
      console.log('Package.json:', packageJson);

      // 3. Search for source files
      console.log('\n3. Finding source files...');
      const sourceFiles = await this.integration.searchFiles(
        '*.ts',
        '/Users/yourusername/Projects/mcp/src',
        { fileTypes: ['.ts'], maxResults: 10 },
        context
      );
      console.log('Source files found:', sourceFiles);

      // 4. Get metadata for key files
      console.log('\n4. Analyzing file metadata...');
      const readmeMetadata = await this.integration.getFileMetadata(
        '/Users/yourusername/Projects/mcp/README.md',
        {},
        context
      );
      console.log('README metadata:', readmeMetadata);

      console.log('\n✅ Project analysis complete!');
      console.log('Claude would now provide insights about:');
      console.log('- Project type and technology stack');
      console.log('- Main components and architecture');
      console.log('- Configuration and dependencies');
      console.log('- Potential improvements');

    } catch (error) {
      console.error('❌ Error during project analysis:', error);
    }
  }

  async demonstrateCodeReview(): Promise<void> {
    console.log('\n🔍 Claude Desktop: Code Review Demo');
    console.log('==================================');

    const context = {
      userId: 'claude-user',
      clientId: 'claude-desktop',
      clientType: 'claude-desktop',
      requestId: 'demo-002',
      operation: 'code_review',
      timestamp: new Date()
    };

    try {
      // 1. Find source code files
      console.log('\n1. Finding source code files...');
      const sourceFiles = await this.integration.searchFiles(
        'Service.ts',
        '/Users/yourusername/Projects/mcp/src/services',
        { fileTypes: ['.ts'] },
        context
      );
      console.log('Service files found:', sourceFiles);

      // 2. Read and analyze each service file
      for (const file of sourceFiles.results || []) {
        console.log(`\n2. Analyzing ${file.name}...`);
        const fileContent = await this.integration.readFile(
          file.path,
          { encoding: 'utf-8', maxSize: '1MB' },
          context
        );
        
        // Claude would analyze the code here
        console.log(`✅ Analyzed ${file.name} (${file.size} bytes)`);
        console.log('Claude would check for:');
        console.log('- Code quality and best practices');
        console.log('- Security vulnerabilities');
        console.log('- Performance issues');
        console.log('- Potential bugs');
      }

      console.log('\n✅ Code review complete!');

    } catch (error) {
      console.error('❌ Error during code review:', error);
    }
  }
}

// Example 2: OpenAI GPT-4 Integration
export class OpenAIGPT4Example {
  private integration: FileSystemIntegration;

  constructor() {
    const config = new Configuration({
      server: {
        name: 'mcp-file-browser',
        version: '1.0.0'
      },
      security: {
        allowedPaths: [
          '/Users/yourusername/Documents',
          '/Users/yourusername/Projects'
        ],
        deniedPaths: [
          '/etc',
          '/root',
          '/sys'
        ],
        maxFileSize: '50MB',
        maxDirectoryDepth: 8
      },
      performance: {
        cacheSize: '100MB',
        cacheTTL: 600,
        maxConcurrentOperations: 30
      }
    });

    this.integration = new FileSystemIntegration(config);
  }

  async demonstrateDocumentSearch(): Promise<void> {
    console.log('\n🔍 GPT-4: Document Search Demo');
    console.log('==============================');

    const context = {
      userId: 'gpt4-user',
      clientId: 'openai-gpt4',
      clientType: 'openai-gpt4',
      requestId: 'demo-003',
      operation: 'document_search',
      timestamp: new Date()
    };

    try {
      // 1. Search for documentation files
      console.log('\n1. Searching for documentation...');
      const docFiles = await this.integration.searchFiles(
        'documentation OR README OR guide',
        '/Users/yourusername/Projects/mcp',
        { fileTypes: ['.md', '.txt', '.rst'], maxResults: 20 },
        context
      );
      console.log('Documentation files found:', docFiles);

      // 2. Search for API-related content
      console.log('\n2. Searching for API documentation...');
      const apiFiles = await this.integration.searchFiles(
        'API OR endpoint OR tool',
        '/Users/yourusername/Projects/mcp',
        { fileTypes: ['.md', '.ts'], maxResults: 15 },
        context
      );
      console.log('API-related files found:', apiFiles);

      // 3. Read and analyze key documentation
      for (const file of (docFiles.results || []).slice(0, 3)) {
        console.log(`\n3. Reading ${file.name}...`);
        const content = await this.integration.readFile(
          file.path,
          { encoding: 'utf-8', maxSize: '500KB' },
          context
        );
        console.log(`✅ Read ${file.name} (${file.size} bytes)`);
      }

      console.log('\n✅ Document search complete!');
      console.log('GPT-4 would now provide:');
      console.log('- Comprehensive documentation summary');
      console.log('- API usage examples');
      console.log('- Integration guides');
      console.log('- Missing documentation suggestions');

    } catch (error) {
      console.error('❌ Error during document search:', error);
    }
  }

  async demonstrateFileOrganization(): Promise<void> {
    console.log('\n🔍 GPT-4: File Organization Demo');
    console.log('=================================');

    const context = {
      userId: 'gpt4-user',
      clientId: 'openai-gpt4',
      clientType: 'openai-gpt4',
      requestId: 'demo-004',
      operation: 'file_organization',
      timestamp: new Date()
    };

    try {
      // 1. Analyze Downloads folder
      console.log('\n1. Analyzing Downloads folder...');
      const downloads = await this.integration.listDirectory(
        '/Users/yourusername/Downloads',
        { includeHidden: false, maxDepth: 1 },
        context
      );
      console.log('Downloads folder contents:', downloads);

      // 2. Get metadata for all files
      console.log('\n2. Getting file metadata...');
      const fileMetadata = [];
      for (const item of downloads.contents || []) {
        if (item.type === 'file') {
          const metadata = await this.integration.getFileMetadata(
            item.path,
            {},
            context
          );
          fileMetadata.push(metadata);
        }
      }
      console.log(`✅ Analyzed ${fileMetadata.length} files`);

      // 3. Categorize files by type
      console.log('\n3. Categorizing files...');
      const categories = this.categorizeFiles(fileMetadata);
      console.log('File categories:', categories);

      console.log('\n✅ File organization analysis complete!');
      console.log('GPT-4 would now provide:');
      console.log('- File categorization by type and purpose');
      console.log('- Suggested folder structure');
      console.log('- Duplicate file identification');
      console.log('- Cleanup recommendations');

    } catch (error) {
      console.error('❌ Error during file organization:', error);
    }
  }

  private categorizeFiles(files: any[]): Record<string, any[]> {
    const categories: Record<string, any[]> = {
      images: [],
      documents: [],
      archives: [],
      executables: [],
      media: [],
      other: []
    };

    for (const file of files) {
      const extension = file.extension?.toLowerCase() || '';
      
      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].includes(extension)) {
        categories.images.push(file);
      } else if (['.pdf', '.doc', '.docx', '.txt', '.rtf'].includes(extension)) {
        categories.documents.push(file);
      } else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(extension)) {
        categories.archives.push(file);
      } else if (['.exe', '.dmg', '.pkg', '.deb', '.rpm'].includes(extension)) {
        categories.executables.push(file);
      } else if (['.mp4', '.avi', '.mov', '.mp3', '.wav'].includes(extension)) {
        categories.media.push(file);
      } else {
        categories.other.push(file);
      }
    }

    return categories;
  }
}

// Example 3: Local LLM Integration (Ollama)
export class OllamaLocalExample {
  private integration: FileSystemIntegration;

  constructor() {
    const config = new Configuration({
      server: {
        name: 'mcp-file-browser',
        version: '1.0.0'
      },
      security: {
        allowedPaths: [
          '/Users/yourusername/Documents',
          '/Users/yourusername/Projects'
        ],
        deniedPaths: [
          '/etc',
          '/root',
          '/sys'
        ],
        maxFileSize: '100MB',
        maxDirectoryDepth: 10
      },
      performance: {
        cacheSize: '200MB',
        cacheTTL: 1800,
        maxConcurrentOperations: 10
      }
    });

    this.integration = new FileSystemIntegration(config);
  }

  async demonstrateSecurityAudit(): Promise<void> {
    console.log('\n🔍 Local LLM: Security Audit Demo');
    console.log('=================================');

    const context = {
      userId: 'local-user',
      clientId: 'ollama-local',
      clientType: 'ollama-local',
      requestId: 'demo-005',
      operation: 'security_audit',
      timestamp: new Date()
    };

    try {
      // 1. Check permissions on key directories
      console.log('\n1. Checking directory permissions...');
      const projectDir = await this.integration.checkPermissions(
        '/Users/yourusername/Projects/mcp',
        'read',
        {},
        context
      );
      console.log('Project directory permissions:', projectDir);

      // 2. Search for potentially sensitive files
      console.log('\n2. Searching for sensitive files...');
      const sensitiveFiles = await this.integration.searchFiles(
        'secret OR password OR key OR token',
        '/Users/yourusername/Projects/mcp',
        { fileTypes: ['.json', '.env', '.config', '.txt'], maxResults: 10 },
        context
      );
      console.log('Sensitive files found:', sensitiveFiles);

      // 3. Check file permissions for sensitive files
      for (const file of sensitiveFiles.results || []) {
        console.log(`\n3. Checking permissions for ${file.name}...`);
        const permissions = await this.integration.checkPermissions(
          file.path,
          'read',
          {},
          context
        );
        console.log(`Permissions for ${file.name}:`, permissions);
      }

      console.log('\n✅ Security audit complete!');
      console.log('Local LLM would now provide:');
      console.log('- Permission analysis and recommendations');
      console.log('- Sensitive file identification');
      console.log('- Security configuration review');
      console.log('- Vulnerability assessment');

    } catch (error) {
      console.error('❌ Error during security audit:', error);
    }
  }

  async demonstratePerformanceAnalysis(): Promise<void> {
    console.log('\n🔍 Local LLM: Performance Analysis Demo');
    console.log('======================================');

    const context = {
      userId: 'local-user',
      clientId: 'ollama-local',
      clientType: 'ollama-local',
      requestId: 'demo-006',
      operation: 'performance_analysis',
      timestamp: new Date()
    };

    try {
      // 1. Analyze large directories
      console.log('\n1. Analyzing large directories...');
      const largeDirs = await this.integration.listDirectory(
        '/Users/yourusername/Projects/mcp',
        { includeHidden: false, maxDepth: 3 },
        context
      );
      console.log('Directory analysis complete');

      // 2. Get performance statistics
      console.log('\n2. Getting performance statistics...');
      const stats = this.integration.getStats();
      console.log('Performance stats:', stats);

      // 3. Test concurrent operations
      console.log('\n3. Testing concurrent operations...');
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          this.integration.getFileMetadata(
            '/Users/yourusername/Projects/mcp/README.md',
            {},
            { ...context, requestId: `demo-006-${i}` }
          )
        );
      }
      await Promise.all(promises);
      console.log('✅ Concurrent operations completed');

      console.log('\n✅ Performance analysis complete!');
      console.log('Local LLM would now provide:');
      console.log('- Performance metrics and benchmarks');
      console.log('- Bottleneck identification');
      console.log('- Optimization recommendations');
      console.log('- Resource usage analysis');

    } catch (error) {
      console.error('❌ Error during performance analysis:', error);
    }
  }
}

// Main demonstration function
export async function runCompleteExample(): Promise<void> {
  console.log('🚀 MCP File Browser Server - Complete Integration Example');
  console.log('========================================================');
  console.log('This example demonstrates integration with various LLMs');
  console.log('');

  try {
    // Claude Desktop Examples
    const claudeExample = new ClaudeDesktopExample();
    await claudeExample.demonstrateProjectAnalysis();
    await claudeExample.demonstrateCodeReview();

    // OpenAI GPT-4 Examples
    const gpt4Example = new OpenAIGPT4Example();
    await gpt4Example.demonstrateDocumentSearch();
    await gpt4Example.demonstrateFileOrganization();

    // Local LLM Examples
    const ollamaExample = new OllamaLocalExample();
    await ollamaExample.demonstrateSecurityAudit();
    await ollamaExample.demonstratePerformanceAnalysis();

    console.log('\n🎉 All examples completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Configure your preferred LLM client');
    console.log('2. Set up appropriate security settings');
    console.log('3. Test with your own files and directories');
    console.log('4. Explore the usage scenarios in the scenarios/ directory');

  } catch (error) {
    console.error('❌ Error running complete example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runCompleteExample().catch(console.error);
}

