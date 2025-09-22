jest.mock('../../../src/services/PathValidationService', () => {
  return {
    PathValidationService: class PathValidationServiceMock {
      constructor() {}
      validatePath() { return '/tmp'; }
      isAllowedPath() { return true; }
    }
  };
});
import { PathValidationService } from '../../../src/services/PathValidationService';
import { PermissionService } from '../../../src/services/PermissionService';
import { Configuration } from '../../../src/models/Configuration';

describe('Security components - smoke tests', () => {
  const config = ({
    server: {
      name: 'test',
      version: '0.0.0',
      port: 0,
      host: 'localhost',
      maxConnections: 10,
      requestTimeout: 10000,
    },
    security: {
      allowedPaths: ['/tmp'],
      deniedPaths: ['/etc'],
      maxFileSize: '10MB',
      maxDirectoryDepth: 3,
      allowSymbolicLinks: false,
      enableAuditLogging: false,
      auditLogRetentionDays: 7,
    },
    performance: {
      cacheSize: '5MB',
      cacheTTL: 30,
      maxConcurrentOperations: 3,
      enableStreaming: true,
      streamingChunkSize: 65536,
      memoryLimit: '128MB',
    },
    logging: {
      level: 'error',
      enableConsole: true,
      enableFile: false,
      logFilePath: '',
      maxLogFileSize: '10MB',
      maxLogFiles: 3,
    },
  } as unknown) as Configuration;

  it('PathValidationService mock returns allowed path', () => {
    const validator = new PathValidationService(config);
    expect((validator as any).validatePath('/tmp')).toBe('/tmp');
  });

  it('PermissionService can be created and used for a basic check', async () => {
    const validator = new PathValidationService(config);
    const perm = new PermissionService(config, validator);
    const result = await perm.checkPermission({
      userId: 'test',
      userGroups: [],
      clientId: 'unit',
      clientType: 'test',
      operation: 'read',
      targetPath: '/tmp',
    });
    expect(result).toBeDefined();
  });
});


