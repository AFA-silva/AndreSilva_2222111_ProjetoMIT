import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';

const RegisterPage = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = () => {
    console.log('Phone:', phone);
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Password:', password);
    alert('Register button pressed!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register Account</Text>
      <Text style={styles.subtitle}>Create your account to start using MIT</Text>
      
      <TextInput
        style={styles.input}
        placeholder="📞 Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      
      <TextInput
        style={styles.input}
        placeholder="👤 Name"
        value={name}
        onChangeText={setName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="✉️ Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="🔒 Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TextInput
        style={styles.input}
        placeholder="🔒 Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
      
      <Text style={styles.orText}>OR</Text>
      
      <TouchableOpacity style={styles.googleButton}>
        <Image source={require('../../assets/google-logo.png')} style={styles.googleIcon} />
        <Text style={styles.googleText}>Sign up With Google</Text>
      </TouchableOpacity>
      
      <Text style={styles.loginText}>Already Have an Account? <Text style={styles.loginLink} onPress={() => navigation.navigate('Login')}>Login Here</Text></Text>
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
  loginText: {
    fontSize: 14,
    color: '#777',
  },
  loginLink: {
    color: '#f4c542',
    fontWeight: 'bold',
  },
});

export default RegisterPage;
