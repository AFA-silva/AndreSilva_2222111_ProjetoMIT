import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';

const LoginPage = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    console.log('Email:', email);
    console.log('Password:', password);
    alert('Login pressionado!');
  };

  return (
    <View style={styles.container}>
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
      
      <Text style={styles.orText}>OR</Text>
      
      <TouchableOpacity style={styles.googleButton}>
        <Image source={require('../../assets/google-logo.png')} style={styles.googleIcon} />
        <Text style={styles.googleText}>Login with Google</Text>
      </TouchableOpacity>
      
      <Text style={styles.registerText}>Not Registered yet? <Text style={styles.registerLink} onPress={() => navigation.navigate('Register')}>Create an Account</Text></Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#f4c542',
    padding: 15,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orText: {
    fontSize: 14,
    color: '#777',
    marginVertical: 10,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    width: '80%',
    justifyContent: 'center',
    marginBottom: 20,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#777',
  },
  registerText: {
    fontSize: 14,
    color: '#777',
  },
  registerLink: {
    color: '#f4c542',
    fontWeight: 'bold',
  },
});

export default LoginPage;
