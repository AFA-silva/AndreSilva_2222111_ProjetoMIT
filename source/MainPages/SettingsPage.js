import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { getSettingsPageStyles } from '../Styles/MainPageStyles/SettingsPageStyle';

const SettingsPage = ({ navigation }) => {
  // State to manage dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Dynamically get styles based on dark mode state
  const styles = getSettingsPageStyles(isDarkMode);

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  const handleLogout = () => {
    navigation.navigate('Login'); // Navigate to the login page
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Perfil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Segurança</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={toggleDarkMode}>
        <Text style={styles.buttonText}>
          {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Notificações</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Ajuda e Suporte</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SettingsPage;