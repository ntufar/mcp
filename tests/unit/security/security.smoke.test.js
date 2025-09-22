"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PathValidationService_1 = require("../../../src/services/PathValidationService");
const PermissionService_1 = require("../../../src/services/PermissionService");
const Configuration_1 = require("../../../src/models/Configuration");
describe('Security components - smoke tests', () => {
    const config = new Configuration_1.Configuration({
        security: {
            allowedPaths: ['/tmp'],
            deniedPaths: ['/etc'],
            maxFileSize: '10MB',
            maxDirectoryDepth: 3,
        },
        performance: {
            cacheSize: '5MB',
            cacheTTL: 30,
            maxConcurrentOperations: 3,
        },
    });
    it('PathValidationService rejects traversal attempts', () => {
        const validator = new PathValidationService_1.PathValidationService(config);
        expect(() => validator.validatePath('../../etc/passwd')).toThrow();
    });
    it('PermissionService can be created and used for a basic check', async () => {
        const validator = new PathValidationService_1.PathValidationService(config);
        const perm = new PermissionService_1.PermissionService(config, validator);
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
//# sourceMappingURL=security.smoke.test.js.map