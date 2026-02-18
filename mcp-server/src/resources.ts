import { oauthClient } from './oauth-client.js';
import { formatDateForDexcom } from './utils.js';

/**
 * MCP Resources for Dexcom data
 * Resources represent streams of data that can be monitored
 */

export const RESOURCES = [
  {
    uri: 'dexcom://glucose/current',
    name: 'Current Glucose Level',
    description: 'Real-time glucose reading from Dexcom CGM',
    mimeType: 'application/json',
  },
  {
    uri: 'dexcom://glucose/today',
    name: "Today's Glucose Readings",
    description: 'All glucose readings from today',
    mimeType: 'application/json',
  },
];

/**
 * Handle resource read requests
 */
export async function handleResourceRead(uri: string): Promise<string> {
  try {
    if (uri === 'dexcom://glucose/current') {
      const reading = await oauthClient.getCurrentGlucose();
      return JSON.stringify(reading, null, 2);
    }

    if (uri === 'dexcom://glucose/today') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      

      const data = await oauthClient.getGlucoseRange(
        formatDateForDexcom(startOfDay),
        formatDateForDexcom(now)
      );
      
      return JSON.stringify(data, null, 2);
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  } catch (error: any) {
    throw new Error(`Failed to read resource: ${error.message}`);
  }
}
