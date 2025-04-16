import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import styles from '../Styles/AccountPageStyles/LoginPageStyle';
import { supabase } from '../../Supabase'; 

const LoginPage = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Função para verificar login na base de dados
  const handleLogin = async () => {
    try {
      console.log('Tentando login com:', email, password);

      // Consulta para verificar se o email e senha correspondem a um usuário na base de dados
      const { data, error } = await supabase
        .from('users') // Substitua 'users' pelo nome da sua tabela de usuários
        .select('*')
        .eq('email', email)
        .eq('password', password) // Certifique-se de que a senha está armazenada como texto simples ou use hash
        .single();

      if (error) {
        // Caso ocorra algum erro na consulta
        console.error('Erro ao consultar a base de dados:', error.message);
        Alert.alert('Erro no Login', 'Email ou senha estão incorretos.');
        return;
      }

      if (data) {
        // Login bem-sucedido
        console.log('Login bem-sucedido:', data);
        Alert.alert('Login realizado com sucesso!', `Bem-vindo, ${data.name || 'usuário'}!`);
        navigation.navigate('MainPages'); // Navega para MainPages
      } else {
        // Nenhum usuário encontrado
        Alert.alert('Erro no Login', 'Email ou senha estão incorretos.');
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