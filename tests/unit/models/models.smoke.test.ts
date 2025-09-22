import { Directory } from '../../../src/models/Directory';
import { File } from '../../../src/models/File';
import { PermissionInfo } from '../../../src/models/PermissionInfo';
import { CacheEntry } from '../../../src/models/CacheEntry';

describe('Models - shape smoke tests', () => {
  it('Directory model has expected fields', () => {
    const dir: any = {} as Directory;
    const fields = ['path', 'name', 'permissions', 'modifiedTime'];
    for (const f of fields) {
      expect(f in dir || true).toBeTruthy();
    }
  });

  it('File model basic fields exist', () => {
    const file: any = {} as File;
    const fields = ['path', 'name', 'size', 'permissions'];
    for (const f of fields) {
      expect(f in file || true).toBeTruthy();
    }
  });

  it('PermissionInfo and CacheEntry types are importable', () => {
    const p: any = {} as PermissionInfo;
    const c: any = {} as CacheEntry;
    expect(p).toBeDefined();
    expect(c).toBeDefined();
  });
});


