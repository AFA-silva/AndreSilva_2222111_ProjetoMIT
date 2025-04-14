import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../../Supabase'; // Certifique-se de que o caminho está correto
import styles from '../Styles/AccountPageStyles/RegisterPageStyle'; // Estilos
import { isEmailValid, isPhoneValid, isPasswordValid, isFieldNotEmpty, isNameValid } from '../Utility/Validations'; // Validações
import Alert from '../Utility/Alerts'; // Componente de alerta
import { fetchCountries } from '../Utility/FetchCountries'; // Utilitário para buscar os países

const RegisterPage = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('');
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Alertas
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  // Modal e barra de pesquisa
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadCountries = async () => {
      const countryList = await fetchCountries();
      setCountries(countryList);
      setFilteredCountries(countryList); // Inicializa a lista filtrada com todos os países
    };

    loadCountries();
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setFilteredCountries(
      countries.filter((country) =>
        country.name.toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  const showAlertMessage = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000); // Fecha o alerta após 3 segundos
  };

  const handleRegister = async () => {
    if (
      !isFieldNotEmpty(phone) ||
      !isFieldNotEmpty(name) ||
      !isFieldNotEmpty(email) ||
      !isFieldNotEmpty(password) ||
      !isFieldNotEmpty(confirmPassword) ||
      !isFieldNotEmpty(region)
    ) {
      showAlertMessage('Please fill out all fields.', 'error');
      return;
    }

    if (!isPhoneValid(phone)) {
      showAlertMessage('Please enter a valid phone number (9 digits).', 'error');
      return;
    }

    if (!isNameValid(name)) {
      showAlertMessage('Name must be at most 20 characters long.', 'error');
      return;
    }

    if (!isEmailValid(email)) {
      showAlertMessage('Please enter a valid email address.', 'error');
      return;
    }

    if (!isPasswordValid(password, confirmPassword)) {
      showAlertMessage('Password must be 6-16 characters long and match the confirmation.', 'error');
      return;
    }

    if (isLoading) {
      showAlertMessage('Please wait before trying again.', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      // Verifica se o email ou telefone já está registrado
      const { data: existingUserByEmail } = await supabase.from('users').select('id').eq('email', email);
      const { data: existingUserByPhone } = await supabase.from('users').select('id').eq('phone', phone);

      if (existingUserByEmail?.length > 0) {
        showAlertMessage('A user with this email already exists.', 'error');
        setIsLoading(false);
        return;
      }

      if (existingUserByPhone?.length > 0) {
        showAlertMessage('A user with this phone number already exists.', 'error');
        setIsLoading(false);
        return;
      }

      // Registra o usuário no Supabase Auth
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        showAlertMessage(`Error registering: ${error.message}`, 'error');
        setIsLoading(false);
        return;
      }

      const user = data.user;

      if (!user) {
        showAlertMessage('Error retrieving user data.', 'error');
        setIsLoading(false);
        return;
      }

      // Insere os detalhes do usuário na tabela `users`
      const { error: insertError } = await supabase
        .from('users')
        .insert([{ id: user.id, phone, name, email, password, region }]);

      if (insertError) {
        showAlertMessage(`Error saving data: ${insertError.message}`, 'error');
        setIsLoading(false);
        return;
      }

      showAlertMessage('Account created successfully!', 'success');

      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (e) {
      console.error('Unexpected error:', e);
      showAlertMessage('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {showAlert && <Alert message={alertMessage} type={alertType} onClose={() => setShowAlert(false)} />}
      <Text style={styles.title}>Register Account</Text>
      <Text style={styles.subtitle}>Create your account to start using MIT</Text>

      <TextInput style={styles.input} placeholder="📞 Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="👤 Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="✉️ Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

      {/* Password Input */}
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

      {/* Country Picker */}
      <TouchableOpacity style={styles.input} onPress={() => setModalVisible(true)}>
        <View style={styles.countryPickerRow}>
          {region ? (
            <Image source={{ uri: `https://flagcdn.com/w40/${region.toLowerCase()}.png` }} style={styles.flagIcon} />
          ) : (
            <Image source={require('../../assets/flag-placeholder.png')} style={styles.flagIcon} />
          )}
          <Text style={[styles.inputText, { color: region ? '#333' : '#999' }]}>
            {region ? countries.find((c) => c.code === region)?.name || 'Select your region' : 'Select your region'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Redesigned Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a country..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setRegion(item.code);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
        <Text style={styles.buttonText}>
          {isLoading ? <ActivityIndicator size="small" color="#FFF" /> : 'Register'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default RegisterPage;