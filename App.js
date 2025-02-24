import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomePage from './source/AccountPages/WelcomePage';
import LoginPage from './source/AccountPages/LoginPage';
import RegisterPage from './source/AccountPages/RegisterPage';
import SupabaseTest from './source/AccountPages/SupabaseTest';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animationTypeForReplace: 'push',
          animationEnabled: true, // Ativa animações de transição
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomePage} />
        <Stack.Screen name="Login" component={LoginPage} />
        <Stack.Screen name="Register" component={RegisterPage} />
        <Stack.Screen name="SupabaseTest" component={SupabaseTest} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}