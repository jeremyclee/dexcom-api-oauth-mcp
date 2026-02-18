import axios from 'axios';
import { randomBytes } from 'crypto';
import { config } from './config';
import { tokenStore } from './token-store';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

class OAuthManager {
  private stateStore: Map<string, number> = new Map();

  /**
   * Generate authorization URL for user to visit
   */
  getAuthorizationUrl(): { url: string; state: string } {
    const state = randomBytes(16).toString('hex');
    
    // Store state with timestamp for validation (expires in 10 minutes)
    this.stateStore.set(state, Date.now() + 10 * 60 * 1000);

    const params = new URLSearchParams({
      client_id: config.dexcom.clientId,
      redirect_uri: config.dexcom.redirectUri,
      response_type: 'code',
      scope: config.dexcom.scopes.join(' '),
      state,
    });

    const url = `${config.dexcom.authUrl}?${params.toString()}`;
    return { url, state };
  }

  /**
   * Validate state parameter from OAuth callback
   */
  validateState(state: string): boolean {
    const expiry = this.stateStore.get(state);
    if (!expiry) {
      return false;
    }

    if (Date.now() > expiry) {
      this.stateStore.delete(state);
      return false;
    }

    this.stateStore.delete(state);
    return true;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<void> {
    try {
      const params = new URLSearchParams({
        client_id: config.dexcom.clientId,
        client_secret: config.dexcom.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.dexcom.redirectUri,
      });

      const response = await axios.post<TokenResponse>(
        config.dexcom.tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Calculate expiration timestamp
      const expiresAt = Date.now() + expires_in * 1000;

      // Save tokens
      tokenStore.save({
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
      });

      console.log('✅ OAuth tokens obtained and saved');
    } catch (error: any) {
      console.error('❌ Error exchanging code for token:', error?.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    const tokenData = tokenStore.load();
    if (!tokenData || !tokenData.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const params = new URLSearchParams({
        client_id: config.dexcom.clientId,
        client_secret: config.dexcom.clientSecret,
        refresh_token: tokenData.refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await axios.post<TokenResponse>(
        config.dexcom.tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      const expiresAt = Date.now() + expires_in * 1000;

      // Save new tokens
      tokenStore.save({
        accessToken: access_token,
        refreshToken: refresh_token || tokenData.refreshToken, // Some APIs don't return new refresh token
        expiresAt,
      });

      console.log('✅ Access token refreshed');
      return access_token;
    } catch (error: any) {
      console.error('❌ Error refreshing token:', error?.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get valid access token (refreshes if needed)
   */
  async getValidAccessToken(): Promise<string | null> {
    if (config.mockMode) {
      return 'mock-token';
    }

    const tokenData = tokenStore.load();
    if (!tokenData) {
      return null;
    }

    // If token is still valid, return it
    if (tokenStore.isValid()) {
      return tokenData.accessToken;
    }

    // Token expired, try to refresh
    try {
      return await this.refreshAccessToken();
    } catch (error) {
      console.error('❌ Could not refresh token');
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (config.mockMode) {
      return true;
    }
    return tokenStore.load() !== null;
  }

  /**
   * Logout - clear stored tokens
   */
  logout(): void {
    tokenStore.clear();
  }
}

// Export singleton instance
export const oauthManager = new OAuthManager();
