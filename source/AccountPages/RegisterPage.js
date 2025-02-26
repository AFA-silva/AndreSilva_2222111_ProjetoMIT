import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../Supabase'; // Certifique-se de que o caminho está correto
import styles from '../Styles/AccountPageStyles/RegisterPageStyle'; // Importar os estilos
import { isEmailValid, isPhoneValid, isPasswordValid, isFieldNotEmpty, isNameValid } from '../Utility/Validations'; // Importar funções de validação

const RegisterPage = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('');
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch countries from REST Countries API
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

  const handleRegister = async () => {
    console.log('handleRegister called');

    if (
      !isFieldNotEmpty(phone) ||
      !isFieldNotEmpty(name) ||
      !isFieldNotEmpty(email) ||
      !isFieldNotEmpty(password) ||
      !isFieldNotEmpty(confirmPassword) ||
      !isFieldNotEmpty(region)
    ) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    if (!isPhoneValid(phone)) {
      alert('Por favor, insira um número de telefone válido (9 dígitos).');
      return;
    }

    if (!isNameValid(name)) {
      alert('O nome deve ter no máximo 20 caracteres.');
      return;
    }

    if (!isEmailValid(email)) {
      alert('Por favor, insira um email válido.');
      return;
    }
  
    if (!isPasswordValid(password, confirmPassword)) {
      alert('A senha deve ter entre 6 e 16 caracteres e coincidir com a confirmação de senha.');
      return;
    }
    
    if (isLoading) {
      alert('Aguarde um momento antes de tentar novamente.');
      return;
    }

    setIsLoading(true);

    try {
      // Verificar se o email já está registrado
      const { data: existingUserByEmail, error: existingUserErrorByEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', email);
      
      if (existingUserErrorByEmail) {
        alert(`Erro ao verificar usuário existente: ${existingUserErrorByEmail.message}`);
        setIsLoading(false);
        return;
      }

      if (existingUserByEmail && existingUserByEmail.length > 0) {
        alert('Usuário com este email já existe.');
        setIsLoading(false);
        return;
      }

      // Verificar se o telefone já está registrado
      const { data: existingUserByPhone, error: existingUserErrorByPhone } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone);
      
      if (existingUserErrorByPhone) {
        alert(`Erro ao verificar telefone existente: ${existingUserErrorByPhone.message}`);
        setIsLoading(false);
        return;
      }

      if (existingUserByPhone && existingUserByPhone.length > 0) {
        alert('Usuário com este telefone já existe.');
        setIsLoading(false);
        return;
      }

      // Registar utilizador no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      console.log('signUp result:', data, error);
  
      if (error) {
        alert(`Erro ao registar: ${error.message}`);
        setIsLoading(false);
        return;
      }

      const user = data.user;
  
      if (!user) {
        alert('Erro ao obter os dados do usuário.');
        setIsLoading(false);
        return;
      }
  
      // Inserir os dados na tabela `users`
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert([{ id: user.id, phone, name, email, password, region }]);
      
      console.log('insert result:', insertData, insertError);
  
      if (insertError) {
        alert(`Erro ao guardar dados: ${insertError.message}`);
        setIsLoading(false);
        return;
      }
  
      alert('Conta criada com sucesso!');
      navigation.navigate('Login'); // Redirecionar para login
    } catch (e) {
      console.error('Unexpected error:', e);
      alert('Erro inesperado. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
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
      
      <Text style={styles.loginText}>Already Have an Account? <Text style={styles.loginLink} onPress={() => navigation.navigate('Login')}>Login Here</Text></Text>
    </View>
  );
};

export default RegisterPage;