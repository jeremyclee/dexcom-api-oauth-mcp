import { Router, Request, Response } from 'express';
import { oauthManager } from '../oauth';

const router = Router();

/**
 * GET /auth/login
 * Initiate OAuth flow - redirects user to Dexcom authorization page
 */
router.get('/login', (req: Request, res: Response) => {
  try {
    const { url, state } = oauthManager.getAuthorizationUrl();
    console.log('🔐 Initiating OAuth flow, redirecting to Dexcom...');
    res.redirect(url);
  } catch (error: any) {
    console.error('❌ Error initiating OAuth:', error.message);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

/**
 * GET /auth/callback
 * OAuth callback endpoint - exchanges code for tokens
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  // Check for OAuth errors
  if (error) {
    console.error('❌ OAuth error:', error);
    return res.status(400).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1>❌ Authentication Failed</h1>
          <p>Error: ${error}</p>
          <a href="/auth/login">Try Again</a>
        </body>
      </html>
    `);
  }

  // Validate required parameters
  if (!code || !state) {
    return res.status(400).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1>❌ Invalid Request</h1>
          <p>Missing authorization code or state parameter</p>
          <a href="/auth/login">Try Again</a>
        </body>
      </html>
    `);
  }

  // Validate state parameter (CSRF protection)
  if (!oauthManager.validateState(state as string)) {
    return res.status(400).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1>❌ Security Error</h1>
          <p>Invalid state parameter - possible CSRF attack</p>
          <a href="/auth/login">Try Again</a>
        </body>
      </html>
    `);
  }

  // Exchange code for tokens
  try {
    await oauthManager.exchangeCodeForToken(code as string);
    
    res.send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1>✅ Authentication Successful!</h1>
          <p>You can now close this window and use the MCP server.</p>
          <p style="margin-top: 30px; color: #666;">
            Your tokens have been securely saved.
          </p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('❌ Token exchange failed:', error.message);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1>❌ Token Exchange Failed</h1>
          <p>${error.message}</p>
          <a href="/auth/login">Try Again</a>
        </body>
      </html>
    `);
  }
});

/**
 * GET /auth/status
 * Check authentication status
 */
router.get('/status', (req: Request, res: Response) => {
  const isAuthenticated = oauthManager.isAuthenticated();
  res.json({
    authenticated: isAuthenticated,
    message: isAuthenticated
      ? 'User is authenticated'
      : 'User needs to authenticate - visit /auth/login',
  });
});

/**
 * POST /auth/logout
 * Clear stored tokens
 */
router.post('/logout', (req: Request, res: Response) => {
  try {
    oauthManager.logout();
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('❌ Error during logout:', error.message);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

export default router;
