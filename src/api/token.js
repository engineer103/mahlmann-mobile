import AsyncStorage from '@react-native-community/async-storage';

export const getToken = async () => {
  try {
    const value = await AsyncStorage.getItem('@auth_token');
    if (value !== null) {
      return JSON.parse(value);
    }
  } catch (e) {
    return null;
  }
};

export const setToken = async (token) => {
  try {
    await AsyncStorage.setItem('@auth_token', JSON.stringify(token));
  } catch (e) {
    return null;
  }
};
