import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Button } from 'react-native'
import { login } from '../api/mock';

const Signup = ({ navigation }) => {
  const loginUser = () => {
    login('test@test.ca', 'password')
      .then(() => {
        navigation.navigate('Home');
      })
      .catch((err) => console.log('error:', err.message));
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Sign up screen</Text>
      <Button title="Log in" onPress={loginUser} />
      <Button
        title="Create account"
        onPress={() => navigation.navigate('CreateAccount')}
      />
    </View>
  );
};

export default Signup;
