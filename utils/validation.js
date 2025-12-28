const validateInput = (input) => {
  const errors = [];
  
  if (!input) {
    errors.push('Request body is required');
    return { valid: false, errors };
  }
  
  // Check required fields
  if (!input.panelUrl) {
    errors.push('panelUrl is required');
  } else if (!isValidUrl(input.panelUrl)) {
    errors.push('panelUrl must be a valid URL');
  }
  
  if (!input.apiKey) {
    errors.push('apiKey is required');
  } else if (!isValidApiKey(input.apiKey)) {
    errors.push('apiKey must be a valid Pterodactyl API key');
  }
  
  // Validate actions
  if (input.actions) {
    if (!Array.isArray(input.actions)) {
      errors.push('actions must be an array');
    } else {
      const validActions = [
        'deleteOfflineServers',
        'deleteAllServers',
        'deleteEmptyUsers',
        'deleteInactiveUsers'
      ];
      
      for (const action of input.actions) {
        if (!validActions.includes(action)) {
          errors.push(`Invalid action: ${action}`);
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

const isValidUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidApiKey = (key) => {
  // Pterodactyl API key pattern
  return typeof key === 'string' && key.length > 20 && key.startsWith('ptla_');
};

module.exports = { validateInput };
