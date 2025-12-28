// netlify/functions/start-streaming.js - VERSION FINALE CORRIGÉE
const https = require('https');

exports.handler = async (event, context) => {
  console.log('=== DÉBUT start-streaming ===');
  
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
    // Parse les données
    const data = JSON.parse(event.body || '{}');
    const { call_id, test } = data;
    
    console.log('Données:', { call_id, test, hasBody: !!event.body });

    // Validation
    if (!call_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'call_id requis' })
      };
    }

    // VÉRIFIE LA CLÉ API IMMÉDIATEMENT
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    console.log('API Key présente?', !!apiKey);
    console.log('API Key début:', apiKey ? apiKey.substring(0, 10) + '...' : 'none');
    
    // Mode test explicitement demandé
    if (test === true) {
      console.log('Mode test demandé explicitement');
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
          message: 'Mode test'
        })
      };
    }

    // Si pas de clé API → mode test automatique
    if (!apiKey) {
      console.log('API Key manquante → mode test');
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
          message: 'Clé API manquante'
        })
      };
    }

    // MODE PRODUCTION - Vraie connexion AssemblyAI
    console.log('Tentative de connexion à AssemblyAI...');
    
    const tokenData = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.assemblyai.com',
        port: 443,
        path: '/v2/realtime/token',
        method: 'POST',
        headers: {
          'Authorization': apiKey.trim(),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      console.log('Options API:', JSON.stringify(options, null, 2));

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          console.log('Status AssemblyAI:', res.statusCode);
          console.log('Réponse AssemblyAI:', responseData.substring(0, 200));
          
          if (res.statusCode >= 400) {
            reject(new Error(`AssemblyAI error ${res.statusCode}: ${responseData}`));
            return;
          }
          
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        });
      });

      req.on('error', (err) => {
        console.error('Request error:', err);
        reject(err);
      });

      req.write(JSON.stringify({ expires_in: 3600 }));
      req.end();
    });

    console.log('Token reçu?', !!tokenData.token);
    
    if (!tokenData.token) {
      throw new Error('No token received from AssemblyAI');
    }

    // SUCCÈS !
    console.log('=== SUCCÈS - Vrai token généré ===');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        session_id: call_id,
        test_mode: false, // IMPORTANT: false pour production
        assemblyai_token: tokenData.token,
        ws_url: `wss://api.assemblyai.com/v2/realtime/ws?token=${tokenData.token}`,
        expires_in: tokenData.expires_in || 3600,
        timestamp: new Date().toISOString(),
        message: 'Token AssemblyAI généré avec succès'
      })
    };

  } catch (error) {
    console.error('=== ERREUR CRITIQUE ===:', error.message);
    console.error('Stack:', error.stack);
    
    // Fallback gentil pour Vicidial
    const call_id = (JSON.parse(event.body || '{}')).call_id || 'unknown';
    
    return {
      statusCode: 200, // 200 pour ne pas casser Vicidial
      headers,
      body: JSON.stringify({
        success: true,
        session_id: call_id,
        test_mode: true,
        assemblyai_token: 'TOKEN_FALLBACK_' + Date.now(),
        ws_url: 'wss://api.assemblyai.com/v2/realtime/ws?token=TEST_FALLBACK',
        expires_in: 3600,
        message: 'Erreur AssemblyAI - Fallback test mode: ' + error.message
      })
    };
  }
};