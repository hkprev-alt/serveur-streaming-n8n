# Remplace le fichier start-streaming.js
@'
// netlify/functions/start-streaming.js - VERSION FINALE OPÉRATIONNELLE
const https = require("https");

exports.handler = async (event) => {
  // Essaie les deux noms de variables
  const apiKey = 
    process.env.ASSEMBLYAI_API_KEY || 
    process.env.ASSEMBLY_API_KEY;
  
  console.log("=== DÉBUT start-streaming ===");
  console.log("API Key found?", !!apiKey);
  console.log("API Key length:", apiKey ? apiKey.length : 0);
  
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };
  
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  
  try {
    const data = JSON.parse(event.body || "{}");
    const { call_id } = data;
    
    if (!call_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "call_id requis" }) };
    }
    
    // MODE PRODUCTION si clé trouvée
    if (apiKey) {
      console.log("Tentative de connexion à AssemblyAI...");
      
      const tokenData = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: "api.assemblyai.com",
          port: 443,
          path: "/v2/realtime/token",
          method: "POST",
          headers: {
            "Authorization": apiKey.trim(),
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        }, (res) => {
          let responseData = "";
          
          res.on("data", (chunk) => {
            responseData += chunk;
          });
          
          res.on("end", () => {
            console.log("AssemblyAI status:", res.statusCode);
            
            if (res.statusCode >= 400) {
              reject(new Error(`AssemblyAI error ${res.statusCode}`));
              return;
            }
            
            try {
              const parsed = JSON.parse(responseData);
              resolve(parsed);
            } catch (e) {
              reject(new Error("Failed to parse AssemblyAI response"));
            }
          });
        });
        
        req.on("error", (err) => {
          console.error("Request error:", err);
          reject(err);
        });
        
        req.write(JSON.stringify({ expires_in: 3600 }));
        req.end();
      });
      
      if (tokenData && tokenData.token) {
        console.log("✅ Vrai token AssemblyAI obtenu !");
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
            message: "Token AssemblyAI généré avec succès"
          })
        };
      }
    }
    
    // FALLBACK: Mode test (si pas de clé ou erreur)
    console.log("Fallback en mode test");
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        session_id: call_id,
        test_mode: true,
        assemblyai_token: "TOKEN_TEST_" + Date.now(),
        ws_url: "wss://api.assemblyai.com/v2/realtime/ws?token=TEST_TOKEN",
        expires_in: 3600,
        message: apiKey ? "Erreur AssemblyAI - Mode test" : "Clé API non trouvée - Mode test"
      })
    };
    
  } catch (error) {
    console.error("Erreur générale:", error);
    
    const call_id = (JSON.parse(event.body || "{}")).call_id || "unknown";
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        session_id: call_id,
        test_mode: true,
        error: error.message,
        fallback: true
      })
    };
  }
};
'@ | Out-File -FilePath netlify/functions/start-streaming.js -Encoding UTF8 -Force