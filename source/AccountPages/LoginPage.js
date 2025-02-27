import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from '../Styles/AccountPageStyles/LoginPageStyle';
import { supabase } from '../../Supabase';
import Alert from '../Utility/Alerts'; // Importa o Alert customizado

const LoginPage = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Estados para o alerta
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  const showAlertMessage = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000); // Fecha o alerta após 3 segundos
  };

  const handleLogin = async () => {
    console.log('Email:', email);
    console.log('Password:', password);

    // Verifica se os campos não estão vazios
    if (!email || !password) {
      showAlertMessage('Por favor, preencha todos os campos.', 'error');
      return;
    }

    // Tentar fazer login com o Supabase Auth
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showAlertMessage(error.message, 'error');
      return;
    }

    if (data) {
      navigation.navigate('MainPages');
    } else {
      showAlertMessage('Email ou senha inválidos.', 'error');
    }
  };

  return (
    <View style={styles.container}>
      {showAlert && (
        <Alert 
          message={alertMessage} 
          type={alertType} 
          onClose={() => setShowAlert(false)} 
        />
      )}
      <Text style={styles.title}>Login Account</Text>
      <Text style={styles.subtitle}>Hello, welcome back to our account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      
      <Text style={styles.registerText}>
        Not Registered yet?{' '}
        <Text style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
          Create an Account
        </Text>
      </Text>
    </View>
  );
};

export default LoginPage;
