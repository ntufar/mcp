"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PathValidationService_1 = require("../../src/services/PathValidationService");
const PermissionService_1 = require("../../src/services/PermissionService");
const AuditLoggingService_1 = require("../../src/services/AuditLoggingService");
const DirectoryService_1 = require("../../src/services/DirectoryService");
const FileService_1 = require("../../src/services/FileService");
const FileSearchService_1 = require("../../src/services/FileSearchService");
const MetadataService_1 = require("../../src/services/MetadataService");
const CacheService_1 = require("../../src/services/CacheService");
const CacheInvalidationService_1 = require("../../src/services/CacheInvalidationService");
const ValidationService_1 = require("../../src/services/ValidationService");
const ResponseService_1 = require("../../src/services/ResponseService");
const Configuration_1 = require("../../src/models/Configuration");
describe('Services - smoke tests', () => {
    const config = new Configuration_1.Configuration({
        security: {
            allowedPaths: ['/tmp'],
            deniedPaths: ['/etc'],
            maxFileSize: '10MB',
            maxDirectoryDepth: 5,
        },
        performance: {
            cacheSize: '10MB',
            cacheTTL: 60,
            maxConcurrentOperations: 5,
        },
    });
    it('instantiates core services without throwing', () => {
        const pathValidation = new PathValidationService_1.PathValidationService(config);
        const permission = new PermissionService_1.PermissionService(config, pathValidation);
        const audit = new AuditLoggingService_1.AuditLoggingService(config);
        expect(pathValidation).toBeTruthy();
        expect(permission).toBeTruthy();
        expect(audit).toBeTruthy();
    });
    it('instantiates filesystem and utility services without throwing', () => {
        const pathValidation = new PathValidationService_1.PathValidationService(config);
        const permission = new PermissionService_1.PermissionService(config, pathValidation);
        const audit = new AuditLoggingService_1.AuditLoggingService(config);
        const directory = new DirectoryService_1.DirectoryService(config, pathValidation, permission, audit);
        const file = new FileService_1.FileService(config, pathValidation, permission, audit);
        const search = new FileSearchService_1.FileSearchService(config, pathValidation, permission, audit);
        const metadata = new MetadataService_1.MetadataService(config, pathValidation, permission, audit);
        const cache = new CacheService_1.CacheService(config);
        const cacheInvalidation = new CacheInvalidationService_1.CacheInvalidationService(config, cache, pathValidation, audit);
        const validation = new ValidationService_1.ValidationService(config, pathValidation);
        const response = new ResponseService_1.ResponseService(config, audit);
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
//# sourceMappingURL=services.smoke.test.js.map