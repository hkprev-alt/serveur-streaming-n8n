// Fonction pour lister les sessions
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'active',
      server: 'Netlify Audio Streamer',
      endpoints: {
        start_streaming: 'POST /.netlify/functions/start-streaming',
        audio_chunk: 'POST /.netlify/functions/audio-chunk',
        sessions: 'GET /.netlify/functions/sessions'
      },
      instructions: 'Ce serveur génère des tokens pour AssemblyAI Realtime',
      note: 'Les sessions ne sont pas stockées (serverless)',
      example_curl: `curl -X POST https://votre-site.netlify.app/.netlify/functions/start-streaming \\
  -H "Content-Type: application/json" \\
  -d '{"call_id": "test_123", "caller_id": "+33123456789"}'`
    })
  };
};