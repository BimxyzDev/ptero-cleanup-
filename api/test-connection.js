const PteroClient = require('../lib/ptero-client');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    if (!body.panelUrl || !body.apiKey) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'panelUrl and apiKey are required'
      });
    }
    
    const client = new PteroClient(body.panelUrl, body.apiKey);
    const result = await client.testConnection();
    
    res.status(200).json({
      success: true,
      message: 'Connection successful',
      panel: body.panelUrl,
      permissions: result.permissions || 'Connected'
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Connection failed',
      message: error.message
    });
  }
};
