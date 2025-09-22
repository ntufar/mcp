jest.mock('../../src/services/PathValidationService', () => {
  return {
    PathValidationService: class PathValidationServiceMock {
      constructor() {}
      validatePath() { return '/tmp'; }
      isAllowedPath() { return true; }
    }
  };
});
import { PathValidationService } from '../../src/services/PathValidationService';
import { PermissionService } from '../../src/services/PermissionService';
import { AuditLoggingService } from '../../src/services/AuditLoggingService';
import { DirectoryService } from '../../src/services/DirectoryService';
import { FileService } from '../../src/services/FileService';
import { FileSearchService } from '../../src/services/FileSearchService';
import { MetadataService } from '../../src/services/MetadataService';
import { CacheService } from '../../src/services/CacheService';
import { CacheInvalidationService } from '../../src/services/CacheInvalidationService';
import { ValidationService } from '../../src/services/ValidationService';
import { ResponseService } from '../../src/services/ResponseService';
import { Configuration } from '../../src/models/Configuration';

describe('Services - smoke tests', () => {
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
      maxDirectoryDepth: 5,
      allowSymbolicLinks: false,
      enableAuditLogging: false,
      auditLogRetentionDays: 7,
    },
    performance: {
      cacheSize: '10MB',
      cacheTTL: 60,
      maxConcurrentOperations: 5,
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

  it('instantiates core services without throwing', () => {
    const pathValidation = new PathValidationService(config);
    const permission = new PermissionService(config, pathValidation);
    const audit = new AuditLoggingService(config);

    expect(pathValidation).toBeTruthy();
    expect(permission).toBeTruthy();
    expect(audit).toBeTruthy();
  });

  it('instantiates filesystem and utility services without throwing', () => {
    const pathValidation = new PathValidationService(config);
    const permission = new PermissionService(config, pathValidation);
    const audit = new AuditLoggingService(config);

    // Provide required helper used by CacheService
    (config as any).getCacheSizeBytes = () => 10 * 1024 * 1024;

    const directory = new DirectoryService(config, pathValidation, permission, audit);
    const file = new FileService(config, pathValidation, permission, audit);
    const search = new FileSearchService(config, pathValidation, permission, audit);
    const metadata = new MetadataService(config, pathValidation, permission, audit);
    const cache = new CacheService(config);
    const cacheInvalidation = new CacheInvalidationService(config, cache, pathValidation, audit);
    const validation = new ValidationService(config, pathValidation);
    const response = new ResponseService(config, audit);

    expect(directory).toBeTruthy();
    expect(file).toBeTruthy();
    expect(search).toBeTruthy();
    expect(metadata).toBeTruthy();
    expect(cache).toBeTruthy();
    expect(cacheInvalidation).toBeTruthy();
    expect(validation).toBeTruthy();
    expect(response).toBeTruthy();
  });
});


