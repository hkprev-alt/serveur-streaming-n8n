// netlify/functions/start-streaming.js - VERSION SIMPLIFIÉE
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { call_id, test } = data;

    if (!call_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'call_id requis' })
      };
    }

    // Mode test - toujours fonctionnel
    if (test || !process.env.ASSEMBLYAI_API_KEY) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          session_id: call_id,
          test_mode: true,
          assemblyai_token: 'TOKEN_TEST_' + Date.now(),
          ws_url: 'wss://api.assemblyai.com/v2/realtime/ws?token=TEST_TOKEN',
          expires_in: 3600,
          message: process.env.ASSEMBLYAI_API_KEY ? 'Mode test' : 'Clé API manquante - Mode test forcé'
        })
      };
    }

    // Mode production - SIMPLIFIÉ
    const https = require('https');
    
    const tokenData = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.assemblyai.com',
        port: 443,
        path: '/v2/realtime/token',
        method: 'POST',
        headers: {
          'Authorization': process.env.ASSEMBLYAI_API_KEY,
          'Content-Type': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.write(JSON.stringify({ expires_in: 3600 }));
      req.end();
    });

    if (!tokenData.token) {
      throw new Error('Pas de token reçu');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        session_id: call_id,
        assemblyai_token: tokenData.token,
        ws_url: `wss://api.assemblyai.com/v2/realtime/ws?token=${tokenData.token}`,
        expires_in: 3600,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Erreur:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        fallback: 'use_test_mode'
      })
    };
  }
};