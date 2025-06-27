import React, { useState, useEffect, useRef } from 'react'; // Import React components
import { View, Text, TextInput, TouchableOpacity, Platform, Keyboard, Image } from 'react-native'; // Import React Native components
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import styles from '../Styles/AccountPageStyles/LoginPageStyle'; // Import style for the login page
import { supabase } from '../../Supabase'; // Import Database
import Alert from '../Utility/Alerts'; // Import custom Alerts
import { updateUser, getSession } from '../Utility/MainQueries'; // Import queries to update user and get session
import { loadSavedCurrency } from '../Utility/FetchCountries'; // Import to load currency
import authService from '../Utility/AuthService'; // Import AuthService

const LoginPage = ({ navigation }) => {
  // Create variables for alerts.
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  // Create variables for login (email and password)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false); // Controls password visibility
  
  // Remember me functionality
  const [rememberMe, setRememberMe] = useState(false); // Remember me checkbox state
  
  // Refs for inputs
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const containerRef = useRef(null);

  // Load saved email if remember me was previously checked
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const { email: savedEmail, rememberMe: wasRemembered } = await authService.getRememberedCredentials();
        
        if (savedEmail && wasRemembered) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (error) {
        console.log('Error loading saved credentials:', error);
      }
    };
    
    loadSavedCredentials();
  }, []);

  // Helper to remove focus from any element on the screen
  const clearFocus = () => {
    if (Platform.OS === 'web') {
      // Dismiss keyboard only, don't try to manipulate focus directly
      Keyboard.dismiss();
    } else {
      Keyboard.dismiss();
    }
  };

  // Fix aria-hidden problem, remove direct focus manipulation
  useFocusEffect(
    React.useCallback(() => {
      // Only hide the virtual keyboard if necessary
      Keyboard.dismiss();
      
      // Clear focus when the screen loses focus
      return () => {
        Keyboard.dismiss();
      };
    }, [])
  );
  
  // Clear focus when the screen is no longer focused
  useEffect(() => {
    const unsubscribeBeforeRemove = navigation.addListener('beforeRemove', () => {
      Keyboard.dismiss();
    });
    
    return () => {
      unsubscribeBeforeRemove();
    };
  }, [navigation]);

  // Function to show the alert
  const showAlertMessage = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  // Function to attempt login
  const handleLogin = async () => {
    try {
      // Show credentials in the console
      console.log('Attempting login with:', email, password);

      // Use AuthService to handle login
      const result = await authService.signIn(email, password, rememberMe);

      if (!result.success) {
        showAlertMessage('Email or password are incorrect.', 'error');
        return;
      }

      console.log('User authenticated:', result.user);
      showAlertMessage(`Welcome, ${result.user.email}!`, 'success');

      // Get the session to access the user ID
      const session = await getSession();
      const userId = session?.user?.id;

      if (userId) {
        try {
          console.log('Updating email directly in the database...');
          const { error: updateError } = await updateUser(userId, { email: result.user.email });

          if (updateError) {
            console.error('Error updating email in the database:', updateError.message);
            showAlertMessage('Error synchronizing email in the database.', 'error');
            return;
          }

          showAlertMessage('Email successfully updated in the database.', 'success');
        } catch (dbError) {
          console.error('Error updating email:', dbError.message);
          showAlertMessage('Error synchronizing user data.', 'error');
          return;
        }
      }

      // Initialize currencies before navigating to the main screen
      try {
        console.log('Loading currency preferences...');
        await loadSavedCurrency();
      } catch (currencyError) {
        console.error('Error loading currency preferences:', currencyError);
        // Continue even with currency error
      }

      // Wait 1.5 seconds before going to MainPage
      setTimeout(() => {
        navigation.navigate('MainPages');
      }, 1500);

    } catch (exception) {
      // If the try block fails, catch the error and display a message
      console.error('Exception when logging in:', exception);
      showAlertMessage('An error occurred. Please try again later.', 'error');
    }
  };

  // Login Page front-end
  return (
    <View style={styles.container} ref={containerRef} accessibilityViewIsModal={true}>
      {/* Render the alert only when visible */}
      {showAlert && (
        <Alert message={alertMessage} type={alertType} onClose={() => setShowAlert(false)} />
      )}

      {/* Application logo */}
      <Image 
        source={require('../../assets/logo.png')} 
        style={styles.logo} 
        accessibilityLabel="Application logo"
      />

      <Text style={styles.title}>Login Account</Text>
      <Text style={styles.subtitle}>Login with your credentials</Text>

      <TextInput
        ref={emailInputRef}
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        accessibilityLabel="Email input field"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          ref={passwordInputRef}
          style={styles.passwordInput}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          accessibilityLabel="Password input field"
        />
        <TouchableOpacity 
          style={styles.eyeButton} 
          onPress={() => setShowPassword(!showPassword)}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
        >
          <Image 
            source={showPassword ? require('../../assets/eye-open.png') : require('../../assets/eye-closed.png')} 
            style={styles.eyeIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Remember Me Checkbox */}
      <TouchableOpacity 
        style={styles.rememberMeContainer} 
        onPress={() => setRememberMe(!rememberMe)}
        accessibilityRole="button"
        accessibilityLabel={rememberMe ? "Uncheck remember me" : "Check remember me"}
      >
        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
          {rememberMe && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.rememberMeText}>Remember me</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        accessibilityRole="button"
        accessibilityLabel="Login button"
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <Text style={styles.registerText}>
        Don't have an account?{' '}
        <Text 
          style={styles.registerLink} 
          onPress={() => navigation.navigate('Register')}
          accessibilityRole="link"
          accessibilityLabel="Create account"
        >
          Create an Account
        </Text>
      </Text>
    </View>
  );
};

export default LoginPage;