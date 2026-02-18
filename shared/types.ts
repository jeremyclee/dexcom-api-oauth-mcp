// Shared TypeScript types for both servers

export interface GlucoseReading {
  systemTime: string;
  displayTime: string;
  value: number;
  unit: string;
  trend: string;
  trendRate?: number;
}

export interface GlucoseStatistics {
  count: number;
  average: number;
  min: number;
  max: number;
  standardDeviation: number;
  timeInRangePercent: number;
  unit: string;
}

export interface Device {
  lastUploadDate: string;
  alertSchedules: any[];
  unitsMeasurement: string;
  displayDevice: string;
  transmitterGeneration: string;
  transmitterId: string;
  model: string;
}

export interface DataRangeResponse {
  start: {
    systemTime: string;
    displayTime: string;
  };
  end: {
    systemTime: string;
    displayTime: string;
  };
}

export interface AuthStatus {
  authenticated: boolean;
  message: string;
}
