import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Enhanced Password Security System
export class PasswordSecurity {
  // Password complexity requirements
  static readonly REQUIREMENTS = {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxConsecutiveChars: 3,
    disallowCommonPatterns: true,
    disallowPersonalInfo: true
  };

  // Common weak passwords and patterns
  static readonly WEAK_PATTERNS = [
    /password/i,
    /123456/,
    /qwerty/i,
    /admin/i,
    /login/i,
    /welcome/i,
    /letmein/i,
    /monkey/i,
    /dragon/i,
    /master/i,
    /(\w)\1{2,}/i, // Repeated characters (aaa, 111)
    /(012|123|234|345|456|567|678|789|890)/i, // Sequential numbers
    /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i // Sequential letters
  ];

  // Enhanced password validation
  static validatePassword(password: string, userInfo?: {
    name?: string;
    email?: string;
    oldPasswords?: string[];
  }): { isValid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    // Basic length check
    if (password.length < this.REQUIREMENTS.minLength) {
      feedback.push(`Password must be at least ${this.REQUIREMENTS.minLength} characters long`);
      return { isValid: false, score: 0, feedback };
    }

    if (password.length > this.REQUIREMENTS.maxLength) {
      feedback.push(`Password must not exceed ${this.REQUIREMENTS.maxLength} characters`);
      return { isValid: false, score: 0, feedback };
    }

    // Character requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?~]/.test(password);

    if (!hasUppercase) feedback.push('Password must contain at least one uppercase letter');
    if (!hasLowercase) feedback.push('Password must contain at least one lowercase letter');
    if (!hasNumbers) feedback.push('Password must contain at least one number');
    if (!hasSpecialChars) feedback.push('Password must contain at least one special character');

    // Score calculation
    if (hasUppercase) score += 1;
    if (hasLowercase) score += 1;
    if (hasNumbers) score += 1;
    if (hasSpecialChars) score += 1;

    // Length bonus
    if (password.length >= 16) score += 2;
    else if (password.length >= 14) score += 1;

    // Character variety bonus
    const uniqueChars = new Set(password.toLowerCase()).size;
    if (uniqueChars >= 10) score += 2;
    else if (uniqueChars >= 8) score += 1;

    // Check for weak patterns
    for (const pattern of this.WEAK_PATTERNS) {
      if (pattern.test(password)) {
        feedback.push('Password contains common weak patterns');
        score -= 2;
        break;
      }
    }

    // Check consecutive characters
    let consecutiveCount = 1;
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        consecutiveCount++;
        if (consecutiveCount > this.REQUIREMENTS.maxConsecutiveChars) {
          feedback.push('Password contains too many consecutive identical characters');
          score -= 1;
          break;
        }
      } else {
        consecutiveCount = 1;
      }
    }

    // Check against personal information
    if (userInfo) {
      const personalData = [
        userInfo.name?.toLowerCase(),
        userInfo.email?.split('@')[0]?.toLowerCase(),
        userInfo.email?.split('@')[1]?.split('.')[0]?.toLowerCase()
      ].filter(Boolean);

      for (const data of personalData) {
        if (data && password.toLowerCase().includes(data)) {
          feedback.push('Password should not contain personal information');
          score -= 2;
          break;
        }
      }

      // Check against old passwords
      if (userInfo.oldPasswords) {
        for (const oldPassword of userInfo.oldPasswords) {
          if (oldPassword === password) {
            feedback.push('Password cannot be the same as a recently used password');
            return { isValid: false, score: 0, feedback };
          }
        }
      }
    }

    // Final validation
    const isValid = feedback.length === 0 && score >= 4;
    
    if (!isValid && feedback.length === 0) {
      feedback.push('Password does not meet security requirements');
    }

    return { isValid, score: Math.max(0, score), feedback };
  }

  // Generate secure password
  static generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + specialChars;
    let password = '';

    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Enhanced password hashing with additional security
  static async hashPassword(password: string): Promise<{
    hash: string;
    salt: string;
    pepper: string;
    timestamp: number;
  }> {
    // Generate random salt
    const salt = crypto.randomBytes(32).toString('hex');
    
    // Generate pepper (stored separately from hash)
    const pepper = crypto.randomBytes(16).toString('hex');
    
    // Combine password with salt and pepper
    const combinedPassword = password + salt + pepper;
    
    // Use bcrypt with high cost factor
    const hash = await bcrypt.hash(combinedPassword, 14);
    
    return {
      hash,
      salt,
      pepper,
      timestamp: Date.now()
    };
  }

  // Verify password with enhanced security
  static async verifyPassword(
    password: string,
    hash: string,
    salt: string,
    pepper: string
  ): Promise<boolean> {
    try {
      const combinedPassword = password + salt + pepper;
      return await bcrypt.compare(combinedPassword, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  // Check if password needs rehashing (if cost factor changed)
  static needsRehash(hash: string): boolean {
    try {
      const rounds = bcrypt.getRounds(hash);
      return rounds < 14; // Current requirement
    } catch {
      return true; // If we can't determine rounds, rehash for safety
    }
  }

  // Password strength meter (0-100)
  static calculateStrength(password: string): {
    score: number;
    level: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
    suggestions: string[];
  } {
    let score = 0;
    const suggestions: string[] = [];

    // Length scoring (0-30 points)
    if (password.length >= 16) score += 30;
    else if (password.length >= 12) score += 20;
    else if (password.length >= 8) score += 10;
    else suggestions.push('Use at least 12 characters');

    // Character variety (0-40 points)
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?~]/.test(password);

    if (hasLower) score += 5;
    else suggestions.push('Add lowercase letters');
    
    if (hasUpper) score += 5;
    else suggestions.push('Add uppercase letters');
    
    if (hasNumber) score += 10;
    else suggestions.push('Add numbers');
    
    if (hasSpecial) score += 20;
    else suggestions.push('Add special characters');

    // Complexity bonus (0-30 points)
    const uniqueChars = new Set(password).size;
    score += Math.min(uniqueChars * 2, 30);

    // Penalty for common patterns (-20 points each)
    for (const pattern of this.WEAK_PATTERNS) {
      if (pattern.test(password)) {
        score -= 20;
        suggestions.push('Avoid common patterns');
        break;
      }
    }

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));

    let level: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
    if (score >= 90) level = 'Very Strong';
    else if (score >= 75) level = 'Strong';
    else if (score >= 60) level = 'Good';
    else if (score >= 40) level = 'Fair';
    else if (score >= 20) level = 'Weak';
    else level = 'Very Weak';

    return { score, level, suggestions };
  }
}

// Account lockout management
export class AccountLockout {
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  private static readonly PROGRESSIVE_DELAYS = [1000, 2000, 5000, 10000, 30000]; // 1s, 2s, 5s, 10s, 30s

  private static failedAttempts = new Map<string, {
    count: number;
    firstAttempt: number;
    lastAttempt: number;
    lockedUntil?: number;
  }>();

  static recordFailedAttempt(identifier: string): {
    attempts: number;
    lockoutTime?: number;
    nextAttemptDelay: number;
  } {
    const now = Date.now();
    let record = this.failedAttempts.get(identifier);

    if (!record) {
      record = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now
      };
    }

    // Reset if it's been more than lockout duration since last attempt
    if (now - record.lastAttempt > this.LOCKOUT_DURATION) {
      record = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now
      };
    }

    record.count++;
    record.lastAttempt = now;

    // Calculate progressive delay
    const delayIndex = Math.min(record.count - 1, this.PROGRESSIVE_DELAYS.length - 1);
    const nextAttemptDelay = this.PROGRESSIVE_DELAYS[delayIndex];

    // Lock account if max attempts reached
    if (record.count >= this.MAX_ATTEMPTS) {
      record.lockedUntil = now + this.LOCKOUT_DURATION;
    }

    this.failedAttempts.set(identifier, record);

    return {
      attempts: record.count,
      lockoutTime: record.lockedUntil,
      nextAttemptDelay
    };
  }

  static recordSuccessfulAttempt(identifier: string) {
    this.failedAttempts.delete(identifier);
  }

  static isLocked(identifier: string): {
    locked: boolean;
    lockedUntil?: number;
    attempts: number;
  } {
    const record = this.failedAttempts.get(identifier);
    
    if (!record) {
      return { locked: false, attempts: 0 };
    }

    const now = Date.now();
    
    // Check if lockout has expired
    if (record.lockedUntil && now > record.lockedUntil) {
      this.failedAttempts.delete(identifier);
      return { locked: false, attempts: 0 };
    }

    return {
      locked: !!record.lockedUntil && now < record.lockedUntil,
      lockedUntil: record.lockedUntil,
      attempts: record.count
    };
  }

  static getRemainingLockoutTime(identifier: string): number {
    const record = this.failedAttempts.get(identifier);
    if (!record?.lockedUntil) return 0;
    
    const remaining = record.lockedUntil - Date.now();
    return Math.max(0, remaining);
  }

  static getAttemptCount(identifier: string): number {
    const record = this.failedAttempts.get(identifier);
    return record?.count || 0;
  }

  // Manual unlock (for admin purposes)
  static unlock(identifier: string): boolean {
    return this.failedAttempts.delete(identifier);
  }

  // Get all locked accounts (for monitoring)
  static getLockedAccounts(): Array<{
    identifier: string;
    attempts: number;
    lockedUntil: number;
    remainingTime: number;
  }> {
    const now = Date.now();
    const locked: Array<{
      identifier: string;
      attempts: number;
      lockedUntil: number;
      remainingTime: number;
    }> = [];

    for (const [identifier, record] of this.failedAttempts.entries()) {
      if (record.lockedUntil && now < record.lockedUntil) {
        locked.push({
          identifier,
          attempts: record.count,
          lockedUntil: record.lockedUntil,
          remainingTime: record.lockedUntil - now
        });
      }
    }

    return locked;
  }
}

const SecurityModule = { PasswordSecurity, AccountLockout };
export default SecurityModule;