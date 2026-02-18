import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Dexcom API
  dexcom: {
    clientId: process.env.DEXCOM_CLIENT_ID || '',
    clientSecret: process.env.DEXCOM_CLIENT_SECRET || '',
    redirectUri: process.env.DEXCOM_REDIRECT_URI || 'http://localhost:3001/auth/callback',
    baseUrl: process.env.DEXCOM_API_BASE_URL || (() => {
      switch (process.env.DEXCOM_ENV) {
        case 'production': return 'https://api.dexcom.com';
        case 'production_eu': return 'https://api.dexcom.eu';
        case 'production_jp': return 'https://api.dexcom.jp';
        default: return 'https://sandbox-api.dexcom.com';
      }
    })(),
    env: process.env.DEXCOM_ENV || 'sandbox',
    authUrl: '',
    tokenUrl: '',
    scopes: ['offline_access'], // offline_access allows refresh tokens
  },

  // Security
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '',
  tokenStoragePath: './tokens.enc',

  // Testing
  mockMode: process.env.MOCK_MODE === 'true',
};

// Construct full URLs
config.dexcom.authUrl = `${config.dexcom.baseUrl}/v2/oauth2/login`;
config.dexcom.tokenUrl = `${config.dexcom.baseUrl}/v2/oauth2/token`;

// Validation
if (!config.dexcom.clientId || !config.dexcom.clientSecret) {
  console.warn('⚠️  Warning: DEXCOM_CLIENT_ID and DEXCOM_CLIENT_SECRET not set in .env');
}

if (!config.tokenEncryptionKey || config.tokenEncryptionKey === 'change_this_to_a_random_32_char_key') {
  console.warn('⚠️  Warning: TOKEN_ENCRYPTION_KEY not set or using default value');
}
