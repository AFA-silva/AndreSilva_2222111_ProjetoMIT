import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Para adicionar ícones
import styles from '../Styles/MainPageStyles/SettingsPageStyle';

const SettingsPage = ({ navigation }) => {
  const handleLogout = () => {
    navigation.navigate('Login'); // Navegar para a página de login
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Configurações</Text>

      {/* Seção de Perfil */}
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuRow}>
          <Ionicons name="person-circle-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Perfil</Text>
            <Text style={styles.menuItemSubtitle}>Gerencie sua conta e informações pessoais</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Seção de Preferências */}
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuRow}>
          <Ionicons name="settings-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Preferências</Text>
            <Text style={styles.menuItemSubtitle}>Personalize o app do seu jeito</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Seção de Segurança */}
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuRow}>
          <Ionicons name="lock-closed-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Segurança</Text>
            <Text style={styles.menuItemSubtitle}>Atualize sua senha e configurações de segurança</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Seção de Notificações */}
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuRow}>
          <Ionicons name="notifications-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Notificações</Text>
            <Text style={styles.menuItemSubtitle}>Gerencie as notificações do app</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Seção de Ajuda e Suporte */}
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuRow}>
          <Ionicons name="help-circle-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Ajuda e Suporte</Text>
            <Text style={styles.menuItemSubtitle}>Tire dúvidas e fale conosco</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Botão de Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SettingsPage;