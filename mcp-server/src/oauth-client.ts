import axios, { AxiosInstance } from 'axios';

const OAUTH_SERVER_URL = process.env.OAUTH_SERVER_URL || 'http://localhost:3001';

class OAuthServerClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: OAUTH_SERVER_URL,
      timeout: 30000,
    });
  }

  /**
   * Check authentication status
   */
  async checkAuthStatus(): Promise<{ authenticated: boolean; message: string }> {
    try {
      const response = await this.client.get('/auth/status');
      return response.data;
    } catch (error) {
      return {
        authenticated: false,
        message: 'Failed to connect to OAuth server',
      };
    }
  }

  /**
   * Get current glucose reading
   */
  async getCurrentGlucose(): Promise<any> {
    const response = await this.client.get('/api/glucose/current');
    return response.data;
  }

  /**
   * Get glucose readings in a date range
   */
  async getGlucoseRange(startDate: string, endDate: string): Promise<any> {
    const response = await this.client.get('/api/glucose/range', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  /**
   * Get glucose statistics
   */
  async getStatistics(days: number): Promise<any> {
    const response = await this.client.get('/api/statistics', {
      params: { days },
    });
    return response.data;
  }

  /**
   * Get user devices
   */
  async getDevices(): Promise<any> {
    const response = await this.client.get('/api/devices');
    return response.data;
  }

  /**
   * Get available data range
   */
  async getDataRange(): Promise<any> {
    const response = await this.client.get('/api/data-range');
    return response.data;
  }
}

export const oauthClient = new OAuthServerClient();
