import React from 'react'
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native'
import { getToken } from '../api/token';


class AuthLoading extends React.Component {

  checkLoggedInStatus = async () => {
    const token = await getToken();

    if (token && token.uid) {
      return this.props.navigation.navigate('DrawerNavigator');
    }

    return this.props.navigation.navigate('Login');
  }


  componentDidMount() {
    this.checkLoggedInStatus()
  }

  render() {
    return (
      <View style={styles.container}>
        <Text>AuthLoading Screen</Text>
        <ActivityIndicator />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default AuthLoading
