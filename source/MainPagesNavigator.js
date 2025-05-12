import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainMenuPage from './MainPages/MainMenuPage';
import SettingsPage from './MainPages/SettingsPage';
import ManagerPage from './MainPages/ManagerPage';
import ProfilePage from './MainPages/Settings/ProfilePage'; 
import SecurityPage from './MainPages/Settings/SecurityPage';
import SupportPage from './MainPages/Settings/SupportPage';
import NavigationBar from './NavigationBar';
import ExpensesPage from './MainPages/Manage/ExpensesPage';
import IncomePage from './MainPages/Manage/IncomePage';
import GoalsPage from './MainPages/Manage/GoalsPage';

const Stack = createStackNavigator();

const MainPagesNavigator = () => { 
  return (
    <>
      {/* Stack Navigator*/}
      <Stack.Navigator 
        screenOptions={{
          headerShown: false,
          animationTypeForReplace: 'push',
          animationEnabled: true,
        }}
      >
        <Stack.Screen name="MainMenuPage" component={MainMenuPage} />
        <Stack.Screen name="SettingsPage" component={SettingsPage} />
        <Stack.Screen name="IncomePage" component={IncomePage} />
        <Stack.Screen name="ExpensesPage" component={ExpensesPage} />
        <Stack.Screen name="ManagerPage" component={ManagerPage} />
        <Stack.Screen name="GoalsPage" component={GoalsPage} />
        <Stack.Screen name="ProfilePage" component={ProfilePage} /> 
        <Stack.Screen name="SupportPage" component={SupportPage} /> 
        <Stack.Screen name="SecurityPage" component={SecurityPage} /> 
      </Stack.Navigator>

      {/* Carrega a barra de navegação fora do Stack.Navigator*/}
      <NavigationBar />
    </>
  );
};

export default MainPagesNavigator;