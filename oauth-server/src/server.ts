import express from 'express';
import cors from 'cors';
import { config } from './config';
import authRoutes from './routes/auth';
import dataRoutes from './routes/data';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/api', dataRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'dexcom-oauth-server' });
});

// Root endpoint with instructions
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Dexcom OAuth Server</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
          }
          h1 { color: #333; }
          .endpoint {
            background: #f5f5f5;
            padding: 10px 15px;
            margin: 10px 0;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
          }
          .btn {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
          }
          .btn:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <h1>🔐 Dexcom OAuth Server</h1>
        <p>Server is running and ready to authenticate with Dexcom API.</p>
        
        <h2>Available Endpoints:</h2>
        
        <h3>Authentication:</h3>
        <div class="endpoint">GET /auth/login - Start OAuth flow</div>
        <div class="endpoint">GET /auth/callback - OAuth callback</div>
        <div class="endpoint">GET /auth/status - Check auth status</div>
        <div class="endpoint">POST /auth/logout - Clear tokens</div>
        
        <h3>Data (requires authentication):</h3>
        <div class="endpoint">GET /api/glucose/current - Latest reading</div>
        <div class="endpoint">GET /api/glucose/range?startDate=X&endDate=Y - Historical data</div>
        <div class="endpoint">GET /api/statistics?days=N - Statistics</div>
        <div class="endpoint">GET /api/devices - User devices</div>
        <div class="endpoint">GET /api/data-range - Available data range</div>
        
        <a href="/auth/login" class="btn">🚀 Authenticate with Dexcom</a>
      </body>
    </html>
  `);
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(config.port, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Dexcom OAuth Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Server running at: http://localhost:${config.port}`);
  console.log(`🔐 OAuth login: ${config.dexcom.baseUrl}/v2/oauth2/login`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
  console.log(`🌍 Dexcom Env: ${config.dexcom.env} (${config.dexcom.baseUrl})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
