"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupTestDirectory = exports.createTestDirectory = exports.createMockFileSystem = void 0;
const mock_fs_1 = __importDefault(require("mock-fs"));
// Global test setup
beforeEach(() => {
    // Clear any existing mocks
    mock_fs_1.default.restore();
});
afterEach(() => {
    // Restore file system after each test
    mock_fs_1.default.restore();
});
afterAll(() => {
    // Ensure cleanup after all tests
    mock_fs_1.default.restore();
});
// Global test utilities
const createMockFileSystem = (structure) => {
    (0, mock_fs_1.default)(structure);
};
exports.createMockFileSystem = createMockFileSystem;
const createTestDirectory = () => {
    const testDir = '/tmp/mcp-test';
    (0, mock_fs_1.default)({
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
exports.createTestDirectory = createTestDirectory;
const cleanupTestDirectory = () => {
    mock_fs_1.default.restore();
};
exports.cleanupTestDirectory = cleanupTestDirectory;
//# sourceMappingURL=setup.js.map