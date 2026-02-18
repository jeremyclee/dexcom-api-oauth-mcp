import { oauthClient } from './oauth-client.js';

/**
 * MCP Tools for Dexcom data operations
 * Tools are functions that can be called by Claude
 */

export const TOOLS = [
  {
    name: 'get_current_glucose',
    description: 'Get the most recent glucose reading from Dexcom CGM',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_glucose_range',
    description: 'Get glucose readings within a specific date/time range',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO 8601 format (e.g., 2024-01-01T00:00:00Z)',
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO 8601 format (e.g., 2024-01-02T00:00:00Z)',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_glucose_statistics',
    description: 'Get statistical analysis of glucose data over a period (average, min, max, time in range)',
    inputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to analyze (1-90)',
          minimum: 1,
          maximum: 90,
        },
      },
      required: ['days'],
    },
  },
  {
    name: 'get_devices',
    description: 'Get information about the user\'s Dexcom devices',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

/**
 * Handle tool execution
 */
export async function handleToolCall(name: string, args: any): Promise<any> {
  try {
    switch (name) {
      case 'get_current_glucose': {
        const reading = await oauthClient.getCurrentGlucose();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(reading, null, 2),
            },
          ],
        };
      }

      case 'get_glucose_range': {
        const { startDate, endDate } = args;
        const data = await oauthClient.getGlucoseRange(startDate, endDate);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'get_glucose_statistics': {
        const { days } = args;
        const stats = await oauthClient.getStatistics(days);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      case 'get_devices': {
        const devices = await oauthClient.getDevices();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(devices, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    // Return error as tool response
    const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
    const errorDetails = error.response?.data?.message || '';
    
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}${errorDetails ? '\n' + errorDetails : ''}`,
        },
      ],
      isError: true,
    };
  }
}
