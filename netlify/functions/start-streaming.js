// Fonction pour démarrer le streaming
const https = require('https');

exports.handler = async (event, context) => {
  // Configuration CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json'
  };

  // Gérer la requête OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Récupérer les données
    let data;
    try {
      data = JSON.parse(event.body || '{}');
    } catch {
      data = {};
    }

    const { call_id, caller_id, test } = data;

    // Validation
    if (!call_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'call_id est requis',
          example: { call_id: 'test_123', caller_id: '+33123456789' }
        })
      };
    }

    console.log(`🔔 Démarrage session pour: ${call_id}`);

    // En mode test, on simule juste
    if (test) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Mode test activé - Pas de connexion réelle à AssemblyAI',
          session_id: call_id,
          test_mode: true,
          assemblyai_token: 'TOKEN_TEST_' + Date.now(),
          ws_url: 'wss://api.assemblyai.com/v2/realtime/ws?token=TEST_TOKEN',
          expires_in: 3600,
          instructions: {
            pour_vicidial: 'Connecter directement au WebSocket AssemblyAI',
            audio_format: 'pcm_s16le',
            sample_rate: 16000,
            channels: 1,
            url_retour: 'https://n8n.insight360.click/webhook/transcription'
          }
        })
      };
    }

    // Mode production - Obtenir un vrai token AssemblyAI
    const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

    if (!ASSEMBLYAI_API_KEY) {
      throw new Error('Clé API AssemblyAI non configurée dans Netlify');
    }

    // Fonction pour faire une requête HTTPS (remplace fetch)
    const makeRequest = (options, postData) => {
      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              resolve({
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
                json: () => Promise.resolve(JSON.parse(data))
              });
            } catch (error) {
              reject(error);
            }
          });
        });
        
        req.on('error', reject);
        
        if (postData) {
          req.write(postData);
        }
        
        req.end();
      });
    };

    // Obtenir un token temporaire avec https au lieu de fetch
    const tokenResponse = await makeRequest(
      {
        hostname: 'api.assemblyai.com',
        port: 443,
        path: '/v2/realtime/token',
        method: 'POST',
        headers: {
          'Authorization': ASSEMBLYAI_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      },
      JSON.stringify({ expires_in: 3600 })
    );

    if (!tokenResponse.ok) {
      throw new Error(`Erreur AssemblyAI: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.token) {
      throw new Error('Token AssemblyAI non reçu');
    }

    // Réponse finale
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        session_id: call_id,
        caller_id: caller_id,
        assemblyai_token: tokenData.token,
        ws_url: `wss://api.assemblyai.com/v2/realtime/ws?token=${tokenData.token}`,
        expires_in: 3600,
        timestamp: new Date().toISOString(),
        server: 'Netlify Functions',
        instructions: {
          etape_1: 'Vicidial doit ouvrir une connexion WebSocket vers ws_url',
          etape_2: 'Streamer l\'audio en PCM 16kHz mono',
          etape_3: 'AssemblyAI renverra les transcriptions en temps réel',
          etape_4: 'Envoyer les transcriptions à votre webhook n8n'
        },
        webhook_example: {
          url: process.env.N8N_WEBHOOK_URL || 'VOTRE_WEBHOOK_N8N',
          method: 'POST',
          body: {
            call_id: call_id,
            transcription: 'TEXTE_TRANSCRIT',
            confidence: 0.95,
            timestamp: new Date().toISOString()
          }
        }
      })
    };

  } catch (error) {
    console.error('❌ Erreur dans start-streaming:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        help: 'Configurez ASSEMBLYAI_API_KEY dans les variables d\'environnement Netlify'
      })
    };
  }
};