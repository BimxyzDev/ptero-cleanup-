const axios = require('axios');

class PteroClient {
  constructor(panelUrl, apiKey) {
    this.panelUrl = panelUrl.endsWith('/') ? panelUrl.slice(0, -1) : panelUrl;
    this.apiKey = apiKey;
    
    this.client = axios.create({
      baseURL: this.panelUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'PteroCleanup-Public-API/1.0'
      },
      timeout: 30000,
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      }
    });
  }

  async testConnection() {
    try {
      const response = await this.client.get('/api/application/users?per_page=1');
      if (response.status === 200) {
        return { success: true, panel: this.panelUrl };
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to connect to panel: ${error.message}`);
    }
  }

  async getAllServers() {
    const servers = [];
    let page = 1;
    const perPage = 50;

    try {
      while (true) {
        const response = await this.client.get(
          `/api/application/servers?page=${page}&per_page=${perPage}`
        );
        
        if (response.status !== 200) {
          throw new Error(`Failed to fetch servers: ${response.status}`);
        }
        
        const data = response.data;
        servers.push(...(data.data || []));
        
        if (!data.meta || !data.meta.pagination || 
            data.meta.pagination.current_page >= data.meta.pagination.total_pages) {
          break;
        }
        
        page++;
      }
      
      return servers;
    } catch (error) {
      console.error('Error fetching servers:', error.message);
      throw error;
    }
  }

  async deleteServer(serverId) {
    try {
      const response = await this.client.delete(`/api/application/servers/${serverId}`);
      
      if (response.status === 204) {
        return { success: true, serverId };
      } else {
        return { 
          success: false, 
          serverId, 
          error: `API returned status ${response.status}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        serverId, 
        error: error.message 
      };
    }
  }

  async getAllUsers() {
    const users = [];
    let page = 1;
    const perPage = 50;

    try {
      while (true) {
        const response = await this.client.get(
          `/api/application/users?page=${page}&per_page=${perPage}`
        );
        
        if (response.status !== 200) {
          throw new Error(`Failed to fetch users: ${response.status}`);
        }
        
        const data = response.data;
        users.push(...(data.data || []));
        
        if (!data.meta || !data.meta.pagination || 
            data.meta.pagination.current_page >= data.meta.pagination.total_pages) {
          break;
        }
        
        page++;
      }
      
      return users;
    } catch (error) {
      console.error('Error fetching users:', error.message);
      throw error;
    }
  }

  async getUserServers(userId) {
    try {
      const response = await this.client.get(`/api/application/users/${userId}/servers`);
      
      if (response.status === 200) {
        return response.data.data || [];
      } else {
        return [];
      }
    } catch (error) {
      console.error(`Error fetching servers for user ${userId}:`, error.message);
      return [];
    }
  }

  async deleteUser(userId) {
    try {
      const response = await this.client.delete(`/api/application/users/${userId}`);
      
      if (response.status === 204) {
        return { success: true, userId };
      } else {
        return { 
          success: false, 
          userId, 
          error: `API returned status ${response.status}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        userId, 
        error: error.message 
      };
    }
  }

  isServerOffline(server) {
    const attrs = server.attributes;
    // Check berbagai kondisi offline
    if (attrs.suspended) return true;
    if (attrs.status === 'installing' || attrs.status === 'install_failed') return true;
    if (attrs.status && attrs.status !== 'running') return true;
    
    // Tambahan: cek last activity jika ada
    if (attrs.last_activity && Date.now() - new Date(attrs.last_activity).getTime() > 24 * 60 * 60 * 1000) {
      return true; // Offline lebih dari 24 jam
    }
    
    return false;
  }
}

module.exports = PteroClient;
