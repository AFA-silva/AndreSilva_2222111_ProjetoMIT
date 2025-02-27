import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const NavigationBar = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.navbar}>
      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MainPages', { screen: 'MainMenuPage' })}>
        <Image source={require('../assets/home.png')} style={styles.navIcon} />
        <Text style={styles.navText}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MainPages', { screen: 'SettingsPage' })}>
        <Image source={require('../assets/settings.png')} style={styles.navIcon} />
        <Text style={styles.navText}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MainPages', { screen: 'ManagerPage' })}>
        <Image source={require('../assets/manager.png')} style={styles.navIcon} />
        <Text style={styles.navText}>Manager</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f4c542', // Mantendo a cor amarela temática
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    width: 25,
    height: 25,
    tintColor: '#000', // Ícones pretos para melhor contraste
  },
  navText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 5,
  },
});

export default NavigationBar;
