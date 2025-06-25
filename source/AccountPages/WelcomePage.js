import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import styles from '../Styles/AccountPageStyles/WelcomePageStyle'; // Importar os estilos
import authService from '../Utility/AuthService'; // Import AuthService

const WelcomePage = ({ navigation }) => {

  useEffect(() => {
    // Check for auto-login capability when component mounts
    const checkAutoLogin = async () => {
      try {
        const { shouldLogin, reason } = await authService.shouldAutoLogin();
        
        console.log(`Auto-login check: ${reason}`);
        
        if (shouldLogin) {
          console.log('Auto-login enabled with remember me - redirecting to main app');
          navigation.navigate('MainPages');
        } else {
          console.log('No auto-login - user must login manually');
        }
      } catch (error) {
        console.error('Error during auto-login check:', error);
      }
    };

    // Add a small delay to prevent immediate redirect flash
    const timer = setTimeout(checkAutoLogin, 500);
    
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} />
      
      <Text style={styles.title}>Control your finances!</Text>
      <Text style={styles.description}>
        Monitor your finances, set goals and achieve your objectives with ease and efficiency.
      </Text>
      
      <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerText}>Create an account</Text>
      </TouchableOpacity>
    </View>
  );
};

export default WelcomePage;