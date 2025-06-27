import React, { useEffect, useState } from 'react'; // React import
import { NavigationContainer } from '@react-navigation/native'; // NavigationContainer import
import { createStackNavigator } from '@react-navigation/stack'; // Stack.Navigator import
import { Platform } from 'react-native'; // Platform import to detect environment
import WelcomePage from './source/AccountPages/WelcomePage'; // Welcome page import
import LoginPage from './source/AccountPages/LoginPage'; // Login page import
import RegisterPage from './source/AccountPages/RegisterPage'; // Register page import
import SplashScreen from './source/AccountPages/SplashScreen'; // Splash screen import
import MainPagesNavigator from './source/MainPagesNavigator'; // Main Pages Navigator import
import { cleanupDuplicateCurrencyPreferences } from './source/Utility/MainQueries'; // Cleanup function import
import authService from './source/Utility/AuthService'; // Auth service import

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
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Welcome');

  // Check for existing session and determine initial route
  useEffect(() => {
    const initializeApp = async () => {
      console.log('Initializing app and checking authentication...');
      try {
        // Clean up any duplicate currency preferences
        await cleanupDuplicateCurrencyPreferences();
        
        // Set up accessibility fixes for web
        setupWebAccessibility();

        // Initialize auth service
        await authService.initialize();
        
        // Check for auto-login capability (only if remember me is enabled)
        const { shouldLogin, reason } = await authService.shouldAutoLogin();
        
        if (shouldLogin) {
          console.log(`Auto-login with Remember Me: will go to main app after splash (${reason})`);
          setInitialRoute('MainPages');
        } else {
          console.log(`No auto-login: will go to welcome page after splash (${reason})`);
          setInitialRoute('Welcome');
        }
        
        console.log('Splash screen will always show first, then navigate to:', shouldLogin ? 'MainPages' : 'Welcome');
        
            } catch (error) {
        console.error('Error during app initialization:', error);
        setInitialRoute('Welcome');
      } finally {
        // Always show splash screen animation first (4.5 seconds)
        // Total animation time: logo(0.8s) + wait(0.4s) + text(0.6s) + circle(0.5s) + hold(0.5s) + pulse/border(1.7s) = ~4.5s
        const splashDuration = 4500;
        console.log(`Always showing splash screen for ${splashDuration}ms first`);
        
        setTimeout(() => {
          console.log('Splash animation completed, hiding splash screen');
          setShowSplash(false);
          setIsLoading(false);
        }, splashDuration);
      }
    };
    
    initializeApp();
  }, []);

  // Always show splash screen first, no matter what
  if (showSplash) {
    const message = initialRoute === 'MainPages' ? 'Validating session...' : 'Welcome to MIT!';
    return <SplashScreen message={message} />;
  }

  // Show minimal loading while determining route (should be very brief)
  if (isLoading) {
    return null;
  }

  return (
    // This is the component responsible for navigation in the application. Without it, the project doesn't work.
    <NavigationContainer>  
      <Stack.Navigator // Type of navigation that makes screens stack like "cards"
        // Screen configurations
        initialRouteName={initialRoute}
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