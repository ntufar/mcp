"use strict";
/**
 * PermissionInfo Entity
 *
 * Represents file system permissions with security validation.
 * Implements security-first design with strict permission checking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionInfo = void 0;
class PermissionInfo {
    _data;
    constructor(data) {
        this.validateInput(data);
        this._data = { ...data };
    }
    // Getters
    get owner() {
        return this._data.owner;
    }
    get group() {
        return this._data.group;
    }
    get mode() {
        return this._data.mode;
    }
    get readable() {
        return this._data.readable;
    }
    get writable() {
        return this._data.writable;
    }
    get executable() {
        return this._data.executable;
    }
    get sticky() {
        return this._data.sticky || false;
    }
    get setuid() {
        return this._data.setuid || false;
    }
    get setgid() {
        return this._data.setgid || false;
    }
    // Methods
    updateOwner(owner) {
        this.validateOwner(owner);
        this._data.owner = owner;
    }
    updateGroup(group) {
        this.validateGroup(group);
        this._data.group = group;
    }
    updateMode(mode) {
        this.validateMode(mode);
        this._data.mode = mode;
        // Update boolean flags based on mode
        this.updateFlagsFromMode(mode);
    }
    updateReadable(readable) {
        this._data.readable = readable;
        // Update mode to reflect readable change
        this.updateModeFromFlags();
    }
    updateWritable(writable) {
        this._data.writable = writable;
        // Update mode to reflect writable change
        this.updateModeFromFlags();
    }
    updateExecutable(executable) {
        this._data.executable = executable;
        // Update mode to reflect executable change
        this.updateModeFromFlags();
    }
    updateSticky(sticky) {
        this._data.sticky = sticky;
        // Update mode to reflect sticky change
        this.updateModeFromFlags();
    }
    updateSetuid(setuid) {
        this._data.setuid = setuid;
        // Update mode to reflect setuid change
        this.updateModeFromFlags();
    }
    updateSetgid(setgid) {
        this._data.setgid = setgid;
        // Update mode to reflect setgid change
        this.updateModeFromFlags();
    }
    // Permission checking methods
    hasPermission(operation) {
        switch (operation) {
            case 'read':
                return this._data.readable;
            case 'write':
                return this._data.writable;
            case 'execute':
                return this._data.executable;
            default:
                return false;
        }
    }
    hasAnyPermission() {
        return this._data.readable || this._data.writable || this._data.executable;
    }
    hasAllPermissions() {
        return this._data.readable && this._data.writable && this._data.executable;
    }
    isReadOnly() {
        return this._data.readable && !this._data.writable && !this._data.executable;
    }
    isWriteOnly() {
        return !this._data.readable && this._data.writable && !this._data.executable;
    }
    isExecuteOnly() {
        return !this._data.readable && !this._data.writable && this._data.executable;
    }
    // Security methods
    isSecure() {
        // Check for dangerous permission combinations
        if (this._data.setuid && this._data.writable) {
            return false; // setuid + writable is dangerous
        }
        if (this._data.setgid && this._data.writable) {
            return false; // setgid + writable is dangerous
        }
        if (this._data.sticky && this._data.writable) {
            return false; // sticky + writable can be dangerous
        }
        return true;
    }
    isRestrictive() {
        return !this._data.readable && !this._data.writable && !this._data.executable;
    }
    isPermissive() {
        return this._data.readable && this._data.writable && this._data.executable;
    }
    // Serialization
    toJSON() {
        return { ...this._data };
    }
    static fromJSON(data) {
        return new PermissionInfo(data);
    }
    // Validation
    validateInput(data) {
        this.validateOwner(data.owner);
        this.validateGroup(data.group);
        this.validateMode(data.mode);
        if (typeof data.readable !== 'boolean') {
            throw new Error('Readable must be a boolean');
        }
        if (typeof data.writable !== 'boolean') {
            throw new Error('Writable must be a boolean');
        }
        if (typeof data.executable !== 'boolean') {
            throw new Error('Executable must be a boolean');
        }
        if (data.sticky !== undefined && typeof data.sticky !== 'boolean') {
            throw new Error('Sticky must be a boolean');
        }
        if (data.setuid !== undefined && typeof data.setuid !== 'boolean') {
            throw new Error('Setuid must be a boolean');
        }
        if (data.setgid !== undefined && typeof data.setgid !== 'boolean') {
            throw new Error('Setgid must be a boolean');
        }
    }
    validateOwner(owner) {
        if (!owner || typeof owner !== 'string') {
            throw new Error('Owner is required and must be a string');
        }
        if (owner.length === 0 || owner.length > 32) {
            throw new Error('Owner must be between 1 and 32 characters');
        }
        // Check for valid username format
        if (!/^[a-zA-Z0-9_.-]+$/.test(owner)) {
            throw new Error('Owner contains invalid characters');
        }
    }
    validateGroup(group) {
        if (!group || typeof group !== 'string') {
            throw new Error('Group is required and must be a string');
        }
        if (group.length === 0 || group.length > 32) {
            throw new Error('Group must be between 1 and 32 characters');
        }
        // Check for valid group name format
        if (!/^[a-zA-Z0-9_.-]+$/.test(group)) {
            throw new Error('Group contains invalid characters');
        }
    }
    validateMode(mode) {
        if (!mode || typeof mode !== 'string') {
            throw new Error('Mode is required and must be a string');
        }
        // Validate octal mode format (e.g., "755", "644")
        if (!/^[0-7]{3,4}$/.test(mode)) {
            throw new Error('Mode must be a valid octal string (3-4 digits)');
        }
        // Validate symbolic mode format (e.g., "rwxr-xr-x")
        if (mode.length === 9 && !/^[rwx-]{9}$/.test(mode)) {
            throw new Error('Symbolic mode must be 9 characters of r, w, x, or -');
        }
        // Additional validation for 10-character mode (with special bits)
        if (mode.length === 10 && !/^[drwx-]{10}$/.test(mode)) {
            throw new Error('Extended mode must be 10 characters starting with d or - followed by 9 rwx- characters');
        }
    }
    updateFlagsFromMode(mode) {
        if (mode.length === 3 || mode.length === 4) {
            // Octal mode
            const octal = parseInt(mode, 8);
            this._data.readable = !!(octal & 0o444); // Any read permission
            this._data.writable = !!(octal & 0o222); // Any write permission
            this._data.executable = !!(octal & 0o111); // Any execute permission
            if (mode.length === 4) {
                const specialBits = parseInt(mode[0], 8);
                this._data.setuid = !!(specialBits & 0o4);
                this._data.setgid = !!(specialBits & 0o2);
                this._data.sticky = !!(specialBits & 0o1);
            }
        }
        else if (mode.length === 9) {
            // Symbolic mode
            this._data.readable = mode.includes('r');
            this._data.writable = mode.includes('w');
            this._data.executable = mode.includes('x');
        }
        else if (mode.length === 10) {
            // Extended symbolic mode
            const permissions = mode.substring(1);
            this._data.readable = permissions.includes('r');
            this._data.writable = permissions.includes('w');
            this._data.executable = permissions.includes('x');
            // Check special bits from first character
            const firstChar = mode[0];
            this._data.setuid = firstChar === 's' || firstChar === 'S';
            this._data.setgid = firstChar === 's' || firstChar === 'S';
            this._data.sticky = firstChar === 't' || firstChar === 'T';
        }
    }
    updateModeFromFlags() {
        // Convert boolean flags back to octal mode
        let octal = 0;
        if (this._data.readable)
            octal |= 0o444;
        if (this._data.writable)
            octal |= 0o222;
        if (this._data.executable)
            octal |= 0o111;
        let specialBits = 0;
        if (this._data.setuid)
            specialBits |= 0o4;
        if (this._data.setgid)
            specialBits |= 0o2;
        if (this._data.sticky)
            specialBits |= 0o1;
        if (specialBits > 0) {
            this._data.mode = specialBits.toString(8) + octal.toString(8).padStart(3, '0');
        }
        else {
            this._data.mode = octal.toString(8).padStart(3, '0');
        }
    }
    // Utility methods
    getOctalMode() {
        if (this._data.mode.length === 3 || this._data.mode.length === 4) {
            return this._data.mode;
        }
        // Convert symbolic mode to octal
        let octal = 0;
        const mode = this._data.mode.length === 10 ? this._data.mode.substring(1) : this._data.mode;
        // Owner permissions (bits 8-6)
        if (mode[0] === 'r')
            octal |= 0o400;
        if (mode[1] === 'w')
            octal |= 0o200;
        if (mode[2] === 'x')
            octal |= 0o100;
        // Group permissions (bits 5-3)
        if (mode[3] === 'r')
            octal |= 0o040;
        if (mode[4] === 'w')
            octal |= 0o020;
        if (mode[5] === 'x')
            octal |= 0o010;
        // Other permissions (bits 2-0)
        if (mode[6] === 'r')
            octal |= 0o004;
        if (mode[7] === 'w')
            octal |= 0o002;
        if (mode[8] === 'x')
            octal |= 0o001;
        return octal.toString(8).padStart(3, '0');
    }
    getSymbolicMode() {
        if (this._data.mode.length >= 9) {
            return this._data.mode;
        }
        // Convert octal mode to symbolic
        const octal = parseInt(this._data.mode, 8);
        let symbolic = '';
        // Owner permissions
        symbolic += (octal & 0o400) ? 'r' : '-';
        symbolic += (octal & 0o200) ? 'w' : '-';
        symbolic += (octal & 0o100) ? 'x' : '-';
        // Group permissions
        symbolic += (octal & 0o040) ? 'r' : '-';
        symbolic += (octal & 0o020) ? 'w' : '-';
        symbolic += (octal & 0o010) ? 'x' : '-';
        // Other permissions
        symbolic += (octal & 0o004) ? 'r' : '-';
        symbolic += (octal & 0o002) ? 'w' : '-';
        symbolic += (octal & 0o001) ? 'x' : '-';
        return symbolic;
    }
    // Static factory methods
    static createFromStats(stats) {
        const mode = stats.mode.toString(8);
        const octal = parseInt(mode, 8);
        return new PermissionInfo({
            owner: stats.uid?.toString() || 'unknown',
            group: stats.gid?.toString() || 'unknown',
            mode: mode,
            readable: !!(octal & 0o444),
            writable: !!(octal & 0o222),
            executable: !!(octal & 0o111),
            setuid: !!(octal & 0o4000),
            setgid: !!(octal & 0o2000),
            sticky: !!(octal & 0o1000),
        });
    }
    static createReadOnly() {
        return new PermissionInfo({
            owner: 'user',
            group: 'group',
            mode: '444',
            readable: true,
            writable: false,
            executable: false,
        });
    }
    static createWriteOnly() {
        return new PermissionInfo({
            owner: 'user',
            group: 'group',
            mode: '222',
            readable: false,
            writable: true,
            executable: false,
        });
    }
    static createExecuteOnly() {
        return new PermissionInfo({
            owner: 'user',
            group: 'group',
            mode: '111',
            readable: false,
            writable: false,
            executable: true,
        });
    }
    static createFullAccess() {
        return new PermissionInfo({
            owner: 'user',
            group: 'group',
            mode: '777',
            readable: true,
            writable: true,
            executable: true,
        });
    }
    static createRestrictive() {
        return new PermissionInfo({
            owner: 'user',
            group: 'group',
            mode: '000',
            readable: false,
            writable: false,
            executable: false,
        });
    }
}
exports.PermissionInfo = PermissionInfo;
//# sourceMappingURL=PermissionInfo.js.map