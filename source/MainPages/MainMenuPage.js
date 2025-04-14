import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Para ícones
import styles from '../Styles/MainPageStyles/MainMenuPageStyle';

const MainMenuPage = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu Principal</Text>
      <View style={styles.menuGrid}>
        {/* Exemplo de item do menu */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ProfilePage')}
        >
          <Ionicons name="person-outline" style={styles.menuIcon} />
          <Text style={styles.menuText}>Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('SettingsPage')}
        >
          <Ionicons name="settings-outline" style={styles.menuIcon} />
          <Text style={styles.menuText}>Configurações</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('SupportPage')}
        >
          <Ionicons name="help-circle-outline" style={styles.menuIcon} />
          <Text style={styles.menuText}>Suporte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('SecurityPage')}
        >
          <Ionicons name="lock-closed-outline" style={styles.menuIcon} />
          <Text style={styles.menuText}>Segurança</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MainMenuPage;