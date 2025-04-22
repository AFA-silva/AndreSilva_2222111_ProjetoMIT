import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import styles from '../../Styles/Settings/ProfilePageStyle';
import { getUserByEmail, updateUserByEmail, clearUserFromStorage } from '../../Utility/MainQueries';

const ProfilePage = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [email] = useState('user@example.com'); // Substitua com o e-mail dinâmico do utilizador

  useEffect(() => {
    const loadUser = async () => {
      const cachedUser = await getUserFromStorage();
      if (cachedUser) {
        setName(cachedUser.name || '');
        setPhone(cachedUser.phone || '');
        setRegion(cachedUser.region || '');
      } else {
        const user = await getUserByEmail(email);
        if (user) {
          setName(user.name || '');
          setPhone(user.phone || '');
          setRegion(user.region || '');
          await saveUserToStorage(user); // Salva no AsyncStorage
        }
      }
    };

    loadUser();
  }, [email]);

  const handleSave = async () => {
    const success = await updateUserByEmail(email, { name, phone, region });
    if (success) {
      Alert.alert('Success', 'Profile updated successfully!');
      await saveUserToStorage({ name, phone, region, email }); // Atualiza no AsyncStorage
    } else {
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  const handleClear = async () => {
    await clearUserFromStorage(email);
    Alert.alert('Success', 'User data cleared from AsyncStorage.');
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

      <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
        <Text style={styles.clearButtonText}>Clear Data</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProfilePage;