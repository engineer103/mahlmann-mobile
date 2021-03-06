import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TextInput, Button, Text } from 'react-native';
import { setToken } from '../api/token';
import { loginGet } from '../api/authentication';

const EmailForm = ({ buttonText, onSubmit, children, onAuthentication }) => {
  const [email, onChangeEmail] = useState('');
  const [password, onChangePassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const submit = () => {
    onSubmit(email, password, onAuthentication)
      .then( (res) => {
        if (res.ok) {
          setToken({
            uid: res.headers.map.uid,
            client: res.headers.map.client,
            expiry: res.headers.map.expiry,
            admin: res.headers.map.admin
          });
          onAuthentication();
        } else {
          setErrorMessage('Invalid E-mail or Passwort.');
        }
      })
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>E-Mail</Text>
      <TextInput
        style={styles.input}
        onChangeText={(text) => onChangeEmail(text)}
        value={email}
        keyboardType="email-address"
      />
      <Text style={styles.label}>Passwort</Text>
      <TextInput
        style={styles.input}
        onChangeText={(text) => onChangePassword(text)}
        value={password}
        secureTextEntry
      />
      <Button title={buttonText} onPress={submit} />
      {errorMessage ? <Text>{errorMessage}</Text> : null}
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    height: 40,
    width: 300,
    borderColor: 'gray',
    borderWidth: 1,
  },
  label: {
    marginTop: 8,
  },
});

export default EmailForm;
