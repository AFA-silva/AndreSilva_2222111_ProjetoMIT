import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import styles from '../Styles/AccountPageStyles/LoginPageStyle';
import { supabase } from '../../Supabase';

const LoginPage = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      console.log('Tentando login com:', email, password);

      // Método seguro de login com email e senha
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Erro ao autenticar:', error.message);
        Alert.alert('Erro no Login', 'Email ou senha estão incorretos.');
        return;
      }

      if (data?.user) {
        console.log('Usuário autenticado:', data);

        // Exibe uma mensagem de boas-vindas
        Alert.alert('Login realizado com sucesso!', `Bem-vindo, ${data.user.email}!`);

        // Navega para a próxima página
        navigation.navigate('MainPages');
      } else {
        Alert.alert('Erro no Login', 'Ocorreu um problema ao autenticar o usuário.');
      }
    } catch (exception) {
      console.error('Exceção ao fazer login:', exception);
      Alert.alert('Erro inesperado', 'Ocorreu um erro. Tente novamente mais tarde.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Account</Text>
      <Text style={styles.subtitle}>Faça login com suas credenciais</Text>

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
        Não tem uma conta?{' '}
        <Text style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
          Crie uma Conta
        </Text>
      </Text>
    </View>
  );
};

export default LoginPage;