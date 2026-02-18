#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { RESOURCES, handleResourceRead } from './resources.js';
import { TOOLS, handleToolCall } from './tools.js';
import { oauthClient } from './oauth-client.js';

// Create MCP server instance
const server = new Server(
  {
    name: 'dexcom-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

/**
 * Handler for listing available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: RESOURCES,
  };
});

/**
 * Handler for reading a resource
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  try {
    const contents = await handleResourceRead(uri);
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: contents,
        },
      ],
    };
  } catch (error: any) {
    throw new Error(`Failed to read resource ${uri}: ${error.message}`);
  }
});

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

/**
 * Handler for calling a tool
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    return await handleToolCall(name, args || {});
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  // Check if OAuth server is reachable
  try {
    const status = await oauthClient.checkAuthStatus();
    if (!status.authenticated) {
      console.error('⚠️  Warning: Not authenticated with Dexcom');
      console.error('   Please visit http://localhost:3001/auth/login to authenticate');
    } else {
      console.error('✅ Connected to OAuth server and authenticated');
    }
  } catch (error) {
    console.error('❌ Warning: Could not connect to OAuth server at http://localhost:3001');
    console.error('   Make sure the OAuth server is running');
  }

  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect server to transport
  await server.connect(transport);
  
  console.error('🚀 Dexcom MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
