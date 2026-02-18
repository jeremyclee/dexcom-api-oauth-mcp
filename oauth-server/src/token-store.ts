import * as fs from 'fs';
import * as crypto from 'crypto-js';
import { config } from './config';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class TokenStore {
  private filePath: string;
  private encryptionKey: string;

  constructor(filePath: string, encryptionKey: string) {
    this.filePath = filePath;
    this.encryptionKey = encryptionKey;
  }

  /**
   * Save tokens to encrypted file
   */
  save(tokenData: TokenData): void {
    try {
      const jsonString = JSON.stringify(tokenData);
      const encrypted = crypto.AES.encrypt(jsonString, this.encryptionKey).toString();
      fs.writeFileSync(this.filePath, encrypted, 'utf-8');
      console.log('✅ Tokens saved successfully');
    } catch (error) {
      console.error('❌ Error saving tokens:', error);
      throw error;
    }
  }

  /**
   * Load tokens from encrypted file
   */
  load(): TokenData | null {
    try {
      if (!fs.existsSync(this.filePath)) {
        return null;
      }

      const encrypted = fs.readFileSync(this.filePath, 'utf-8');
      const decrypted = crypto.AES.decrypt(encrypted, this.encryptionKey).toString(crypto.enc.Utf8);
      
      if (!decrypted) {
        console.error('❌ Failed to decrypt tokens - check encryption key');
        return null;
      }

      const tokenData = JSON.parse(decrypted) as TokenData;
      return tokenData;
    } catch (error) {
      console.error('❌ Error loading tokens:', error);
      return null;
    }
  }

  /**
   * Check if tokens exist and are not expired
   */
  isValid(): boolean {
    const tokenData = this.load();
    if (!tokenData) {
      return false;
    }

    // Check if access token is expired (with 5 minute buffer)
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    return tokenData.expiresAt > (now + bufferMs);
  }

  /**
   * Clear stored tokens
   */
  clear(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
        console.log('✅ Tokens cleared successfully');
      }
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
    }
  }
}

// Export singleton instance
export const tokenStore = new TokenStore(
  config.tokenStoragePath,
  config.tokenEncryptionKey
);
