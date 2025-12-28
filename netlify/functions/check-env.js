// netlify/functions/check-env.js
exports.handler = async () => {
  console.log('=== CHECK ENV VARIABLES ===');
  console.log('ALL ENV KEYS:', Object.keys(process.env));
  
  const assemblyKeys = Object.keys(process.env).filter(k => 
    k.includes('ASSEMBLY') || k.includes('API')
  );
  
  console.log('Assembly related keys:', assemblyKeys);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      assemblyai_api_key_exists: !!process.env.ASSEMBLYAI_API_KEY,
      assemblyai_api_key_length: process.env.ASSEMBLYAI_API_KEY ? process.env.ASSEMBLYAI_API_KEY.length : 0,
      assemblyai_api_key_preview: process.env.ASSEMBLYAI_API_KEY ? 
        process.env.ASSEMBLYAI_API_KEY.substring(0, 10) + '...' : 'none',
      all_assembly_keys: assemblyKeys.map(k => ({
        key: k, 
        length: process.env[k] ? process.env[k].length : 0,
        preview: process.env[k] ? process.env[k].substring(0, 5) + '...' : 'none'
      }))
    }, null, 2)
  };
};