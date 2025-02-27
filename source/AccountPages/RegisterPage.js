import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../Supabase';
import styles from '../Styles/AccountPageStyles/RegisterPageStyle';
import { validateRegisterForm } from '../Utility/Validations';
import Alert from '../Utility/Alerts'; // Importa o componente de alerta

const RegisterPage = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('');
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para o alerta
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all');
        const data = await response.json();
        const countryList = data.map(country => ({
          name: country.name.common,
          code: country.cca2,
        })).sort((a, b) => a.name.localeCompare(b.name));
        setCountries(countryList);
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };

    fetchCountries();
  }, []);

  const showAlertMessage = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000); // Fecha o alerta após 3 segundos
  };

  const handleRegister = async () => {
    console.log('handleRegister called');

    const validationError = validateRegisterForm({ phone, name, email, password, confirmPassword, region });

    if (validationError) {
      showAlertMessage(validationError, 'error');
      return;
    }

    if (isLoading) {
      showAlertMessage('Aguarde um momento antes de tentar novamente.', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      const { data: existingUserByEmail, error: existingUserErrorByEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', email);

      if (existingUserErrorByEmail) {
        showAlertMessage(`Erro ao verificar usuário: ${existingUserErrorByEmail.message}`, 'error');
        setIsLoading(false);
        return;
      }

      if (existingUserByEmail && existingUserByEmail.length > 0) {
        showAlertMessage('Usuário com este email já existe.', 'error');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        showAlertMessage(`Erro ao registrar: ${error.message}`, 'error');
        setIsLoading(false);
        return;
      }

      showAlertMessage('Conta criada com sucesso!', 'success');

      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);

    } catch (e) {
      console.error('Unexpected error:', e);
      showAlertMessage('Erro inesperado. Por favor, tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Exibir alerta caso showAlert seja true */}
      {showAlert && <Alert message={alertMessage} type={alertType} onClose={() => setShowAlert(false)} />}

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

      {countries.length === 0 ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={region}
            style={styles.picker}
            onValueChange={(itemValue) => setRegion(itemValue)}
          >
            <Picker.Item label="Select your region" value="" />
            {countries.map(country => (
              <Picker.Item key={country.code} label={country.name} value={country.code} />
            ))}
          </Picker>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <Text style={styles.loginText}>
        Already Have an Account?{' '}
        <Text style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
          Login Here
        </Text>
      </Text>
    </View>
  );
};

export default RegisterPage;
