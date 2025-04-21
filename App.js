import React from 'react'; // Import do React
import { NavigationContainer } from '@react-navigation/native'; // Import do NavigationContainer 
import { createStackNavigator } from '@react-navigation/stack'; // Import do Stack.Navigator
import WelcomePage from './source/AccountPages/WelcomePage'; // Import da página Welcome
import LoginPage from './source/AccountPages/LoginPage'; // Import da página Login
import RegisterPage from './source/AccountPages/RegisterPage'; // Import da página Register
import MainPagesNavigator from './source/MainPagesNavigator'; // Import do Navigator das Main Pages

const Stack = createStackNavigator();

export default function App() {
  return (
    // É o componente responsavel pela navegação no aplicativo. Sem ele o projeto não funciona.
    <NavigationContainer>  
      <Stack.Navigator // Tipo de navegação quem faz as telas ficarem empilhadas como "cartas".
        // Configurações da Tela.
        screenOptions={{
          headerShown: false,
          animationTypeForReplace: 'push',
          animationEnabled: true,
        }}
      >
        {/*Stack.Screen name = "Name": Define o nome do Screen, semelhante a atribuir um "id" em html*/}
        {/*Component = {Page}: Declara que página o Stack.Screen está associado*/}
        <Stack.Screen name="Welcome" component={WelcomePage} /> 
        <Stack.Screen name="Login" component={LoginPage} />
        <Stack.Screen name="Register" component={RegisterPage} />
        <Stack.Screen name="MainPages" component={MainPagesNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}