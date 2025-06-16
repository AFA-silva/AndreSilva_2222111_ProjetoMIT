import React, { useEffect } from 'react'; // Import do React
import { NavigationContainer } from '@react-navigation/native'; // Import do NavigationContainer 
import { createStackNavigator } from '@react-navigation/stack'; // Import do Stack.Navigator
import { Platform } from 'react-native'; // Import do Platform para detectar o ambiente
import WelcomePage from './source/AccountPages/WelcomePage'; // Import da página Welcome
import LoginPage from './source/AccountPages/LoginPage'; // Import da página Login
import RegisterPage from './source/AccountPages/RegisterPage'; // Import da página Register
import MainPagesNavigator from './source/MainPagesNavigator'; // Import do Navigator das Main Pages
import { cleanupDuplicateCurrencyPreferences } from './source/Utility/MainQueries'; // Import da função de limpeza

const Stack = createStackNavigator();

// Polyfill para corrigir problemas de acessibilidade com aria-hidden no React Native Web
const setupWebAccessibility = () => {
  if (Platform.OS === 'web') {
    // Remove focus de elementos escondidos por aria-hidden
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      // Se estamos definindo aria-hidden="true" em um elemento
      if (name === 'aria-hidden' && value === 'true') {
        // Verificar se este elemento contém algum elemento focável e remover o foco
        setTimeout(() => {
          const focusableElements = this.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length) {
            // Remover o foco de todos os elementos focáveis no elemento com aria-hidden
            focusableElements.forEach(el => {
              if (document.activeElement === el) {
                el.blur();
              }
            });
          }
        }, 0);
      }
      // Chamar a implementação original
      return originalSetAttribute.call(this, name, value);
    };
  }
};

export default function App() {
  // Run cleanup on app initialization
  useEffect(() => {
    const initializeApp = async () => {
      console.log('Initializing app and cleaning up database...');
      try {
        // Clean up any duplicate currency preferences
        await cleanupDuplicateCurrencyPreferences();
        
        // Configurar correções de acessibilidade para web
        setupWebAccessibility();
      } catch (error) {
        console.error('Error during app initialization:', error);
      }
    };
    
    initializeApp();
  }, []);

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