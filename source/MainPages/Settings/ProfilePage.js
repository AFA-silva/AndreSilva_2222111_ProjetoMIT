import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import styles from '../../Styles/Settings/ProfilePageStyle';
import { getUserByEmail, updateUserByEmail } from '../../Utility/MainQueries';

const ProfilePage = () => {
  // Estados para os campos de perfil
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [email] = useState('user@example.com'); // Substitua pelo email dinâmico

  // Função para carregar dados do usuário
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getUserByEmail(email);
        if (user) {
          setName(user.name || '');
          setPhone(user.phone || '');
          setRegion(user.region || '');
        } else {
          Alert.alert('Error', 'Failed to load user data.');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        Alert.alert('Error', 'An unexpected error occurred.');
      }
    };

    loadUserData();
  }, [email]);

  // Função para salvar alterações no perfil
  const handleSave = async () => {
    try {
      const success = await updateUserByEmail(email, { name, phone, region });
      if (success) {
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update profile.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>

      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Region"
        value={region}
        onChangeText={setRegion}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProfilePage;