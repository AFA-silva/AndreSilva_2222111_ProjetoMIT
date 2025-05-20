import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const NavigationBar = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [activeRoute, setActiveRoute] = useState('MainMenuPage');

  // Set the active route based on the current route
  useEffect(() => {
    const routeName = route.name.includes('Stack') 
      ? route.params?.screen || 'MainMenuPage' 
      : route.name;
    
    setActiveRoute(routeName);
  }, [route]);

  // Check if a route is active
  const isRouteActive = (routeName) => {
    return activeRoute === routeName;
  };

  return (
    <View style={styles.navbarContainer}>
      <View style={styles.navbar}>
        <TouchableOpacity 
          style={[styles.navItem, isRouteActive('MainMenuPage') && styles.activeNavItem]} 
          onPress={() => navigation.navigate('MainPages', { screen: 'MainMenuPage' })}
        >
          <View style={styles.iconBackground}>
            <Ionicons 
              name={isRouteActive('MainMenuPage') ? "home" : "home-outline"} 
              size={22} 
              color={isRouteActive('MainMenuPage') ? "#FF9800" : "#6B5B3D"} 
            />
          </View>
          <Text style={[styles.navText, isRouteActive('MainMenuPage') && styles.activeNavText]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, isRouteActive('ManagerPage') && styles.activeNavItem]} 
          onPress={() => navigation.navigate('MainPages', { screen: 'ManagerPage' })}
        >
          <View style={styles.iconBackground}>
            <Ionicons 
              name={isRouteActive('ManagerPage') ? "briefcase" : "briefcase-outline"} 
              size={22} 
              color={isRouteActive('ManagerPage') ? "#FF9800" : "#6B5B3D"} 
            />
          </View>
          <Text style={[styles.navText, isRouteActive('ManagerPage') && styles.activeNavText]}>Manager</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, isRouteActive('SettingsPage') && styles.activeNavItem]} 
          onPress={() => navigation.navigate('MainPages', { screen: 'SettingsPage' })}
        >
          <View style={styles.iconBackground}>
            <Ionicons 
              name={isRouteActive('SettingsPage') ? "settings" : "settings-outline"} 
              size={22} 
              color={isRouteActive('SettingsPage') ? "#FF9800" : "#6B5B3D"} 
            />
          </View>
          <Text style={[styles.navText, isRouteActive('SettingsPage') && styles.activeNavText]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbarContainer: {
    backgroundColor: '#FFF9E5',
    paddingTop: 8,
    paddingBottom: 6,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderTopWidth: 1,
    borderColor: '#FFE0B2',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 18,
  },
  iconBackground: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFECB3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  navText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5B3D',
    marginTop: 1,
  },
  activeNavItem: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  activeNavText: {
    color: '#FF9800',
    fontWeight: '700',
  },
});

export default NavigationBar;