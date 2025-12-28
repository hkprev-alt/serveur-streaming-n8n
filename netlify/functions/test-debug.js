// netlify/functions/test-debug.js
exports.handler = async (event) => {
  console.log('API Key:', process.env.ASSEMBLYAI_API_KEY ? 'PRÉSENTE' : 'ABSENTE');
  console.log('API Key value:', process.env.ASSEMBLYAI_API_KEY ? '***' + process.env.ASSEMBLYAI_API_KEY.slice(-4) : 'none');
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      api_key_present: !!process.env.ASSEMBLYAI_API_KEY,
      api_key_length: process.env.ASSEMBLYAI_API_KEY ? process.env.ASSEMBLYAI_API_KEY.length : 0,
      all_env_keys: Object.keys(process.env).filter(k => k.includes('ASSEMBLY'))
    })
  };
};