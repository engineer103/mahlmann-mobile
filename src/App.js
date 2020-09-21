import React from 'react'
import { SafeAreaView, StyleSheet } from 'react-native'
import { createAppContainer, createSwitchNavigator } from 'react-navigation'
import { createDrawerNavigator } from 'react-navigation-drawer' // import drawer nav
import { createBottomTabNavigator } from 'react-navigation-tabs'
import { createStackNavigator } from 'react-navigation-stack'

import Login from './components/Login'
import AuthLoading from './components/AuthLoading'
import Home from './components/Home'


const DrawerNavigator = createDrawerNavigator(
  {
    Home,
  },
  {
    initialRouteName: 'Home'
  }
)


const switchNavigator = createSwitchNavigator(
  {
    AuthLoading,
    Login,
    DrawerNavigator, // change this to DrawerNavigator
  },
  {
    initialRouteName: 'AuthLoading',
  },
)


const AppNavigator = createAppContainer(switchNavigator)

class App extends React.Component {
  render() {
    return (
      <SafeAreaView style={styles.container}>
        <AppNavigator />
      </SafeAreaView>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

export default App
