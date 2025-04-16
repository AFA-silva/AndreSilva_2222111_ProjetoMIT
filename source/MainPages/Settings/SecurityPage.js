import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from '../../Styles/Settings/SecurityPageStyle'; // Import styles
import { supabase } from '../../../Supabase'; // Replace with Supabase client

const SecurityPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleUpdate = async () => {
    try {
      // Replace 'user@example.com' with the logged-in user's email
      const { error } = await supabase
        .from('users')
        .update({ email, password })
        .eq('email', 'user@example.com');

      if (error) throw error;

      alert('Security settings updated successfully!');
    } catch (error) {
      console.error('Error updating security settings:', error.message);
      alert('Failed to update security settings.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Security Settings</Text>

      {/* Update Email */}
      <TextInput
        style={styles.input}
        placeholder="New Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      {/* Update Password */}
      <TextInput
        style={styles.input}
        placeholder="New Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />

      {/* Update Button */}
      <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
        <Text style={styles.updateButtonText}>Update Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SecurityPage;