import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { loginPost } from '../api/authentication';
import { getAPIConnecting } from '../api/token';
import EmailForm from '../forms/EmailForm';

const Login = ({ navigation }) => {
  return (
    <EmailForm
      buttonText="Einloggen"
      onSubmit={loginPost}
      onAuthentication={() => navigation.navigate('Home')}
    />
  );
};

export default Login;
