import axios, { AxiosInstance } from 'axios';
import { config } from './config';
import { oauthManager } from './oauth';
import { GlucoseReading, Device, DataRangeResponse } from '../../shared/types';
import { formatDateForDexcom } from './utils';

// Local interfaces removed in favor of shared types

class DexcomAPIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.dexcom.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await oauthManager.getValidAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle 401 errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Try to refresh token once
          try {
            await oauthManager.refreshAccessToken();
            // Retry the original request
            return this.client.request(error.config);
          } catch (refreshError) {
            console.error('❌ Token refresh failed, user needs to re-authenticate');
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );
  }


// ... existing code ...

  /**
   * Generate realistic mock glucose readings for testing
   */
  private generateMockReadings(startDate: string, endDate: string): GlucoseReading[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const readings: GlucoseReading[] = [];
    
    // Generate data points every 5 minutes
    let currentTime = new Date(start.getTime());
    
    // Base glucose level and sine wave parameters for realistic fluctuation
    const baseGlucose = 120;
    const amplitude = 40;
    const frequency = 2 * Math.PI / (24 * 60 * 60 * 1000); // One cycle per 24h
    
    while (currentTime <= end) {
      // Calculate glucose value using sine wave + random noise
      const timeOffset = currentTime.getTime();
      const sineValue = Math.sin(timeOffset * frequency);
      const noise = (Math.random() - 0.5) * 10; // +/- 5 mg/dL noise
      const value = Math.round(baseGlucose + (amplitude * sineValue) + noise);
      
      const formattedTime = formatDateForDexcom(currentTime);
      
      // Determine trend based on slope (simplified)
      const nextValue = Math.round(baseGlucose + (amplitude * Math.sin((timeOffset + 5 * 60 * 1000) * frequency)));
      const diff = nextValue - value;
      
      let trend = 'flat';
      if (diff > 2) trend = 'singleUp';
      else if (diff > 1) trend = 'fortyFiveUp';
      else if (diff < -2) trend = 'singleDown';
      else if (diff < -1) trend = 'fortyFiveDown';
      
      readings.push({
        systemTime: formattedTime,
        displayTime: formattedTime, // Simplified: same as systemTime
        value,
        unit: 'mg/dL',
        trend,
        trendRate: Number((diff / 5).toFixed(1)) // Rate per minute
      });
      
      // Advance by 5 minutes
      currentTime = new Date(currentTime.getTime() + 5 * 60 * 1000);
    }
    
    return readings;
  }

  /**
   * Get estimated glucose values (EGVs) within a time range
   */
  async getGlucoseValues(startDate: string, endDate: string): Promise<GlucoseReading[]> {
    if (config.mockMode) {
      console.log('🧪 MOCK MODE: Generating synthetic glucose data');
      const mockData = this.generateMockReadings(startDate, endDate);
      console.log(`🧪 Generated ${mockData.length} mock readings:`, JSON.stringify(mockData.slice(0, 5), null, 2) + (mockData.length > 5 ? '...' : ''));
      return mockData;
    }

    try {
      const response = await this.client.get('/v3/users/self/egvs', {
        params: { startDate, endDate },
      });

      const data = response.data.egvs || response.data.records || [];
      console.log(`📡 API Glucose Values (${data.length} records):`, JSON.stringify(data.slice(0, 5), null, 2) + (data.length > 5 ? '...' : ''));
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching glucose values:', error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get the most recent glucose reading
   */
  async getCurrentGlucose(): Promise<GlucoseReading | null> {
    if (config.mockMode) {
      // Generate a small window to get the latest reading
      const now = new Date();
      const start = new Date(now.getTime() - 10 * 60 * 1000); // 10 mins ago
      const readings = this.generateMockReadings(
        formatDateForDexcom(start),
        formatDateForDexcom(now)
      );
      return readings[readings.length - 1] || null;
    }

    try {
      // Get readings from the last 15 minutes
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 15 * 60 * 1000);

      const readings = await this.getGlucoseValues(
        formatDateForDexcom(startDate),
        formatDateForDexcom(endDate)
      );

      if (readings.length === 0) {
        return null;
      }

      // Return the most recent reading
      return readings[readings.length - 1];
    } catch (error) {
      console.error('❌ Error fetching current glucose');
      throw error;
    }
  }

  /**
   * Get available data range for the user
   */
  async getDataRange(): Promise<DataRangeResponse> {
    if (config.mockMode) {
      const now = new Date();
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      const mockRange = {
        start: {
          systemTime: formatDateForDexcom(start),
          displayTime: formatDateForDexcom(start),
        },
        end: {
          systemTime: formatDateForDexcom(now),
          displayTime: formatDateForDexcom(now),
        },
      };
      console.log('✅ Mock Data Range:', JSON.stringify(mockRange, null, 2));
      return mockRange;
    }

    try {
      const response = await this.client.get('/v3/users/self/dataRange');
      console.log('📡 API Data Range:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching data range:', error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get user's devices
   */
  async getDevices(): Promise<Device[]> {
    if (config.mockMode) {
      const mockDevices = [
        {
          lastUploadDate: formatDateForDexcom(new Date()),
          alertSchedules: [],
          unitsMeasurement: 'mg/dL',
          displayDevice: 'iPhone',
          transmitterGeneration: 'g7',
          transmitterId: 'MOCK-TX-ID',
          model: 'G7 Mobile App',
        },
      ];
      console.log('✅ Mock Devices:', JSON.stringify(mockDevices, null, 2));
      return mockDevices;
    }

    try {
      const response = await this.client.get('/v3/users/self/devices');
      return response.data.devices || [];
    } catch (error: any) {
      console.error('❌ Error fetching devices:', error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Calculate statistics for glucose readings
   */
  calculateStatistics(readings: GlucoseReading[]) {
    if (readings.length === 0) {
      return null;
    }

    const values = readings.map((r) => r.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate standard deviation
    const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    // Time in range calculations (assuming mg/dL units)
    const inRange = readings.filter((r) => r.value >= 70 && r.value <= 180).length;
    const timeInRangePercent = (inRange / readings.length) * 100;

    return {
      count: readings.length,
      average: Math.round(avg),
      min,
      max,
      standardDeviation: Math.round(stdDev),
      timeInRangePercent: Math.round(timeInRangePercent),
      unit: readings[0]?.unit || 'mg/dL',
    };
  }
}

// Export singleton instance
export const dexcomClient = new DexcomAPIClient();
