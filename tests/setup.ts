import mock from 'mock-fs';

// Global test setup
beforeEach(() => {
  // Clear any existing mocks
  mock.restore();
});

afterEach(() => {
  // Restore file system after each test
  mock.restore();
});

afterAll(() => {
  // Ensure cleanup after all tests
  mock.restore();
});

// Global test utilities
export const createMockFileSystem = (structure: any) => {
  mock(structure);
};

export const createTestDirectory = () => {
  const testDir = '/tmp/mcp-test';
  mock({
    [testDir]: {
      'documents': {
        'hello.txt': 'Hello World',
        'config.json': '{"key": "value"}',
        'readme.md': '# Test Document'
      },
      'projects': {
        'project1': {
          'src': {
            'index.ts': 'console.log("Hello");'
          },
          'package.json': '{"name": "project1"}'
        },
        'project2': {
          'README.md': '# Project 2'
        }
      },
      'private': {
        'secret.txt': 'Sensitive data',
        'key.pem': '-----BEGIN PRIVATE KEY-----'
      }
    }
  });
  return testDir;
};

export const cleanupTestDirectory = () => {
  mock.restore();
};
