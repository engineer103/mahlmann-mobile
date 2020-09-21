import { API_URL } from '../../secrets';
import { getToken } from './token';

const getHeaders = async () => {
  const token = await getToken();
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.uid = token.uid;
    headers.client = token.client;
    headers.expiry = token.expiry;
  }

  return headers;
};

export const post = async (destination, body, auth=false) => {
  const headers = await getHeaders();

  const result = await fetch(`${API_URL}${destination}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (auth) {
    return await result
  } else {
    if (result.ok) {
      return await result.json();
    }

    throw { error: result.status };  
  }
};

export const get = async (destination, auth=false) => {
  const headers = await getHeaders();

  const result = await fetch(`${API_URL}${destination}`, {
    method: 'GET',
    headers,
  });

  if (auth) {
    return await result
  } else {
    if (result.ok) {
      return await result.json();
    }

    throw { error: result.status };  
  }
};
