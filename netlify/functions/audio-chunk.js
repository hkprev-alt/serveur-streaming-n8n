// Fonction pour recevoir l'audio
exports.handler = async (event) => {
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
    
    console.log('📦 Audio chunk reçu:', {
      call_id: data.call_id,
      chunk_size: data.audio_base64 ? data.audio_base64.length : 0,
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received: true,
        message: 'Audio chunk reçu avec succès',
        recommendation: 'Pour du temps réel, connectez Vicidial directement au WebSocket AssemblyAI',
        call_id: data.call_id,
        timestamp: new Date().toISOString(),
        next_step: 'Utilisez le token du endpoint /start-streaming pour WebSocket direct'
      })
    };
    
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Données invalides' })
    };
  }
};