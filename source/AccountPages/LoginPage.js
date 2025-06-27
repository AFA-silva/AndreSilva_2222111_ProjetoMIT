import React, { useState, useEffect, useRef } from 'react'; // Import de componentes do React
import { View, Text, TextInput, TouchableOpacity, Platform, Keyboard, Image } from 'react-native'; // Import de componentes do react native
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import styles from '../Styles/AccountPageStyles/LoginPageStyle'; // Import do estilo para a página de login
import { supabase } from '../../Supabase'; // Import da Database
import Alert from '../Utility/Alerts'; // Import dos Alertas customs
import { updateUser, getSession } from '../Utility/MainQueries'; // Import das queries para atualizar usuário e obter a sessão
import { loadSavedCurrency } from '../Utility/FetchCountries'; // Import para carregar a moeda
import authService from '../Utility/AuthService'; // Import do AuthService

const LoginPage = ({ navigation }) => {
  // Cria as variáveis para os alertas.
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  // Cria as variáveis para o login (email e password)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false); // Controls password visibility
  
  // Remember me functionality
  const [rememberMe, setRememberMe] = useState(false); // Remember me checkbox state
  
  // Refs para os inputs
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

  // Helper para remover o foco de qualquer elemento na tela
  const clearFocus = () => {
    if (Platform.OS === 'web') {
      // Dismiss keyboard only, don't try to manipulate focus directly
      Keyboard.dismiss();
    } else {
      Keyboard.dismiss();
    }
  };

  // Corrige o problema de aria-hidden remova manipulação direta de foco
  useFocusEffect(
    React.useCallback(() => {
      // Apenas esconde o teclado virtual se necessário
      Keyboard.dismiss();
      
      // Limpa o foco quando a tela perde foco
      return () => {
        Keyboard.dismiss();
      };
    }, [])
  );
  
  // Limpar foco quando a tela não estiver mais focada
  useEffect(() => {
    const unsubscribeBeforeRemove = navigation.addListener('beforeRemove', () => {
      Keyboard.dismiss();
    });
    
    return () => {
      unsubscribeBeforeRemove();
    };
  }, [navigation]);

  // Função para mostrar o alerta
  const showAlertMessage = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  // Função para tentar fazer o login
  const handleLogin = async () => {
    try {
      // Mostra na consola as credenciais
      console.log('A Tentar login com:', email, password);

      // Use AuthService to handle login
      const result = await authService.signIn(email, password, rememberMe);

      if (!result.success) {
        showAlertMessage('Email or password are incorrect.', 'error');
        return;
      }

      console.log('User authenticated:', result.user);
      showAlertMessage(`Welcome, ${result.user.email}!`, 'success');

      // Obtém a sessão para acessar o ID do usuário
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

      // Inicializar as moedas antes de navegar para a tela principal
      try {
        console.log('Loading currency preferences...');
        await loadSavedCurrency();
      } catch (currencyError) {
        console.error('Error loading currency preferences:', currencyError);
        // Continue mesmo com erro de moeda
      }

      // Espera de 1.5 segundos antes de ir para a MainPage
      setTimeout(() => {
        navigation.navigate('MainPages');
      }, 1500);

    } catch (exception) {
      // Se o bloco try falhar, captura o erro e exibe uma mensagem
      console.error('Exception when logging in:', exception);
      showAlertMessage('An error occurred. Please try again later.', 'error');
    }
  };

  // Front-end da Login Page
  return (
    <View style={styles.container} ref={containerRef} accessibilityViewIsModal={true}>
      {/* Renderizar o alerta apenas quando visível */}
      {showAlert && (
        <Alert message={alertMessage} type={alertType} onClose={() => setShowAlert(false)} />
      )}

      {/* Logo da aplicação */}
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