# Development Guide

## MCP File Browser Server Development

This guide provides comprehensive information for developing and contributing to the MCP File Browser Server.

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- TypeScript knowledge
- Understanding of MCP protocol

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ntufar/mcp.git
   cd mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Project Structure

```
mcp/
├── src/
│   ├── models/          # Data models and entities
│   ├── services/        # Business logic services
│   ├── server/          # MCP server implementation
│   ├── tools/           # MCP tool implementations
│   └── middleware/      # Request/response middleware
├── tests/
│   ├── contract/        # API contract tests
│   ├── integration/     # Integration tests
│   ├── security/        # Security tests
│   ├── performance/     # Performance tests
│   ├── llm/            # LLM integration tests
│   └── unit/           # Unit tests
├── docs/               # Documentation
├── .github/            # CI/CD workflows
└── specs/              # Project specifications
```

### Development Workflow

#### Test-Driven Development (TDD)

This project follows strict TDD principles:

1. **Write tests first** - All features must have tests before implementation
2. **Tests must fail** - Verify tests fail before writing code
3. **Write minimal code** - Implement just enough to make tests pass
4. **Refactor** - Improve code quality while keeping tests green

#### Coding Standards

- **TypeScript strict mode** - All code must pass strict type checking
- **ESLint rules** - Follow configured linting rules
- **Prettier formatting** - Consistent code formatting
- **90%+ test coverage** - Mandatory for file system operations
- **Security-first** - All changes must enhance security

#### Git Workflow

1. **Create feature branch** from main/master
2. **Write tests first** following TDD approach
3. **Implement feature** with minimal code
4. **Run all tests** and ensure they pass
5. **Code review** with security focus
6. **Merge** to main/master

### Testing

#### Test Categories

- **Unit Tests**: Individual component testing with mock file systems
- **Integration Tests**: End-to-end MCP protocol testing
- **Security Tests**: Path traversal, permission boundary testing
- **Performance Tests**: Large directory and file handling
- **Contract Tests**: API contract validation
- **LLM Integration Tests**: Real LLM client testing

#### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:security
npm run test:performance
npm run test:contract
npm run test:llm

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm run test:watch
```

#### Test Data

Use the provided test utilities:

```typescript
import { createTestDirectory, cleanupTestDirectory } from '@tests/setup';

describe('File Operations', () => {
  beforeEach(() => {
    createTestDirectory();
  });

  afterEach(() => {
    cleanupTestDirectory();
  });

  // Test implementation
});
```

### Security Development

#### Security Requirements

- **Path Validation**: All paths must be canonical and validated
- **Permission Checking**: Respect OS permissions and configuration
- **Audit Logging**: Log all file operations for security audit
- **Input Validation**: Strict validation of all inputs
- **Resource Limits**: Prevent resource exhaustion attacks

#### Security Testing

```bash
# Run security tests
npm run test:security

# Test path traversal prevention
npm run test:security -- --testNamePattern="path traversal"

# Test permission boundaries
npm run test:security -- --testNamePattern="permission"
```

### Performance Development

#### Performance Requirements

- Directory listing: < 2 seconds for 10,000+ files
- File metadata: < 500ms for files up to 100MB
- Memory usage: < 100MB for normal operations
- Concurrent operations: 50+ simultaneous requests

#### Performance Testing

```bash
# Run performance tests
npm run test:performance

# Benchmark specific operations
npm run test:performance -- --testNamePattern="large directory"
```

### LLM Integration

#### LLM Client Testing

Test with real LLM clients:

```bash
# Test Claude integration
npm run test:llm:claude

# Test GPT-4 integration
npm run test:llm:gpt4

# Test Gemini integration
npm run test:llm:gemini
```

### Configuration

#### Server Configuration

Create `config.json`:

```json
{
  "server": {
    "name": "mcp-file-browser",
    "version": "1.0.0"
  },
  "security": {
    "allowedPaths": ["/home/user/documents"],
    "deniedPaths": ["/etc", "/root"],
    "maxFileSize": "100MB",
    "maxDirectoryDepth": 10
  },
  "performance": {
    "cacheSize": "50MB",
    "cacheTTL": 300,
    "maxConcurrentOperations": 50
  }
}
```

### Debugging

#### Debug Mode

```bash
# Enable debug logging
DEBUG=mcp:* npm run dev

# Enable specific debug categories
DEBUG=mcp:security,mcp:performance npm run dev
```

#### Logging

The server provides structured logging:

```typescript
import { logger } from '@/services/LoggingService';

logger.info('Operation completed', {
  operation: 'list_directory',
  path: '/home/user',
  duration: 45,
  success: true
});
```

### Deployment

#### Build Process

```bash
# Build for production
npm run build

# Verify build
npm start
```

#### Environment Variables

- `MCP_PORT`: Server port (default: 3000)
- `MCP_CONFIG_PATH`: Configuration file path
- `MCP_LOG_LEVEL`: Logging level (debug, info, warn, error)
- `MCP_ALLOWED_PATHS`: Comma-separated allowed paths
- `MCP_DENIED_PATHS`: Comma-separated denied paths

### Contributing

#### Pull Request Process

1. **Fork** the repository
2. **Create feature branch** following naming convention
3. **Write tests** for all new functionality
4. **Implement feature** following TDD approach
5. **Update documentation** as needed
6. **Submit pull request** with detailed description

#### Code Review Checklist

- [ ] Tests written and passing
- [ ] Security implications reviewed
- [ ] Performance impact assessed
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] No breaking changes without migration plan

### Troubleshooting

#### Common Issues

**Tests failing on file system operations:**
- Ensure mock-fs is properly configured
- Check file permissions in test environment
- Verify test data setup

**Performance tests failing:**
- Check system resources
- Verify test data size
- Review concurrent operation limits

**LLM integration tests failing:**
- Verify LLM client configuration
- Check network connectivity
- Review MCP protocol compliance

### Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Node.js File System API](https://nodejs.org/api/fs.html)
