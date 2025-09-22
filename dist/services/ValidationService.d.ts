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
export declare class ValidationService {
    private config;
    private pathValidationService;
    private rules;
    constructor(config: Configuration, pathValidationService: PathValidationService);
    /**
     * Validates data against a schema
     */
    validate(data: any, schema: ValidationRule[], context: ValidationContext): ValidationResult;
    /**
     * Validates MCP tool input
     */
    validateToolInput(toolName: string, input: any, context: ValidationContext): ValidationResult;
    /**
     * Validates path input
     */
    validatePath(path: string, operation: string, context: ValidationContext): ValidationResult;
    /**
     * Validates search query
     */
    validateSearchQuery(query: string, context: ValidationContext): ValidationResult;
    /**
     * Validates file size limits
     */
    validateFileSize(size: number, context: ValidationContext): ValidationResult;
    /**
     * Sanitizes input data
     */
    sanitizeInput(data: any, schema: ValidationRule[]): any;
    /**
     * Adds validation rules for a tool
     */
    addToolRules(toolName: string, rules: ValidationRule[]): void;
    /**
     * Gets validation rules for a tool
     */
    getToolRules(toolName: string): ValidationRule[] | undefined;
    /**
     * Updates configuration
     */
    updateConfiguration(newConfig: Configuration): void;
    private validateField;
    private validateType;
    private validateString;
    private validateNumber;
    private validateArray;
    private validateEnum;
    private sanitizeValue;
    private containsSuspiciousPatterns;
    private initializeDefaultRules;
}
//# sourceMappingURL=ValidationService.d.ts.map