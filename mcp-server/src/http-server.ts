import express from 'express';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { RESOURCES, handleResourceRead } from './resources.js';
import { TOOLS, handleToolCall } from './tools.js';

const MCP_PORT = parseInt(process.env.MCP_PORT || '3002', 10);

/**
 * Create and configure the MCP Server instance (shared logic with stdio mode)
 */
function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'dexcom-api-oauth-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: RESOURCES,
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const contents = await handleResourceRead(uri);
    return {
      contents: [{ uri, mimeType: 'application/json', text: contents }],
    };
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return await handleToolCall(name, args || {});
  });

  return server;
}

/**
 * Start the MCP server in HTTP (Streamable HTTP) mode.
 * Each request gets its own stateless transport instance.
 */
export async function startHttpServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    // Validate Origin header to prevent DNS rebinding attacks (required by MCP spec)
    const origin = req.headers.origin;
    if (origin && origin !== `http://localhost:${MCP_PORT}`) {
      // Allow requests with no Origin (e.g. curl, server-to-server) and localhost
      // Block cross-origin browser requests from unexpected origins
      const allowedOrigins = [
        `http://localhost:${MCP_PORT}`,
        'https://chatgpt.com',
        'https://chat.openai.com',
      ];
      if (!allowedOrigins.includes(origin)) {
        res.status(403).json({ error: 'Forbidden: invalid origin' });
        return;
      }
    }

    // Stateless mode: create a fresh server + transport per request
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    const server = createMcpServer();

    transport.onclose = () => {
      server.close();
    };

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error: any) {
      console.error('❌ Error handling MCP request:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', transport: 'http' });
  });

  app.listen(MCP_PORT, () => {
    console.error(`🚀 Dexcom MCP HTTP Server running on port ${MCP_PORT}`);
    console.error(`   Endpoint: http://localhost:${MCP_PORT}/mcp`);
    console.error(`   Expose publicly with: ngrok http ${MCP_PORT}`);
  });
}
