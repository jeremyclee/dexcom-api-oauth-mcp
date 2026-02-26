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
   cd [path-to-your-project]/dexcom-api-oauth-mcp
   
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
   open [path-to-your-project]/dexcom-api-oauth-mcp/oauth-server/.env
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
   cd [path-to-your-project]/dexcom-api-oauth-mcp/oauth-server
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
           "[path-to-your-project]/dexcom-api-oauth-mcp/mcp-server/build/index.js"
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
  3. Restart the OAuth Server (Control+C to stop, then `npm run dev` to start).
  4. Authenticate again (Step 5).

## Use with ChatGPT

> [!NOTE]
> Connecting ChatGPT to custom MCP servers requires a **paid ChatGPT plan** (Plus, Pro, or Team) with the developer connector feature enabled.

ChatGPT cannot connect to a locally running MCP server directly — it needs a **public URL**. [ngrok](https://ngrok.com) creates a secure tunnel from a public URL to your local machine.

### Step A: Install ngrok

1. Go to [ngrok.com](https://ngrok.com) and create a free account.
2. Install ngrok via npm (or use `npx ngrok`):
   ```bash
   npm install -g ngrok
   ```
3. Authenticate ngrok with your account token (shown in the ngrok dashboard):
   ```bash
   ngrok config add-authtoken YOUR_NGROK_TOKEN
   ```

### Step B: Start the Servers

1. Make sure the **OAuth Server** is running **and you have authenticated with Dexcom** (Steps 4 and 5 above). The server must be running and your Dexcom session active before continuing.
2. In a new Terminal, start the MCP server in **HTTP mode**:
   ```bash
   cd [path-to-your-project]/dexcom-api-oauth-mcp/mcp-server
   npm run dev:http
   ```
   You should see: `🚀 Dexcom MCP HTTP Server running on port 3002`

### Step C: Expose with ngrok

1. In another new Terminal window, run:
   ```bash
   ngrok http 3002
   ```
2. ngrok will display a public URL like:
   ```
   Forwarding  https://abc123.ngrok-free.app -> http://localhost:3002
   ```
3. Copy the `https://...ngrok-free.app` URL — you'll need it in the next step.

### Step D: Connect to ChatGPT

1. In ChatGPT, go to **Settings → Apps → Create App**.
2. Under the MCP server configuration, enter:
   - **URL**: `https://abc123.ngrok-free.app/mcp` (your ngrok URL + `/mcp`)
   - **Authentication**: `No Auth`
3. ChatGPT will connect and discover the available Dexcom tools.
4. Ask ChatGPT: *"What is my current glucose level?"*

> [!NOTE]
> The ngrok URL changes every time you restart ngrok (on the free plan). You'll need to update the ChatGPT connector URL each session. A paid ngrok plan gives you a stable custom domain.
