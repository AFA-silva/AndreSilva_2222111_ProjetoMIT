import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper'; // Import the Provider from react-native-paper
import WelcomePage from './source/AccountPages/WelcomePage';
import LoginPage from './source/AccountPages/LoginPage';
import RegisterPage from './source/AccountPages/RegisterPage';
import MainPagesNavigator from './source/MainPagesNavigator';

const Stack = createStackNavigator();

export default function App() {
  return (
    <PaperProvider> {/* Wrap the entire app with PaperProvider */}
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animationTypeForReplace: 'push',
            animationEnabled: true,
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomePage} />
          <Stack.Screen name="Login" component={LoginPage} />
          <Stack.Screen name="Register" component={RegisterPage} />
          <Stack.Screen name="MainPages" component={MainPagesNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}