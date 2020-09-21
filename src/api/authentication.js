import { post, get } from './fetch';
import { setToken } from './token';

export const loginPost = (email, password, onAuthentication) => {
  console.log('login....')
  return post('/auth/sign_in', {
    email, password,
  }, true)
};

export const loginGet = (uid, client, token, expiry) => {
  return get(`/auth/validate_token?uid=${uid}&client=${client}&access-token=${token}&expiry=${expiry}&token-type=Bearer&Content-Type=application/json&Accept=application/json`, true)
};

export const createAccount = (email, password) => {
  return post('/users', {
    user: { email, password },
  });
};
