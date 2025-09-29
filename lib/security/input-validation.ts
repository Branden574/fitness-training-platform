import { NextRequest } from 'next/server';
import DOMPurify from 'isomorphic-dompurify';

// Input Validation and Sanitization System
export class InputValidator {
  // Email validation with comprehensive checks
  static validateEmail(email: string): { isValid: boolean; normalized?: string; errors: string[] } {
    const errors: string[] = [];
    
    if (!email) {
      errors.push('Email is required');
      return { isValid: false, errors };
    }

    // Basic format check
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
      return { isValid: false, errors };
    }

    // Length checks
    if (email.length > 254) {
      errors.push('Email address too long');
      return { isValid: false, errors };
    }

    const [localPart] = email.split('@');
    
    if (localPart.length > 64) {
      errors.push('Email local part too long');
      return { isValid: false, errors };
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /[<>]/,           // HTML injection
      /javascript:/i,    // JavaScript protocol
      /data:/i,         // Data URI
      /[\x00-\x1F\x7F]/ // Control characters
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(email)) {
        errors.push('Email contains invalid characters');
        return { isValid: false, errors };
      }
    }

    // Normalize email
    const normalized = email.toLowerCase().trim();

    return { isValid: true, normalized, errors: [] };
  }

  // Name validation
  static validateName(name: string): { isValid: boolean; sanitized?: string; errors: string[] } {
    const errors: string[] = [];
    
    if (!name) {
      errors.push('Name is required');
      return { isValid: false, errors };
    }

    // Length checks
    if (name.length < 1) {
      errors.push('Name cannot be empty');
      return { isValid: false, errors };
    }

    if (name.length > 100) {
      errors.push('Name too long (max 100 characters)');
      return { isValid: false, errors };
    }

    // Allow letters, spaces, hyphens, apostrophes, and periods
    const nameRegex = /^[a-zA-Z\s\-'.]+$/;
    
    if (!nameRegex.test(name)) {
      errors.push('Name contains invalid characters');
      return { isValid: false, errors };
    }

    // Sanitize and normalize
    let sanitized = name.trim();
    sanitized = sanitized.replace(/\s+/g, ' '); // Multiple spaces to single space
    sanitized = sanitized.replace(/^[\s\-'.]+|[\s\-'.]+$/g, ''); // Remove leading/trailing special chars

    if (!sanitized) {
      errors.push('Name cannot be empty after cleaning');
      return { isValid: false, errors };
    }

    return { isValid: true, sanitized, errors: [] };
  }

  // Phone number validation
  static validatePhone(phone: string): { isValid: boolean; normalized?: string; errors: string[] } {
    const errors: string[] = [];
    
    if (!phone) {
      errors.push('Phone number is required');
      return { isValid: false, errors };
    }

    // Remove all non-digit characters for processing
    const digitsOnly = phone.replace(/\D/g, '');

    // Check length (US format: 10 digits, international: 7-15 digits)
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      errors.push('Invalid phone number length');
      return { isValid: false, errors };
    }

    // Basic format validation
    const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)\.]{6,20}$/;
    
    if (!phoneRegex.test(phone)) {
      errors.push('Invalid phone number format');
      return { isValid: false, errors };
    }

    // Normalize to international format
    let normalized = digitsOnly;
    if (normalized.length === 10 && !phone.startsWith('+')) {
      normalized = '+1' + normalized; // Assume US number
    } else if (!phone.startsWith('+')) {
      normalized = '+' + normalized;
    }

    return { isValid: true, normalized, errors: [] };
  }

  // URL validation
  static validateUrl(url: string): { isValid: boolean; normalized?: string; errors: string[] } {
    const errors: string[] = [];
    
    if (!url) {
      errors.push('URL is required');
      return { isValid: false, errors };
    }

    try {
      const urlObj = new URL(url);
      
      // Only allow HTTP and HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        errors.push('Only HTTP and HTTPS URLs are allowed');
        return { isValid: false, errors };
      }

      // Check for dangerous patterns
      const dangerousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /file:/i,
        /ftp:/i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(url)) {
          errors.push('URL contains dangerous protocol');
          return { isValid: false, errors };
        }
      }

      return { isValid: true, normalized: urlObj.toString(), errors: [] };
    } catch {
      errors.push('Invalid URL format');
      return { isValid: false, errors };
    }
  }

  // Numeric validation
  static validateNumber(
    value: string | number,
    options: {
      min?: number;
      max?: number;
      allowFloat?: boolean;
      allowNegative?: boolean;
    } = {}
  ): { isValid: boolean; number?: number; errors: string[] } {
    const errors: string[] = [];
    
    if (value === '' || value === null || value === undefined) {
      errors.push('Number is required');
      return { isValid: false, errors };
    }

    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) {
      errors.push('Invalid number format');
      return { isValid: false, errors };
    }

    if (!options.allowFloat && !Number.isInteger(num)) {
      errors.push('Decimal numbers not allowed');
      return { isValid: false, errors };
    }

    if (!options.allowNegative && num < 0) {
      errors.push('Negative numbers not allowed');
      return { isValid: false, errors };
    }

    if (options.min !== undefined && num < options.min) {
      errors.push(`Number must be at least ${options.min}`);
      return { isValid: false, errors };
    }

    if (options.max !== undefined && num > options.max) {
      errors.push(`Number must not exceed ${options.max}`);
      return { isValid: false, errors };
    }

    return { isValid: true, number: num, errors: [] };
  }

  // Text content validation and sanitization
  static validateText(
    text: string,
    options: {
      minLength?: number;
      maxLength?: number;
      allowHtml?: boolean;
      allowEmpty?: boolean;
    } = {}
  ): { isValid: boolean; sanitized?: string; errors: string[] } {
    const errors: string[] = [];
    
    if (!text && !options.allowEmpty) {
      errors.push('Text is required');
      return { isValid: false, errors };
    }

    if (!text && options.allowEmpty) {
      return { isValid: true, sanitized: '', errors: [] };
    }

    // Length validation
    if (options.minLength && text.length < options.minLength) {
      errors.push(`Text must be at least ${options.minLength} characters`);
      return { isValid: false, errors };
    }

    if (options.maxLength && text.length > options.maxLength) {
      errors.push(`Text must not exceed ${options.maxLength} characters`);
      return { isValid: false, errors };
    }

    // Sanitize based on HTML allowance
    let sanitized: string;
    
    if (options.allowHtml) {
      // Allow specific HTML tags only
      sanitized = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
        ALLOWED_ATTR: []
      });
    } else {
      // Strip all HTML and encode special characters
      sanitized = text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }

    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return { isValid: true, sanitized, errors: [] };
  }
}

// SQL Injection Prevention
export class SQLInjectionPrevention {
  private static readonly DANGEROUS_PATTERNS = [
    /('|(\\\')|(\"|(\\\"))){1}((\s{1})*((\-{2})|(\/\*)|(\*\/)|(\*)))/i,
    /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|((\%3B)|(;)))/i,
    /(((\%3C)|<){1}((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47)))/i,
    /((\%3C)|<){1}((\%73)|s|(\%53))((\%63)|c|(\%43))((\%72)|r|(\%52))/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /union\s+(all\s+)?select/i,
    /(select|insert|update|delete|drop|create|alter|exec|execute)\s/i
  ];

  static detectSQLInjection(input: string): boolean {
    if (!input) return false;
    
    const normalizedInput = input.toLowerCase();
    
    return this.DANGEROUS_PATTERNS.some(pattern => pattern.test(normalizedInput));
  }

  static sanitizeForQuery(input: string): string {
    if (!input) return '';
    
    // Remove or escape dangerous characters
    return input
      .replace(/'/g, "''")           // Escape single quotes
      .replace(/;/g, '\\;')          // Escape semicolons
      .replace(/--/g, '\\-\\-')      // Escape SQL comments
      .replace(/\/\*/g, '\\/\\*')    // Escape block comment start
      .replace(/\*\//g, '\\*\\/')    // Escape block comment end
      .replace(/\x00/g, '');         // Remove null bytes
  }
}

// XSS Prevention
export class XSSPrevention {
  private static readonly XSS_PATTERNS = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
    /<embed[\s\S]*?>/gi,
    /<applet[\s\S]*?>[\s\S]*?<\/applet>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi,  // Event handlers
    /<\s*\w+\s+[^>]*\s*=/gi // Attributes that might contain scripts
  ];

  static detectXSS(input: string): boolean {
    if (!input) return false;
    
    return this.XSS_PATTERNS.some(pattern => pattern.test(input));
  }

  static sanitizeHTML(input: string): string {
    if (!input) return '';
    
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      SANITIZE_DOM: true
    });
  }

  static escapeHTML(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

// Request Validation Middleware
export class RequestValidator {
  static validateHeaders(req: NextRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check Content-Type for POST/PUT requests
    const method = req.method;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const contentType = req.headers.get('content-type');
      if (!contentType) {
        errors.push('Content-Type header is required');
      } else if (!contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
        errors.push('Invalid Content-Type');
      }
    }

    // Check for required headers
    const userAgent = req.headers.get('user-agent');
    if (!userAgent || userAgent.length < 10) {
      errors.push('Invalid or missing User-Agent');
    }

    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-host',
      'x-original-url',
      'x-rewrite-url'
    ];

    for (const header of suspiciousHeaders) {
      if (req.headers.get(header)) {
        errors.push(`Suspicious header detected: ${header}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  static async validateBody(req: NextRequest, maxSize: number = 1024 * 1024): Promise<{
    isValid: boolean;
    body?: unknown;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > maxSize) {
        errors.push('Request body too large');
        return { isValid: false, errors };
      }

      const body = await req.json();
      
      // Check for nested depth (prevent DoS attacks)
      const maxDepth = 10;
      if (this.getObjectDepth(body) > maxDepth) {
        errors.push('Request body nesting too deep');
        return { isValid: false, errors };
      }

      // Check for circular references
      try {
        JSON.stringify(body);
      } catch {
        errors.push('Request body contains circular references');
        return { isValid: false, errors };
      }

      return { isValid: true, body, errors: [] };
    } catch {
      errors.push('Invalid JSON in request body');
      return { isValid: false, errors };
    }
  }

  private static getObjectDepth(obj: unknown, depth = 1): number {
    if (obj === null || typeof obj !== 'object') {
      return depth;
    }

    const depths = Object.values(obj as Record<string, unknown>).map(value => 
      this.getObjectDepth(value, depth + 1)
    );

    return Math.max(...depths, depth);
  }

  static validateRequestSize(req: NextRequest, maxSize: number = 10 * 1024 * 1024): boolean {
    const contentLength = req.headers.get('content-length');
    if (!contentLength) return true; // Will be caught later if required
    
    return parseInt(contentLength) <= maxSize;
  }
}

const ValidationModule = {
  InputValidator,
  SQLInjectionPrevention,
  XSSPrevention,
  RequestValidator
};

export default ValidationModule;