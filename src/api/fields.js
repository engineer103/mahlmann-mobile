import { get, post } from './fetch';

export const getFields = async () => {
  return get('/fields');
};

export const createComment = async (fieldId, text) => {
  return post(`/fields/${fieldId}/comments`, {
    text,
  })
};

export const setField = async (userIds, fieldIds) => {
  return post('/fields/set_fields', {
    userIds, fieldIds,
  })
};

export const getComments = async (fieldId) => {
  return get(`/fields/${fieldId}/comments`);
};

export const getGroups = async () => {
  return get(`/groups`);
};
