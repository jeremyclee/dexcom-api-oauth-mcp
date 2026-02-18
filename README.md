# Dexcom MCP Server - Beginner's Guide

This guide will help you set up the Dexcom MCP server to work with Claude Desktop, even if you've never used developer tools before.

## Prerequisites

Before we start, you need to install **Node.js**:
1. Go to [nodejs.org](https://nodejs.org/).
2. Download and install the **LTS version** (Recommended for Most Users).
3. Follow the installation prompts accepting the defaults.

## Step 1: Get Your Dexcom Credentials

You need a developer account to access your own Dexcom data.

> [!NOTE]
> **Outside the US?** The self-service developer portal below only works for US-based accounts. If you're in another country, you'll need to contact [Dexcom Developer Support](https://developer.dexcom.com/support) directly — they will manually issue your **Client ID** and **Client Secret** credentials. Once you have them, skip to Step 2.

1. Go to the [Dexcom Developer Portal](https://developer.dexcom.com) and create an account.
2. Create a new "App":
   - **App Name**: `My Clarity MCP Server` (or anything you like)
   - **Redirect URI**: `http://localhost:3001/auth/callback` (This MUST be exact)
3. Once created, save these two values:
   - **Client ID**
   - **Client Secret**

## Step 2: Setup the Project

1. Open the **Terminal** app on your Mac (Command+Space, type "Terminal").
2. Copy and paste these commands one by one (press Enter after each):

   ```bash
   # Navigate to your project folder
   cd [path-to-your-project]/dexcom-mcp
   
   # Install dependencies for the OAuth Server
   cd oauth-server
   npm install
   
   # Setup your configuration file
   cp .env.example .env
   
   # Install dependencies for the MCP Server
   cd ../mcp-server
   npm install
   
   # Build the MCP Server
   npm run build
   ```

## Step 3: Configure Your Credentials

1. Open the configuration file you just created:
   ```bash
   open [path-to-your-project]/dexcom-mcp/oauth-server/.env
   ```
2. It will open in TextEdit. Look for these lines:
   ```
   DEXCOM_CLIENT_ID=your_client_id_here
   DEXCOM_CLIENT_SECRET=your_client_secret_here
   ```
3. Replace `your_client_id_here` and `your_client_secret_here` with the values you got from Step 1.
4. Save the file (Command+S) and close TextEdit.

## Step 4: Start the OAuth Server

This server handles the secure login with Dexcom. It needs to be running for the tools to work.

1. In your Terminal, run:
   ```bash
   cd [path-to-your-project]/dexcom-mcp/oauth-server
   npm run dev
   ```
2. You should see a message saying `🚀 Dexcom OAuth Server` is running.
3. **Keep this Terminal window open!** If you close it, the server stops.

## Step 5: Authenticate

1. Open your web browser and go to: [http://localhost:3001/auth/login](http://localhost:3001/auth/login)
2. You will be redirected to Dexcom. Log in with your **Dexcom Username and Password**.
3. Authorize the app.
4. You should see a "Authentication Successful" message.

## Step 6: Connect to Claude Desktop

1. Open a **new** Terminal window (Command+N).
2. Run this command to open your Claude configuration:
   ```bash
   open -a TextEdit "~/Library/Application Support/Claude/claude_desktop_config.json"
   ```
   *Note: If the file doesn't exist, you may need to create it manually.*
3. Add the following to the file. If there are already other servers, add this to the `mcpServers` list:

   ```json
   {
     "mcpServers": {
       "dexcom": {
         "command": "node",
         "args": [
           "[path-to-your-project]/dexcom-mcp/mcp-server/build/index.js"
         ],
         "env": {
           "OAUTH_SERVER_URL": "http://localhost:3001"
         }
       }
     }
   }
   ```
4. Save and close the file.

## Step 7: Use it in Claude!

1. **Restart Claude Desktop**. (Quit it completely and open it again).
2. You should see a plug icon 🔌 indicating MCP tools are loaded.
3. Ask Claude:
   - "What is my current glucose?"
   - "Show me my glucose chart for today"
   - "What are my stats for the last 7 days?"

## Troubleshooting

- **"Not Authenticated":** Make sure the OAuth Server (Step 4) is still running in a Terminal window. Go to [http://localhost:3001/auth/login](http://localhost:3001/auth/login) again.
- **Tools not showing up:** Check the path in your `claude_desktop_config.json`. It must point exactly to the `index.js` file.
- **Real Data vs Sandbox:** By default, this uses Dexcom's **Sandbox** (fake data). To see your real data:

  1. Open the `.env` file again (Step 3).
  2. Change `DEXCOM_ENV` to your region:
     - **US:** `DEXCOM_ENV=production`
     - **Europe/Canada/International:** `DEXCOM_ENV=production_eu`
     - **Japan:** `DEXCOM_ENV=production_jp`
  3. This will automatically switch the API URL to the correct region.
  4. Restart the OAuth Server (Control+C to stop, then `npm run dev` to start).
  5. Authenticate again (Step 5).
