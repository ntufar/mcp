# File Analysis Scenarios

This document provides practical examples of how to use the MCP File Browser Server with different LLMs for file analysis tasks.

## Scenario 1: Project Structure Analysis

### Use Case
Analyze a software project to understand its structure, identify main components, and suggest improvements.

### LLM Prompts

**Claude Desktop**:
```
"Analyze my project structure and tell me what I'm working on. Look at the main directories, key files, and configuration files to understand the project's purpose and architecture."
```

**GPT-4**:
```
"Please examine my project directory and provide a comprehensive analysis including:
1. Project type and technology stack
2. Main components and their relationships
3. Configuration and dependency management
4. Potential improvements or issues"
```

**Local LLM (Llama 2)**:
```
"Help me understand my project by looking at its structure. Tell me what kind of project this is and what the main parts are."
```

### Expected MCP Tool Usage
1. `list_directory` - Explore root directory
2. `read_file` - Examine package.json, requirements.txt, etc.
3. `get_file_metadata` - Check file sizes and types
4. `search_files` - Find specific patterns (e.g., "import", "require")

### Example Response
```
Based on my analysis of your project, I can see this is a Node.js/TypeScript project with the following structure:

**Project Type**: MCP (Model Context Protocol) File Browser Server
**Technology Stack**: 
- Node.js with TypeScript
- Jest for testing
- ESLint/Prettier for code quality

**Main Components**:
- `/src/models/` - Data models (Directory, File, PermissionInfo, etc.)
- `/src/services/` - Core business logic services
- `/src/tools/` - MCP protocol tool implementations
- `/src/integration/` - Service integration layer
- `/tests/` - Comprehensive test suite

**Key Files**:
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Testing configuration

**Suggestions for Improvement**:
1. Consider adding a CHANGELOG.md for version tracking
2. The test coverage looks comprehensive (90%+ requirement)
3. Security implementation follows best practices
4. Consider adding API documentation generation
```

## Scenario 2: Code Review and Quality Analysis

### Use Case
Review source code files for potential issues, code quality, and best practices.

### LLM Prompts

**Claude Desktop**:
```
"Review the main source files in my project for potential issues, code quality problems, and adherence to best practices. Focus on the core service files."
```

**GPT-4**:
```
"Perform a comprehensive code review of my project focusing on:
1. Code quality and maintainability
2. Security vulnerabilities
3. Performance issues
4. Best practices adherence
5. Potential bugs or edge cases"
```

**Local LLM (CodeLlama)**:
```
"Look at my code files and tell me if there are any problems or ways to make them better."
```

### Expected MCP Tool Usage
1. `search_files` - Find source code files (.ts, .js, .py, etc.)
2. `read_file` - Examine individual source files
3. `list_directory` - Understand file organization
4. `get_file_metadata` - Check file sizes and modification dates

### Example Response
```
I've reviewed your core service files and here's my analysis:

**FileService.ts**:
✅ **Good**: Proper error handling and validation
✅ **Good**: Streaming support for large files
⚠️ **Issue**: Missing input sanitization in line 45
🔧 **Suggestion**: Add Joi validation for file path parameters

**PermissionService.ts**:
✅ **Good**: Comprehensive permission checking
✅ **Good**: Audit logging integration
⚠️ **Issue**: Potential race condition in concurrent permission checks
🔧 **Suggestion**: Add mutex locking for permission cache updates

**PathValidationService.ts**:
✅ **Good**: Canonical path resolution prevents traversal attacks
✅ **Good**: Comprehensive path validation
✅ **Good**: Proper error messages

**Overall Assessment**:
- Security implementation is solid
- Error handling is comprehensive
- Performance considerations are good
- Minor improvements needed in input validation
```

## Scenario 3: Document Search and Content Analysis

### Use Case
Search through documents and files to find specific information or patterns.

### LLM Prompts

**Claude Desktop**:
```
"Search through my documents folder for any files containing 'API documentation' or 'configuration' and summarize what you find."
```

**GPT-4**:
```
"Help me find and analyze all files related to API documentation and configuration in my project. Look for:
1. API documentation files
2. Configuration files
3. README files with API information
4. Code comments about APIs"
```

**Local LLM (Mistral)**:
```
"Find files in my project that talk about APIs or configuration and tell me what they say."
```

### Expected MCP Tool Usage
1. `search_files` - Search for specific patterns
2. `read_file` - Read matching files
3. `list_directory` - Explore relevant directories
4. `get_file_metadata` - Check file relevance

### Example Response
```
I found several files related to API documentation and configuration:

**API Documentation**:
- `docs/api.md` - Comprehensive MCP tools reference
- `README.md` - Contains API usage examples
- `src/tools/` directory - Contains tool implementations

**Configuration Files**:
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Testing configuration
- `src/models/Configuration.ts` - Runtime configuration model

**Key Findings**:
1. **API Tools Available**: 5 MCP tools (list_directory, read_file, search_files, get_file_metadata, check_permissions)
2. **Configuration Structure**: Well-organized with security, performance, and logging sections
3. **Documentation Quality**: Comprehensive with examples and security considerations
4. **Missing**: OpenAPI specification file for external API documentation

**Recommendations**:
- Consider generating OpenAPI spec from MCP tools
- Add configuration validation examples
- Include more real-world usage scenarios
```

## Scenario 4: File Organization and Cleanup

### Use Case
Help organize files and suggest cleanup strategies.

### LLM Prompts

**Claude Desktop**:
```
"My Downloads folder is a mess. Help me organize it by file type and suggest a cleanup strategy. Also identify any duplicate files."
```

**GPT-4**:
```
"Analyze my Downloads folder and provide a comprehensive organization strategy:
1. Categorize files by type and purpose
2. Identify duplicate files
3. Suggest folder structure
4. Recommend files to delete or archive"
```

**Local LLM (Llama 2)**:
```
"Look at my Downloads folder and help me organize it better. Tell me what kinds of files are there and how to sort them."
```

### Expected MCP Tool Usage
1. `list_directory` - Explore Downloads folder
2. `get_file_metadata` - Check file types, sizes, dates
3. `search_files` - Find specific file patterns
4. `read_file` - Examine file contents if needed

### Example Response
```
I've analyzed your Downloads folder and here's my organization strategy:

**Current State**:
- 247 files totaling 2.3GB
- Mixed file types: images, documents, archives, executables
- Files from last 6 months to 2 years old

**File Categories Found**:
1. **Images** (45 files, 890MB): Screenshots, photos, memes
2. **Documents** (32 files, 156MB): PDFs, Word docs, spreadsheets
3. **Archives** (28 files, 1.1GB): ZIP, RAR, 7z files
4. **Executables** (15 files, 89MB): Installers, applications
5. **Media** (12 files, 234MB): Videos, audio files
6. **Miscellaneous** (115 files, 45MB): Various small files

**Suggested Folder Structure**:
```
Downloads/
├── Images/
│   ├── Screenshots/
│   ├── Photos/
│   └── Memes/
├── Documents/
│   ├── PDFs/
│   ├── Office/
│   └── Text/
├── Archives/
├── Software/
├── Media/
└── To_Review/
```

**Duplicate Files Identified**:
- `screenshot_2024_01_15.png` (3 copies)
- `document_v2.pdf` and `document_v2_final.pdf`
- `installer_setup.exe` (2 copies)

**Cleanup Recommendations**:
1. **Delete**: Files older than 1 year that haven't been accessed
2. **Archive**: Important documents to cloud storage
3. **Organize**: Move files to appropriate folders
4. **Review**: Check files in To_Review folder monthly
```

## Scenario 5: Security Audit and Permission Analysis

### Use Case
Analyze file permissions and security settings across a directory structure.

### LLM Prompts

**Claude Desktop**:
```
"Perform a security audit of my project directory. Check file permissions, identify any security issues, and verify that sensitive files are properly protected."
```

**GPT-4**:
```
"Conduct a comprehensive security analysis of my project:
1. Check file and directory permissions
2. Identify potentially sensitive files
3. Verify security configurations
4. Look for any security vulnerabilities
5. Ensure proper access controls"
```

**Local LLM (Mistral)**:
```
"Check my project files for security problems and tell me if any files have wrong permissions."
```

### Expected MCP Tool Usage
1. `list_directory` - Explore directory structure
2. `check_permissions` - Verify file permissions
3. `get_file_metadata` - Check file attributes
4. `search_files` - Find sensitive file patterns

### Example Response
```
Security Audit Results for your project:

**Permission Analysis**:
✅ **Good**: All source files have appropriate read permissions
✅ **Good**: Configuration files are properly protected
✅ **Good**: No world-writable files found
⚠️ **Warning**: `logs/` directory has overly permissive access (755)
🔧 **Fix**: Change to 750 to restrict access

**Sensitive Files Identified**:
- `config/secrets.json` - Contains API keys (properly protected)
- `logs/access.log` - Contains user data (needs permission fix)
- `backup/` directory - Contains sensitive data (properly protected)

**Security Configuration**:
✅ **Good**: MCP server has proper path restrictions
✅ **Good**: Audit logging is enabled
✅ **Good**: Input validation is comprehensive
✅ **Good**: No hardcoded secrets in source code

**Recommendations**:
1. **Fix**: Change logs directory permissions to 750
2. **Add**: Implement log rotation for access logs
3. **Consider**: Encrypt sensitive backup files
4. **Monitor**: Set up alerts for permission changes

**Overall Security Score**: 8.5/10
```

## Best Practices for File Analysis

### 1. Start with High-Level Overview
- Use `list_directory` to understand structure
- Use `get_file_metadata` to understand file types and sizes

### 2. Focus on Key Files
- Configuration files (package.json, config files)
- Documentation files (README, docs)
- Source code files (main modules)

### 3. Use Search Strategically
- Search for specific patterns or keywords
- Use file extensions to filter results
- Combine multiple search criteria

### 4. Provide Context
- Always explain what you're looking for
- Ask for specific analysis types
- Request actionable recommendations

### 5. Security Considerations
- Be aware of sensitive file locations
- Respect file permissions
- Use appropriate access levels

## Troubleshooting Common Issues

### 1. Permission Denied
- Check if the path is in allowed paths
- Verify file system permissions
- Use appropriate user context

### 2. Large File Handling
- Use streaming for large files
- Set appropriate size limits
- Consider file type restrictions

### 3. Performance Issues
- Use caching for repeated operations
- Limit concurrent operations
- Optimize search patterns

### 4. LLM Response Quality
- Provide clear, specific prompts
- Ask for structured responses
- Request examples and explanations

