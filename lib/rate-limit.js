// Simple in-memory rate limiting
// Note: For production, use Redis or Vercel KV
const rateLimits = new Map();

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_HOUR = 10; // 10 requests per hour per IP

const rateLimit = (ip) => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, []);
  }
  
  const requests = rateLimits.get(ip);
  
  // Clean old requests
  const validRequests = requests.filter(time => time > windowStart);
  rateLimits.set(ip, validRequests);
  
  if (validRequests.length >= MAX_REQUESTS_PER_HOUR) {
    const oldestRequest = Math.min(...validRequests);
    const resetIn = Math.ceil((oldestRequest + RATE_LIMIT_WINDOW - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetIn: resetIn
    };
  }
  
  // Add current request
  validRequests.push(now);
  rateLimits.set(ip, validRequests);
  
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_HOUR - validRequests.length,
    resetIn: RATE_LIMIT_WINDOW / 1000
  };
};

module.exports = { rateLimit };
