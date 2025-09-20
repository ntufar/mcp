/**
 * Validation Service
 * 
 * Comprehensive input validation service for MCP tools and operations.
 * Implements security-focused validation with detailed error reporting.
 */

import { Configuration } from '../models/Configuration';
import { PathValidationService } from './PathValidationService';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedData?: any;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
  expectedType?: string;
  constraints?: Record<string, any>;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  value?: any;
  suggestion?: string;
}

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'path' | 'enum';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  items?: ValidationRule;
  properties?: Record<string, ValidationRule>;
  customValidator?: (value: any, context: any) => ValidationResult;
  sanitizer?: (value: any) => any;
}

export interface ValidationContext {
  userId: string;
  clientId: string;
  clientType: string;
  operation: string;
  timestamp: Date;
  ipAddress?: string;
  sessionId?: string;
}

export class ValidationService {
  private config: Configuration;
  private pathValidationService: PathValidationService;
  private rules: Map<string, ValidationRule[]> = new Map();

  constructor(config: Configuration, pathValidationService: PathValidationService) {
    this.config = config;
    this.pathValidationService = pathValidationService;
    this.initializeDefaultRules();
  }

  /**
   * Validates data against a schema
   */
  validate(
    data: any,
    schema: ValidationRule[],
    context: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitizedData: any = {};

    try {
      for (const rule of schema) {
        const fieldResult = this.validateField(data, rule, context);
        
        if (!fieldResult.isValid) {
          errors.push(...fieldResult.errors);
        }
        
        if (fieldResult.warnings.length > 0) {
          warnings.push(...fieldResult.warnings);
        }

        if (fieldResult.sanitizedData !== undefined) {
          sanitizedData[rule.field] = fieldResult.sanitizedData;
        } else if (data[rule.field] !== undefined) {
          sanitizedData[rule.field] = data[rule.field];
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedData: errors.length === 0 ? sanitizedData : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'validation',
          code: 'VALIDATION_ERROR',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        warnings,
        sanitizedData: undefined,
      };
    }
  }

  /**
   * Validates MCP tool input
   */
  validateToolInput(
    toolName: string,
    input: any,
    context: ValidationContext
  ): ValidationResult {
    const rules = this.rules.get(toolName);
    if (!rules) {
      return {
        isValid: false,
        errors: [{
          field: 'tool',
          code: 'UNKNOWN_TOOL',
          message: `Unknown tool: ${toolName}`,
        }],
        warnings: [],
      };
    }

    return this.validate(input, rules, context);
  }

  /**
   * Validates path input
   */
  validatePath(
    path: string,
    operation: string,
    context: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Basic path validation
      if (!path || typeof path !== 'string') {
        errors.push({
          field: 'path',
          code: 'INVALID_PATH_TYPE',
          message: 'Path must be a non-empty string',
          value: path,
          expectedType: 'string',
        });
        return { isValid: false, errors, warnings };
      }

      if (path.length === 0) {
        errors.push({
          field: 'path',
          code: 'EMPTY_PATH',
          message: 'Path cannot be empty',
          value: path,
        });
        return { isValid: false, errors, warnings };
      }

      if (path.length > 4096) {
        errors.push({
          field: 'path',
          code: 'PATH_TOO_LONG',
          message: 'Path is too long (max 4096 characters)',
          value: path,
          constraints: { maxLength: 4096 },
        });
        return { isValid: false, errors, warnings };
      }

      // Check for suspicious patterns
      if (this.containsSuspiciousPatterns(path)) {
        errors.push({
          field: 'path',
          code: 'SUSPICIOUS_PATH',
          message: 'Path contains suspicious patterns',
          value: path,
        });
        return { isValid: false, errors, warnings };
      }

      // Use PathValidationService for advanced validation
      const pathValidation = this.pathValidationService.validatePath(path);
      if (!pathValidation.isValid) {
        errors.push({
          field: 'path',
          code: pathValidation.errorCode || 'PATH_VALIDATION_FAILED',
          message: pathValidation.errorMessage || 'Path validation failed',
          value: path,
        });
        return { isValid: false, errors, warnings };
      }

      // Check for common issues
      if (path.includes('//')) {
        warnings.push({
          field: 'path',
          code: 'DOUBLE_SLASH',
          message: 'Path contains double slashes',
          value: path,
          suggestion: 'Use single slashes in paths',
        });
      }

      if (path.endsWith('/') && path.length > 1) {
        warnings.push({
          field: 'path',
          code: 'TRAILING_SLASH',
          message: 'Path ends with trailing slash',
          value: path,
          suggestion: 'Remove trailing slash unless it\'s the root directory',
        });
      }

      return { isValid: true, errors, warnings };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'path',
          code: 'PATH_VALIDATION_ERROR',
          message: `Path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          value: path,
        }],
        warnings,
      };
    }
  }

  /**
   * Validates search query
   */
  validateSearchQuery(
    query: string,
    context: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      if (!query || typeof query !== 'string') {
        errors.push({
          field: 'query',
          code: 'INVALID_QUERY_TYPE',
          message: 'Query must be a non-empty string',
          value: query,
          expectedType: 'string',
        });
        return { isValid: false, errors, warnings };
      }

      if (query.length === 0) {
        errors.push({
          field: 'query',
          code: 'EMPTY_QUERY',
          message: 'Query cannot be empty',
          value: query,
        });
        return { isValid: false, errors, warnings };
      }

      if (query.length > 1000) {
        errors.push({
          field: 'query',
          code: 'QUERY_TOO_LONG',
          message: 'Query is too long (max 1000 characters)',
          value: query,
          constraints: { maxLength: 1000 },
        });
        return { isValid: false, errors, warnings };
      }

      // Check for suspicious patterns
      if (this.containsSuspiciousPatterns(query)) {
        errors.push({
          field: 'query',
          code: 'SUSPICIOUS_QUERY',
          message: 'Query contains suspicious patterns',
          value: query,
        });
        return { isValid: false, errors, warnings };
      }

      // Check for potential regex injection
      if (query.includes('.*') || query.includes('\\') || query.includes('^') || query.includes('$')) {
        warnings.push({
          field: 'query',
          code: 'POTENTIAL_REGEX',
          message: 'Query contains characters that might be interpreted as regex',
          value: query,
          suggestion: 'Use regex mode explicitly if intended',
        });
      }

      return { isValid: true, errors, warnings };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'query',
          code: 'QUERY_VALIDATION_ERROR',
          message: `Query validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          value: query,
        }],
        warnings,
      };
    }
  }

  /**
   * Validates file size limits
   */
  validateFileSize(
    size: number,
    context: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      if (typeof size !== 'number' || isNaN(size)) {
        errors.push({
          field: 'size',
          code: 'INVALID_SIZE_TYPE',
          message: 'Size must be a valid number',
          value: size,
          expectedType: 'number',
        });
        return { isValid: false, errors, warnings };
      }

      if (size < 0) {
        errors.push({
          field: 'size',
          code: 'NEGATIVE_SIZE',
          message: 'Size cannot be negative',
          value: size,
          constraints: { min: 0 },
        });
        return { isValid: false, errors, warnings };
      }

      const maxFileSize = this.config.getMaxFileSizeBytes();
      if (size > maxFileSize) {
        errors.push({
          field: 'size',
          code: 'SIZE_TOO_LARGE',
          message: `File size exceeds maximum allowed size of ${maxFileSize} bytes`,
          value: size,
          constraints: { max: maxFileSize },
        });
        return { isValid: false, errors, warnings };
      }

      // Warning for large files
      if (size > 10 * 1024 * 1024) { // 10MB
        warnings.push({
          field: 'size',
          code: 'LARGE_FILE',
          message: 'File is large and may take time to process',
          value: size,
          suggestion: 'Consider using streaming for large files',
        });
      }

      return { isValid: true, errors, warnings };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'size',
          code: 'SIZE_VALIDATION_ERROR',
          message: `Size validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          value: size,
        }],
        warnings,
      };
    }
  }

  /**
   * Sanitizes input data
   */
  sanitizeInput(data: any, schema: ValidationRule[]): any {
    const sanitized: any = {};

    for (const rule of schema) {
      const value = data[rule.field];
      
      if (value !== undefined) {
        if (rule.sanitizer) {
          sanitized[rule.field] = rule.sanitizer(value);
        } else {
          sanitized[rule.field] = this.sanitizeValue(value, rule.type);
        }
      }
    }

    return sanitized;
  }

  /**
   * Adds validation rules for a tool
   */
  addToolRules(toolName: string, rules: ValidationRule[]): void {
    this.rules.set(toolName, rules);
  }

  /**
   * Gets validation rules for a tool
   */
  getToolRules(toolName: string): ValidationRule[] | undefined {
    return this.rules.get(toolName);
  }

  /**
   * Updates configuration
   */
  updateConfiguration(newConfig: Configuration): void {
    this.config = newConfig;
  }

  // Private methods

  private validateField(
    data: any,
    rule: ValidationRule,
    context: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitizedValue: any = undefined;

    const value = data[rule.field];

    // Check if required
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: rule.field,
        code: 'REQUIRED_FIELD',
        message: `Field '${rule.field}' is required`,
        value,
      });
      return { isValid: false, errors, warnings, sanitizedData: sanitizedValue };
    }

    // Skip validation if value is not provided and not required
    if (value === undefined || value === null) {
      return { isValid: true, errors, warnings, sanitizedData: sanitizedValue };
    }

    // Type validation
    const typeValidation = this.validateType(value, rule.type, rule.field);
    if (!typeValidation.isValid) {
      errors.push(...typeValidation.errors);
      return { isValid: false, errors, warnings, sanitizedData: sanitizedValue };
    }

    // Sanitize value
    if (rule.sanitizer) {
      sanitizedValue = rule.sanitizer(value);
    } else {
      sanitizedValue = this.sanitizeValue(value, rule.type);
    }

    // Additional validations based on type
    switch (rule.type) {
      case 'string':
        this.validateString(sanitizedValue, rule, errors, warnings);
        break;
      case 'number':
        this.validateNumber(sanitizedValue, rule, errors, warnings);
        break;
      case 'array':
        this.validateArray(sanitizedValue, rule, errors, warnings);
        break;
      case 'enum':
        this.validateEnum(sanitizedValue, rule, errors, warnings);
        break;
    }

    // Custom validation
    if (rule.customValidator) {
      const customResult = rule.customValidator(sanitizedValue, context);
      if (!customResult.isValid) {
        errors.push(...customResult.errors);
      }
      warnings.push(...customResult.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: sanitizedValue,
    };
  }

  private validateType(
    value: any,
    expectedType: string,
    field: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field,
            code: 'INVALID_TYPE',
            message: 'Value must be a string',
            value,
            expectedType: 'string',
          });
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field,
            code: 'INVALID_TYPE',
            message: 'Value must be a number',
            value,
            expectedType: 'number',
          });
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            field,
            code: 'INVALID_TYPE',
            message: 'Value must be a boolean',
            value,
            expectedType: 'boolean',
          });
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field,
            code: 'INVALID_TYPE',
            message: 'Value must be an array',
            value,
            expectedType: 'array',
          });
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push({
            field,
            code: 'INVALID_TYPE',
            message: 'Value must be an object',
            value,
            expectedType: 'object',
          });
        }
        break;
      case 'date':
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
          errors.push({
            field,
            code: 'INVALID_TYPE',
            message: 'Value must be a valid date',
            value,
            expectedType: 'date',
          });
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  private validateString(
    value: string,
    rule: ValidationRule,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push({
        field: rule.field,
        code: 'STRING_TOO_SHORT',
        message: `String must be at least ${rule.minLength} characters long`,
        value,
        constraints: { minLength: rule.minLength },
      });
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push({
        field: rule.field,
        code: 'STRING_TOO_LONG',
        message: `String must be at most ${rule.maxLength} characters long`,
        value,
        constraints: { maxLength: rule.maxLength },
      });
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push({
        field: rule.field,
        code: 'PATTERN_MISMATCH',
        message: `String does not match required pattern`,
        value,
        constraints: { pattern: rule.pattern.toString() },
      });
    }
  }

  private validateNumber(
    value: number,
    rule: ValidationRule,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (rule.min !== undefined && value < rule.min) {
      errors.push({
        field: rule.field,
        code: 'NUMBER_TOO_SMALL',
        message: `Number must be at least ${rule.min}`,
        value,
        constraints: { min: rule.min },
      });
    }

    if (rule.max !== undefined && value > rule.max) {
      errors.push({
        field: rule.field,
        code: 'NUMBER_TOO_LARGE',
        message: `Number must be at most ${rule.max}`,
        value,
        constraints: { max: rule.max },
      });
    }
  }

  private validateArray(
    value: any[],
    rule: ValidationRule,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (rule.min !== undefined && value.length < rule.min) {
      errors.push({
        field: rule.field,
        code: 'ARRAY_TOO_SHORT',
        message: `Array must have at least ${rule.min} items`,
        value,
        constraints: { min: rule.min },
      });
    }

    if (rule.max !== undefined && value.length > rule.max) {
      errors.push({
        field: rule.field,
        code: 'ARRAY_TOO_LONG',
        message: `Array must have at most ${rule.max} items`,
        value,
        constraints: { max: rule.max },
      });
    }

    // Validate array items if rule is specified
    if (rule.items) {
      for (let i = 0; i < value.length; i++) {
        const itemResult = this.validateField(
          { [rule.field]: value[i] },
          { ...rule.items, field: `${rule.field}[${i}]` },
          {} as ValidationContext
        );
        
        if (!itemResult.isValid) {
          errors.push(...itemResult.errors);
        }
        warnings.push(...itemResult.warnings);
      }
    }
  }

  private validateEnum(
    value: any,
    rule: ValidationRule,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field: rule.field,
        code: 'INVALID_ENUM_VALUE',
        message: `Value must be one of: ${rule.enum.join(', ')}`,
        value,
        constraints: { enum: rule.enum },
      });
    }
  }

  private sanitizeValue(value: any, type: string): any {
    switch (type) {
      case 'string':
        return typeof value === 'string' ? value.trim() : String(value);
      case 'number':
        return typeof value === 'number' ? value : Number(value);
      case 'boolean':
        return Boolean(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'object':
        return typeof value === 'object' && value !== null ? value : {};
      default:
        return value;
    }
  }

  private containsSuspiciousPatterns(text: string): boolean {
    const suspiciousPatterns = [
      /\.\./,           // Directory traversal
      /\/etc\//,        // System directories
      /\/root\//,       // Root directory
      /\/home\//,       // Home directories
      /\/var\//,        // System directories
      /\/usr\//,        // System directories
      /\/bin\//,        // System directories
      /\/sbin\//,       // System directories
      /\/tmp\//,        // Temporary directories
      /\/proc\//,       // Process directories
      /\/sys\//,        // System directories
      /\/dev\//,        // Device directories
      /<script/i,       // Script tags
      /javascript:/i,   // JavaScript protocol
      /data:/i,         // Data protocol
      /vbscript:/i,     // VBScript protocol
    ];

    return suspiciousPatterns.some(pattern => pattern.test(text));
  }

  private initializeDefaultRules(): void {
    // List directory tool rules
    this.addToolRules('list_directory', [
      {
        field: 'path',
        type: 'path',
        required: true,
        maxLength: 4096,
      },
      {
        field: 'includeHidden',
        type: 'boolean',
        required: false,
      },
      {
        field: 'maxDepth',
        type: 'number',
        required: false,
        min: 1,
        max: 20,
      },
      {
        field: 'sortBy',
        type: 'enum',
        required: false,
        enum: ['name', 'size', 'modified', 'type'],
      },
      {
        field: 'sortOrder',
        type: 'enum',
        required: false,
        enum: ['asc', 'desc'],
      },
      {
        field: 'maxResults',
        type: 'number',
        required: false,
        min: 1,
        max: 10000,
      },
    ]);

    // Read file tool rules
    this.addToolRules('read_file', [
      {
        field: 'path',
        type: 'path',
        required: true,
        maxLength: 4096,
      },
      {
        field: 'encoding',
        type: 'enum',
        required: false,
        enum: ['utf-8', 'utf-16', 'ascii', 'binary', 'base64', 'hex', 'latin1', 'ucs2', 'utf16le', 'cp1252', 'iso-8859-1'],
      },
      {
        field: 'maxSize',
        type: 'number',
        required: false,
        min: 0,
        max: 104857600, // 100MB
      },
    ]);

    // Search files tool rules
    this.addToolRules('search_files', [
      {
        field: 'query',
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 1000,
      },
      {
        field: 'searchPath',
        type: 'path',
        required: true,
        maxLength: 4096,
      },
      {
        field: 'maxResults',
        type: 'number',
        required: false,
        min: 1,
        max: 10000,
      },
      {
        field: 'fileTypes',
        type: 'array',
        required: false,
        max: 100,
        items: {
          field: 'fileType',
          type: 'string',
          pattern: /^[a-zA-Z0-9]+$/,
        },
      },
    ]);

    // Get file metadata tool rules
    this.addToolRules('get_file_metadata', [
      {
        field: 'path',
        type: 'path',
        required: true,
        maxLength: 4096,
      },
      {
        field: 'includeContentHash',
        type: 'boolean',
        required: false,
      },
      {
        field: 'includePermissions',
        type: 'boolean',
        required: false,
      },
    ]);

    // Check permissions tool rules
    this.addToolRules('check_permissions', [
      {
        field: 'path',
        type: 'path',
        required: true,
        maxLength: 4096,
      },
      {
        field: 'operation',
        type: 'enum',
        required: true,
        enum: ['read', 'write', 'execute', 'list'],
      },
      {
        field: 'userId',
        type: 'string',
        required: false,
        maxLength: 255,
      },
    ]);
  }
}
