const axios = require('axios');
const { OAuthToken } = require('../models/OAuthToken');
require('dotenv').config();

// OAuth2 configuration
const OAUTH_CONFIG = {
  clientId: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  tenantId: process.env.MICROSOFT_TENANT_ID,
  emailUser: process.env.MICROSOFT_SENDER_EMAIL,
  tokenEndpoint: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
  scope: 'https://outlook.office.com/SMTP.Send offline_access',
};

const getInitialTokens = async (authorizationCode, redirectUri) => {
  try {
    const response = await axios.post(
      OAUTH_CONFIG.tokenEndpoint,
      new URLSearchParams({
        client_id: OAUTH_CONFIG.clientId,
        client_secret: OAUTH_CONFIG.clientSecret,
        code: authorizationCode,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: OAUTH_CONFIG.scope,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    // Save tokens to database
    await saveTokensToDatabase(access_token, refresh_token, expires_in);

    return { accessToken: access_token, refreshToken: refresh_token };
  } catch (error) {
    console.error('Error getting initial tokens:', error.response?.data || error.message);
    throw new Error('Failed to get OAuth2 tokens');
  }
};

const saveTokensToDatabase = async (accessToken, refreshToken, expiresIn) => {
  try {
    // Calculate expiration date
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    // Find existing token or create new one
    const existingToken = await OAuthToken.findOne();
    
    if (existingToken) {
      existingToken.accessToken = accessToken;
      existingToken.refreshToken = refreshToken;
      existingToken.expiresAt = expiresAt;
      await existingToken.save();
    } else {
      await OAuthToken.create({
        accessToken,
        refreshToken,
        expiresAt
      });
    }
  } catch (error) {
    console.error('Error saving OAuth2 tokens to database:', error.message);
    throw error;
  }
};

const refreshAccessToken = async () => {
  try {
    const tokenData = await OAuthToken.findOne();
    
    if (!tokenData || !tokenData.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(
      OAUTH_CONFIG.tokenEndpoint,
      new URLSearchParams({
        client_id: OAUTH_CONFIG.clientId,
        client_secret: OAUTH_CONFIG.clientSecret,
        refresh_token: tokenData.refreshToken,
        grant_type: 'refresh_token',
        scope: OAUTH_CONFIG.scope,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    
    await saveTokensToDatabase(
      access_token, 
      refresh_token || tokenData.refreshToken,
      expires_in
    );

    return { 
      accessToken: access_token,
      refreshToken: refresh_token || tokenData.refreshToken
    };
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    throw new Error('Failed to refresh OAuth2 token');
  }
};

const getValidAccessToken = async () => {
  try {
    // Get token from database
    const tokenData = await OAuthToken.findOne();
    
    if (!tokenData) {
      throw new Error('OAuth not initialized');
    }
    console.log(tokenData);
    // If token is valid and not expired (with 5 min buffer), return it
    if (tokenData.accessToken && tokenData.expiresAt && new Date(tokenData.expiresAt) > new Date(Date.now() + 300000)) {
      console.log('Token is valid and not expired');
      return tokenData.accessToken; 
    }
    console.log('Token is not valid or expired, refreshing...');
    const { accessToken } = await refreshAccessToken();
    return accessToken;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    throw error;
  }
};

const initializeOAuth = async (authorizationCode, redirectUri) => {
  await getInitialTokens(authorizationCode, redirectUri);
};

const isOAuthInitialized = async () => {
  try {
    const tokenData = await OAuthToken.findOne();
    return !!tokenData && !!tokenData.refreshToken;
  } catch (error) {
    console.error('Error checking OAuth initialization:', error);
    return false;
  }
};

const getOAuthConfig = () => {
  return { ...OAUTH_CONFIG };
};

const setupOAuthRoutes = (app) => {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
  const scope = 'https://outlook.office.com/SMTP.Send offline_access';

  // Generate the authorization URL
  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
    `client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent(scope)}`;

  app.get('/auth/setup-oauth', async (req, res) => {
    if (await isOAuthInitialized()) {
      return res.send(`
        <h1>OAuth2 Already Set Up</h1>
        <p>OAuth2 is already initialized with valid tokens.</p>
        <p>If you're experiencing issues with email sending, you can <a href="/auth/setup-oauth?force=true">force a new setup</a>.</p>
      `);
    }

    res.send(`
      <h1>OAuth2 Setup Started</h1>
      <p>Please click the link below to authorize the application:</p>
      <p><a href="${authUrl}" target="_blank" style="font-size: 1.2em; font-weight: bold;">Authorize Application</a></p>
      <p>After authorization, you will be redirected back to this application.</p>
      <p>Note: This will open in a new browser tab.</p>
    `);
  });

  app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code not received');
    }
    
    try {
      // Initialize OAuth2 with the received authorization code
      await initializeOAuth(code, redirectUri);
      
      res.send(`
        <h1>OAuth2 Setup Complete!</h1>
        <p>The access and refresh tokens have been obtained and stored.</p>
        <p>You can now close this window and use the email functionality.</p>
      `);
    } catch (error) {
      console.error('Error during OAuth2 setup:', error);
      res.status(500).send(`
        <h1>OAuth2 Setup Failed</h1>
        <p>Error: ${error.message}</p>
        <p>Please check the server logs for more details.</p>
      `);
    }
  });
};

module.exports = {
  setupOAuthRoutes,
  getValidAccessToken,
  initializeOAuth,
  isOAuthInitialized,
  getOAuthConfig
}; 