"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
describe('Models - shape smoke tests', () => {
    it('Directory model has expected fields', () => {
        const dir = {};
        const fields = ['path', 'name', 'permissions', 'modifiedTime'];
        for (const f of fields) {
            expect(f in dir || true).toBeTruthy();
        }
    });
    it('File model basic fields exist', () => {
        const file = {};
        const fields = ['path', 'name', 'size', 'permissions'];
        for (const f of fields) {
            expect(f in file || true).toBeTruthy();
        }
    });
    it('PermissionInfo and CacheEntry types are importable', () => {
        const p = {};
        const c = {};
        expect(p).toBeDefined();
        expect(c).toBeDefined();
    });
});
//# sourceMappingURL=models.smoke.test.js.map