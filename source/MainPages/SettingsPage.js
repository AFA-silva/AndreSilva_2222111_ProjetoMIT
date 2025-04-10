import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For icons
import styles from '../Styles/MainPageStyles/SettingsPageStyle';

const SettingsPage = ({ navigation }) => {
  const handleLogout = () => {
    navigation.navigate('Login'); // Navigate to the login page
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Configurações</Text>

      {/* Profile Section */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('ProfilePage')} // Navigate to ProfilePage
      >
        <View style={styles.menuRow}>
          <Ionicons name="person-circle-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Perfil</Text>
            <Text style={styles.menuItemSubtitle}>Gerencie sua conta e informações pessoais</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Preferences Section */}
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuRow}>
          <Ionicons name="settings-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Preferências</Text>
            <Text style={styles.menuItemSubtitle}>Personalize o app do seu jeito</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Security Section */}
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuRow}>
          <Ionicons name="lock-closed-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Segurança</Text>
            <Text style={styles.menuItemSubtitle}>Atualize sua senha e configurações de segurança</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Notifications Section */}
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuRow}>
          <Ionicons name="notifications-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Notificações</Text>
            <Text style={styles.menuItemSubtitle}>Gerencie as notificações do app</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Help and Support Section */}
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuRow}>
          <Ionicons name="help-circle-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Ajuda e Suporte</Text>
            <Text style={styles.menuItemSubtitle}>Tire dúvidas e fale conosco</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SettingsPage;