import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList, StyleSheet, Image } from 'react-native';
import { supabase } from '../../Supabase'; // Ensure the path is correct
import styles from '../Styles/AccountPageStyles/RegisterPageStyle'; // Import styles
import { isEmailValid, isPhoneValid, isPasswordValid, isFieldNotEmpty, isNameValid } from '../Utility/Validations'; // Import validations
import Alert from '../Utility/Alerts'; // Import alert component
import { fetchCountries } from '../Utility/FetchCountries'; // Reuse shared country-fetching utility

const RegisterPage = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('');
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Alert states
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);

  // Password visibility states
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  useEffect(() => {
    const loadCountries = async () => {
      const countryList = await fetchCountries();
      setCountries(countryList);
    };

    loadCountries();
  }, []);

  const showAlertMessage = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000); // Close the alert after 3 seconds
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
      // Check if email or phone is already registered
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

      // Register user in Supabase Auth
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

      // Insert user details into the `users` table
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
      <View style={styles.inputWithIcon}>
        <TextInput
          style={styles.inputField}
          placeholder="🔒 Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!passwordVisible}
        />
        <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
          <Image
            source={
              passwordVisible
                ? require('../../assets/eye-open.png') // Updated path
                : require('../../assets/eye-closed.png') // Updated path
            }
            style={styles.icon}
          />
        </TouchableOpacity>
      </View>

      {/* Confirm Password Input */}
      <View style={styles.inputWithIcon}>
        <TextInput
          style={styles.inputField}
          placeholder="🔒 Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!confirmPasswordVisible}
        />
        <TouchableOpacity onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}>
          <Image
            source={
              confirmPasswordVisible
                ? require('../../assets/eye-open.png') // Updated path
                : require('../../assets/eye-closed.png') // Updated path
            }
            style={styles.icon}
          />
        </TouchableOpacity>
      </View>

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

      <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={modalStyles.modalContainer}>
          <FlatList
            data={countries}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={modalStyles.modalItem}
                onPress={() => {
                  setRegion(item.code);
                  setModalVisible(false);
                }}
              >
                <Text style={modalStyles.modalText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

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

const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
  },
});