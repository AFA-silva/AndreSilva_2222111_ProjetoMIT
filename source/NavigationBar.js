import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For icons
import { useNavigation } from '@react-navigation/native';

const NavigationBar = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.navbar}>
      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MainPages', { screen: 'MainMenuPage' })}>
        <Ionicons name="home-outline" size={24} color="#111" />
        <Text style={styles.navText}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MainPages', { screen: 'SettingsPage' })}>
        <Ionicons name="settings-outline" size={24} color="#111" />
        <Text style={styles.navText}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MainPages', { screen: 'ManagerPage' })}>
        <Ionicons name="briefcase-outline" size={24} color="#111" />
        <Text style={styles.navText}>Manager</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFA726',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.13,
    shadowRadius: 10,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 0,
    borderRadius: 14,
  },
  navText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 3,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255, 183, 77, 0.13)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activeNavItem: {
    backgroundColor: '#FFECB3',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeNavText: {
    color: '#FFA726',
  },
});

export default NavigationBar;