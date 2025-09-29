import crypto from 'crypto';

interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
}

interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
  algorithm: string;
}

interface SecureStorageOptions {
  expirationTime?: number; // in milliseconds
  compressionEnabled?: boolean;
  integrityCheck?: boolean;
}

export class DataEncryption {
  private static readonly CONFIG: EncryptionConfig = {
    algorithm: 'aes-256-cbc',
    keyLength: 32,
    ivLength: 16,
    saltLength: 32,
    iterations: 100000 // PBKDF2 iterations
  };

  private static readonly MASTER_KEY: string = process.env.ENCRYPTION_MASTER_KEY || '';

  // Initialize encryption with environment validation
  public static initialize(): boolean {
    if (!this.MASTER_KEY || this.MASTER_KEY.length < 32) {
      console.error('🔐 CRITICAL: ENCRYPTION_MASTER_KEY not found or too short. Minimum 32 characters required.');
      return false;
    }
    
    console.log('🔐 Data encryption initialized successfully');
    return true;
  }

  // Derive key from master key and salt using PBKDF2
  private static deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.MASTER_KEY,
      salt,
      this.CONFIG.iterations,
      this.CONFIG.keyLength,
      'sha512'
    );
  }

  // Encrypt sensitive data
  public static encrypt(plaintext: string, options: SecureStorageOptions = {}): EncryptedData {
    try {
      // Generate cryptographically secure random values
      const salt = crypto.randomBytes(this.CONFIG.saltLength);
      const iv = crypto.randomBytes(this.CONFIG.ivLength);
      
      // Derive key from master key and salt
      const key = this.deriveKey(salt);
      
      // Compress data if enabled
      let dataToEncrypt = plaintext;
      if (options.compressionEnabled) {
        dataToEncrypt = this.compressData(plaintext);
      }
      
      // Add expiration timestamp if specified
      if (options.expirationTime) {
        const expiresAt = Date.now() + options.expirationTime;
        dataToEncrypt = JSON.stringify({
          data: dataToEncrypt,
          expiresAt
        });
      }
      
      // Create cipher
      const cipher = crypto.createCipher(this.CONFIG.algorithm, key);
      
      // Encrypt the data
      let encrypted = cipher.update(dataToEncrypt, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        data: encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        algorithm: this.CONFIG.algorithm
      };
      
    } catch (error) {
      console.error('🔐 Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  // Decrypt sensitive data
  public static decrypt(encryptedData: EncryptedData): string {
    try {
      // Validate input
      if (!encryptedData.data || !encryptedData.iv || !encryptedData.salt) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Convert hex strings back to buffers
      const salt = Buffer.from(encryptedData.salt, 'hex');
      
      // Derive the same key
      const key = this.deriveKey(salt);
      
      // Create decipher
      const decipher = crypto.createDecipher(encryptedData.algorithm, key);
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Check for expiration and decompress if needed
      let result = decrypted;
      
      try {
        const parsed = JSON.parse(decrypted);
        if (parsed.expiresAt && parsed.data) {
          // Check expiration
          if (Date.now() > parsed.expiresAt) {
            throw new Error('Encrypted data has expired');
          }
          result = parsed.data;
        }
      } catch {
        // Not JSON, treat as plain text
        result = decrypted;
      }
      
      // Decompress if it was compressed
      if (result.startsWith('COMPRESSED:')) {
        result = this.decompressData(result);
      }
      
      return result;
      
    } catch (error) {
      console.error('🔐 Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  // Simple compression using base64 (in production, use proper compression)
  private static compressData(data: string): string {
    const compressed = Buffer.from(data, 'utf8').toString('base64');
    return `COMPRESSED:${compressed}`;
  }

  // Simple decompression
  private static decompressData(data: string): string {
    if (!data.startsWith('COMPRESSED:')) {
      return data;
    }
    const compressed = data.substring(11); // Remove 'COMPRESSED:' prefix
    return Buffer.from(compressed, 'base64').toString('utf8');
  }

  // Encrypt object (converts to JSON first)
  public static encryptObject(obj: Record<string, unknown>, options: SecureStorageOptions = {}): EncryptedData {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString, options);
  }

  // Decrypt object (parses JSON after decryption)
  public static decryptObject<T = Record<string, unknown>>(encryptedData: EncryptedData): T {
    const jsonString = this.decrypt(encryptedData);
    return JSON.parse(jsonString) as T;
  }

  // Generate secure random token
  public static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash sensitive data (one-way)
  public static hashData(data: string, salt?: string): { hash: string; salt: string } {
    const finalSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, finalSalt, this.CONFIG.iterations, 64, 'sha512').toString('hex');
    return { hash, salt: finalSalt };
  }

  // Verify hashed data
  public static verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: newHash } = this.hashData(data, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(newHash, 'hex'));
  }
}

export class SecureStorage {
  private static storage: Map<string, EncryptedData> = new Map();
  private static expirationTimers: Map<string, NodeJS.Timeout> = new Map();

  // Store encrypted data with optional expiration
  public static store(
    key: string, 
    data: string | Record<string, unknown>, 
    options: SecureStorageOptions = {}
  ): boolean {
    try {
      // Clear existing timer if any
      const existingTimer = this.expirationTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.expirationTimers.delete(key);
      }

      // Encrypt the data
      const encrypted = typeof data === 'string' 
        ? DataEncryption.encrypt(data, options)
        : DataEncryption.encryptObject(data, options);

      // Store encrypted data
      this.storage.set(key, encrypted);

      // Set expiration timer if specified
      if (options.expirationTime) {
        const timer = setTimeout(() => {
          this.remove(key);
        }, options.expirationTime);
        this.expirationTimers.set(key, timer);
      }

      return true;
    } catch (error) {
      console.error(`🔐 Failed to store data for key ${key}:`, error);
      return false;
    }
  }

  // Retrieve and decrypt data
  public static retrieve(key: string): string | null {
    try {
      const encrypted = this.storage.get(key);
      if (!encrypted) {
        return null;
      }

      return DataEncryption.decrypt(encrypted);
    } catch (error) {
      console.error(`🔐 Failed to retrieve data for key ${key}:`, error);
      // Remove corrupted data
      this.remove(key);
      return null;
    }
  }

  // Retrieve and decrypt object
  public static retrieveObject<T = Record<string, unknown>>(key: string): T | null {
    try {
      const encrypted = this.storage.get(key);
      if (!encrypted) {
        return null;
      }

      return DataEncryption.decryptObject<T>(encrypted);
    } catch (error) {
      console.error(`🔐 Failed to retrieve object for key ${key}:`, error);
      // Remove corrupted data
      this.remove(key);
      return null;
    }
  }

  // Remove data and clear timer
  public static remove(key: string): boolean {
    const timer = this.expirationTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.expirationTimers.delete(key);
    }

    return this.storage.delete(key);
  }

  // Check if key exists
  public static exists(key: string): boolean {
    return this.storage.has(key);
  }

  // Get all keys
  public static getKeys(): string[] {
    return Array.from(this.storage.keys());
  }

  // Clear all data
  public static clear(): void {
    // Clear all timers
    for (const timer of this.expirationTimers.values()) {
      clearTimeout(timer);
    }
    this.expirationTimers.clear();
    
    // Clear storage
    this.storage.clear();
  }

  // Get storage statistics
  public static getStats(): {
    totalKeys: number;
    activeTimers: number;
    memoryUsage: string;
  } {
    return {
      totalKeys: this.storage.size,
      activeTimers: this.expirationTimers.size,
      memoryUsage: `${Math.round(JSON.stringify(Array.from(this.storage.entries())).length / 1024)}KB`
    };
  }
}

// Enhanced password encryption for database storage
export class PasswordEncryption {
  private static readonly PEPPER = process.env.PASSWORD_PEPPER || 'fitness-platform-pepper-2024';
  
  // Enhanced password hashing with salt + pepper
  public static async hashPassword(password: string): Promise<string> {
    try {
      // Generate unique salt
      const salt = crypto.randomBytes(16).toString('hex');
      
      // Combine password with pepper
      const pepperedPassword = password + this.PEPPER;
      
      // Hash with PBKDF2
      const hash = crypto.pbkdf2Sync(pepperedPassword, salt, 100000, 64, 'sha512').toString('hex');
      
      // Combine salt and hash
      return `${salt}:${hash}`;
    } catch (error) {
      console.error('🔐 Password hashing failed:', error);
      throw new Error('Password encryption failed');
    }
  }

  // Verify password against stored hash
  public static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
      const [salt, hash] = storedHash.split(':');
      if (!salt || !hash) {
        return false;
      }

      // Combine password with pepper
      const pepperedPassword = password + this.PEPPER;
      
      // Hash the provided password with the stored salt
      const hashToVerify = crypto.pbkdf2Sync(pepperedPassword, salt, 100000, 64, 'sha512').toString('hex');
      
      // Use timing-safe comparison
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashToVerify, 'hex'));
    } catch (error) {
      console.error('🔐 Password verification failed:', error);
      return false;
    }
  }
}

// Initialize encryption on module load
if (!DataEncryption.initialize()) {
  console.error('🚨 CRITICAL: Data encryption initialization failed. Application security compromised.');
}