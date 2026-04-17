import { API_URL as BASE_URL } from '../config';

const API_URL = `${BASE_URL}/auth`;

async function handleResponse(response: Response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  // If not JSON, it's likely an HTML error page from the host
  const text = await response.text();
  console.error(`❌ Server returned non-JSON response (${response.status}):`, text.substring(0, 200));
  throw new Error(`Server Error (${response.status}): The server returned an unexpected web page instead of data. This usually means the API route is not found or the server crashed.`);
}

export const authService = {
  register: async (name: string, email: string, password: string) => {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse(response);
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  getMe: async (token: string) => {
    const response = await fetch(`${API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  },
};
