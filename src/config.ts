// Central configuration for the API base URL.
const isProduction = import.meta.env.PROD;

// Helper to determine the best API base URL
const getBaseUrl = () => {
  // If explicitly not in production, use local server
  if (!isProduction) return 'http://localhost:5000';
  
  // If we're on a local address but PROD is true (e.g. running build locally),
  // we still need to hit port 5000 if the current port isn't 5000.
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal && window.location.port !== '5000') {
      return 'http://localhost:5000';
    }
  }
  
  // Default to relative path for true production environments
  return '';
};

export const API_BASE_URL = getBaseUrl();

console.log(`🚀 [Config] Environment: ${isProduction ? 'Production' : 'Development'}`);
console.log(`🔗 [Config] API Base URL: ${API_BASE_URL || '(Relative)'}`);

export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

