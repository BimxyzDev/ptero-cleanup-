const PteroClient = require('../lib/ptero-client');
const { validateInput } = require('../utils/validation');
const { rateLimit } = require('../lib/rate-limit');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    // Parse request body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const { 
      panelUrl, 
      apiKey, 
      actions = ['deleteOfflineServers'],
      dryRun = false,
      options = {} 
    } = body;

    // Apply rate limiting
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const rateLimitCheck = await rateLimit(ip);
    
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again after ${rateLimitCheck.resetIn} seconds.`,
        resetIn: rateLimitCheck.resetIn
      });
    }

    // Initialize Ptero client with user's credentials
    const client = new PteroClient(panelUrl, apiKey);
    
    // Test connection first
    try {
      await client.testConnection();
    } catch (error) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid panel URL or API key',
        details: error.message
      });
    }

    const report = {
      timestamp: new Date().toISOString(),
      dryRun: dryRun,
      actions: actions,
      summary: {
        servers: { total: 0, processed: 0, deleted: 0 },
        users: { total: 0, processed: 0, deleted: 0 }
      },
      details: {
        servers: [],
        users: []
      },
      errors: []
    };

    // Process requested actions
    for (const action of actions) {
      switch (action) {
        case 'deleteOfflineServers':
          await processOfflineServers(client, report, dryRun);
          break;
          
        case 'deleteAllServers':
          await processAllServers(client, report, dryRun);
          break;
          
        case 'deleteEmptyUsers':
          await processEmptyUsers(client, report, dryRun);
          break;
          
        case 'deleteInactiveUsers':
          await processInactiveUsers(client, report, dryRun, options.inactiveDays || 30);
          break;
      }
    }

    res.status(200).json({
      success: true,
      message: `Cleanup completed${dryRun ? ' (DRY RUN)' : ''}`,
      report: report,
      rateLimit: {
        remaining: rateLimitCheck.remaining,
        resetIn: rateLimitCheck.resetIn
      }
    });

  } catch (error) {
    console.error('Error in cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

async function processOfflineServers(client, report, dryRun) {
  try {
    const servers = await client.getAllServers();
    report.summary.servers.total = servers.length;
    
    for (const server of servers) {
      if (client.isServerOffline(server)) {
        report.summary.servers.processed++;
        
        const serverInfo = {
          id: server.attributes.id,
          name: server.attributes.name,
          status: server.attributes.status,
          suspended: server.attributes.suspended,
          action: 'delete'
        };
        
        if (!dryRun) {
          const result = await client.deleteServer(server.attributes.id);
          serverInfo.success = result.success;
          if (result.success) report.summary.servers.deleted++;
        } else {
          serverInfo.dryRun = true;
        }
        
        report.details.servers.push(serverInfo);
      }
    }
  } catch (error) {
    report.errors.push({
      action: 'deleteOfflineServers',
      error: error.message
    });
  }
}

async function processAllServers(client, report, dryRun) {
  try {
    const servers = await client.getAllServers();
    report.summary.servers.total = servers.length;
    
    for (const server of servers) {
      report.summary.servers.processed++;
      
      const serverInfo = {
        id: server.attributes.id,
        name: server.attributes.name,
        status: server.attributes.status,
        action: 'delete'
      };
      
      if (!dryRun) {
        const result = await client.deleteServer(server.attributes.id);
        serverInfo.success = result.success;
        if (result.success) report.summary.servers.deleted++;
      } else {
        serverInfo.dryRun = true;
      }
      
      report.details.servers.push(serverInfo);
    }
  } catch (error) {
    report.errors.push({
      action: 'deleteAllServers',
      error: error.message
    });
  }
}

async function processEmptyUsers(client, report, dryRun) {
  try {
    const users = await client.getAllUsers();
    report.summary.users.total = users.length;
    
    for (const user of users) {
      // Skip root admins
      if (user.attributes.root_admin) continue;
      
      const userServers = await client.getUserServers(user.attributes.id);
      
      if (userServers.length === 0) {
        report.summary.users.processed++;
        
        const userInfo = {
          id: user.attributes.id,
          email: user.attributes.email,
          username: user.attributes.username,
          serverCount: userServers.length,
          action: 'delete'
        };
        
        if (!dryRun) {
          const result = await client.deleteUser(user.attributes.id);
          userInfo.success = result.success;
          if (result.success) report.summary.users.deleted++;
        } else {
          userInfo.dryRun = true;
        }
        
        report.details.users.push(userInfo);
      }
    }
  } catch (error) {
    report.errors.push({
      action: 'deleteEmptyUsers',
      error: error.message
    });
  }
}

async function processInactiveUsers(client, report, dryRun, inactiveDays) {
  // Implementasi untuk delete user yang inactive
  // Bisa ditambahkan berdasarkan last login
  }
