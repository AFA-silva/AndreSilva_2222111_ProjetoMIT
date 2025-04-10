import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../Styles/MainPageStyles/SettingsPageStyle';
import { supabase } from '../../../Supabase'; // Ensure this is correctly configured

const ProfilePage = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Fetch the user data from the 'users' table
        const { data, error } = await supabase
          .from('users') // Query the 'users' table
          .select('name, email, phone, region') // Select the required fields
          .eq('id', supabase.auth.user().id) // Filter by the logged-in user's ID
          .single(); // Expect a single record

        if (error) {
          console.error('Error fetching user data:', error.message);
        } else if (data) {
          setName(data.name);
          setEmail(data.email);
          setPhone(data.phone);
          setRegion(data.region);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users') // Update the 'users' table
        .update({ name, email, phone, region }) // Update these fields
        .eq('id', supabase.auth.user().id); // Filter by the logged-in user's ID

      if (error) {
        console.error('Error updating user data:', error.message);
      } else {
        console.log('User data updated successfully!');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF9800" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Perfil</Text>

      <View style={styles.inputGroup}>
        <Ionicons name="person-outline" size={24} color="#FF9800" />
        <TextInput
          style={styles.input}
          placeholder="Nome"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Ionicons name="mail-outline" size={24} color="#FF9800" />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputGroup}>
        <Ionicons name="call-outline" size={24} color="#FF9800" />
        <TextInput
          style={styles.input}
          placeholder="Telefone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Ionicons name="location-outline" size={24} color="#FF9800" />
        <TextInput
          style={styles.input}
          placeholder="Região"
          value={region}
          onChangeText={setRegion}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? 'Salvando...' : 'Salvar Alterações'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ProfilePage;