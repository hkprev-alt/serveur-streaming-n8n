// Netlify Function: start-streaming
// Version avec Deepgram - Clé API intégrée

exports.handler = async function(event, context) {
  console.log("=== START-STREAMING DEEPGRAM ===");
  
  // 1. Autoriser CORS pour toutes les requêtes
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  // 2. Gérer les pré-requêtes OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: headers,
      body: ''
    };
  }

  // 3. TA CLÉ API DEEPGRAM (à sécuriser en env var plus tard)
  const DEEPGRAM_API_KEY = "80895cf5cf9bc171f2698f5b605d4bc8ad9f62d0";
  
  // 4. Parser les données de l'appel
  let data = {};
  try {
    if (event.body) {
      data = JSON.parse(event.body);
    }
  } catch (e) {
    // Ignorer les erreurs de parsing
  }

  const { 
    call_id = `call_${Date.now()}`,
    caller_id = "unknown",
    channel = "unknown",
    uniqueid = call_id
  } = data;

  console.log(`Processing call: ${call_id} from ${caller_id}`);

  // 5. Construire l'URL WebSocket Deepgram avec paramètres optimisés
  const deepgramParams = new URLSearchParams({
    encoding: 'linear16',
    sample_rate: '16000',
    channels: '1',
    model: 'nova-2', // Modèle le plus performant
    smart_format: 'true',
    interim_results: 'true', // Résultats intermédiaires
    punctuate: 'true',
    utterances: 'true',
    endpointing: '200', // Détection de fin de phrase
    vad_events: 'true' // Détection d'activité vocale
  });

  const ws_url = `wss://api.deepgram.com/v1/listen?${deepgramParams.toString()}`;

  // 6. Préparer la réponse
  const response = {
    success: true,
    call_id: call_id,
    session_id: `sess_${Date.now()}_${call_id.substring(0, 8)}`,
    ws_url: ws_url,
    token: DEEPGRAM_API_KEY, // Pour référence
    provider: "deepgram",
    expires_in: 3600,
    audio_config: {
      format: "pcm_s16le",
      sample_rate: 16000,
      channels: 1,
      bitrate: 256000
    },
    deepgram_config: {
      model: "nova-2",
      language: "fr",
      smart_format: true,
      interim_results: true,
      punctuate: true
    },
    timestamp: new Date().toISOString(),
    server: "Netlify Deepgram Streamer",
    instructions: {
      connect_websocket: "Connect to ws_url with Authorization header",
      audio_format: "Stream PCM 16kHz mono",
      headers: {
        "Authorization": `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/pcm"
      }
    }
  };

  console.log("✅ Generated WebSocket URL for Deepgram");

  // 7. Retourner la réponse
  return {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify(response)
  };
};

// Export supplémentaire pour compatibilité
exports.startStreamingHandler = exports.handler;
