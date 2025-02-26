import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainMenuPage from './MainPages/MainMenuPage';
import SettingsPage from './MainPages/SettingsPage';
import ManagerPage from './MainPages/ManagerPage';
import NavigationBar from './NavigationBar';

const Stack = createStackNavigator();

const MainPagesNavigator = () => {
  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animationTypeForReplace: 'push',
          animationEnabled: true,
        }}
      >
        <Stack.Screen name="MainMenuPage" component={MainMenuPage} />
        <Stack.Screen name="SettingsPage" component={SettingsPage} />
        <Stack.Screen name="ManagerPage" component={ManagerPage} />
      </Stack.Navigator>
      <NavigationBar />
    </>
  );
};

export default MainPagesNavigator;