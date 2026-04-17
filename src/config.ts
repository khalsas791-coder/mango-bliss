// Central configuration for the API base URL.
// In development, it defaults to the local server port.
// In production, it uses a relative path to allow the app to work on any domain.

const isProduction = import.meta.env.PROD;

// When deploying a MERN app as a single unit or with a proxy,
// relative URLs are the most robust way to handle backend communication.
export const API_BASE_URL = isProduction 
  ? '' // Relative to the window.location.origin
  : 'http://localhost:5000';

export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;
