import React, { useEffect } from 'react'; // React import
import { NavigationContainer } from '@react-navigation/native'; // NavigationContainer import
import { createStackNavigator } from '@react-navigation/stack'; // Stack.Navigator import
import { Platform } from 'react-native'; // Platform import to detect environment
import WelcomePage from './source/AccountPages/WelcomePage'; // Welcome page import
import LoginPage from './source/AccountPages/LoginPage'; // Login page import
import RegisterPage from './source/AccountPages/RegisterPage'; // Register page import
import MainPagesNavigator from './source/MainPagesNavigator'; // Main Pages Navigator import
import { cleanupDuplicateCurrencyPreferences } from './source/Utility/MainQueries'; // Cleanup function import

const Stack = createStackNavigator();

// Polyfill to fix accessibility issues with aria-hidden in React Native Web
const setupWebAccessibility = () => {
  if (Platform.OS === 'web') {
    // Remove focus from elements hidden by aria-hidden
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      // If we're setting aria-hidden="true" on an element
      if (name === 'aria-hidden' && value === 'true') {
        // Check if this element contains any focusable element and remove focus
        setTimeout(() => {
          const focusableElements = this.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length) {
            // Remove focus from all focusable elements in the element with aria-hidden
            focusableElements.forEach(el => {
              if (document.activeElement === el) {
                el.blur();
              }
            });
          }
        }, 0);
      }
      // Call the original implementation
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
        
        // Set up accessibility fixes for web
        setupWebAccessibility();
      } catch (error) {
        console.error('Error during app initialization:', error);
      }
    };
    
    initializeApp();
  }, []);

  return (
    // This is the component responsible for navigation in the application. Without it, the project doesn't work.
    <NavigationContainer>  
      <Stack.Navigator // Type of navigation that makes screens stack like "cards"
        // Screen configurations
        screenOptions={{
          headerShown: false,
          animationTypeForReplace: 'push',
          animationEnabled: true,
        }}
      >
        {/*Stack.Screen name = "Name": Defines the Screen name, similar to assigning an "id" in html*/}
        {/*Component = {Page}: Declares which page the Stack.Screen is associated with*/}
        <Stack.Screen name="Welcome" component={WelcomePage} /> 
        <Stack.Screen name="Login" component={LoginPage} />
        <Stack.Screen name="Register" component={RegisterPage} />
        <Stack.Screen name="MainPages" component={MainPagesNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}