import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const NavigationBar = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [activeRoute, setActiveRoute] = useState('MainMenuPage');
  
  // Animation values
  const labelOpacity = useRef({
    MainMenuPage: new Animated.Value(0),
    ManagerPage: new Animated.Value(0),
    SettingsPage: new Animated.Value(0)
  }).current;

  // Set the active route based on the current route
  useEffect(() => {
    const routeName = route.name.includes('Stack') 
      ? route.params?.screen || 'MainMenuPage' 
      : route.name;
    
    // Handle animations
    Object.keys(labelOpacity).forEach(key => {
      Animated.timing(labelOpacity[key], {
        toValue: key === routeName ? 1 : 0,
        duration: 200,
        useNativeDriver: false
      }).start();
    });
    
    setActiveRoute(routeName);
  }, [route, labelOpacity]);

  // Check if a route is active
  const isRouteActive = (routeName) => {
    return activeRoute === routeName;
  };

  return (
    <View style={styles.navbarContainer}>
      <View style={styles.navbar}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('MainPages', { screen: 'MainMenuPage' })}
        >
          <View style={[
            styles.iconContainer,
            isRouteActive('MainMenuPage') && styles.activeIconContainer
          ]}>
            <Ionicons 
              name="home" 
              size={22} 
              color={isRouteActive('MainMenuPage') ? '#FFFFFF' : '#333333'} 
            />
          </View>
          <Animated.Text style={[
            styles.navText,
            { opacity: labelOpacity.MainMenuPage }
          ]}>Home</Animated.Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('MainPages', { screen: 'ManagerPage' })}
        >
          <View style={[
            styles.iconContainer,
            isRouteActive('ManagerPage') && styles.activeIconContainer
          ]}>
            <Ionicons 
              name="briefcase" 
              size={22} 
              color={isRouteActive('ManagerPage') ? '#FFFFFF' : '#333333'} 
            />
          </View>
          <Animated.Text style={[
            styles.navText,
            { opacity: labelOpacity.ManagerPage }
          ]}>Manager</Animated.Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('MainPages', { screen: 'SettingsPage' })}
        >
          <View style={[
            styles.iconContainer,
            isRouteActive('SettingsPage') && styles.activeIconContainer
          ]}>
            <Ionicons 
              name="settings" 
              size={22} 
              color={isRouteActive('SettingsPage') ? '#FFFFFF' : '#333333'} 
            />
          </View>
          <Animated.Text style={[
            styles.navText,
            { opacity: labelOpacity.SettingsPage }
          ]}>Settings</Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbarContainer: {
    backgroundColor: '#FFA726',
    paddingTop: 6,
    paddingBottom: 6,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    height: 52,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconContainer: {
    backgroundColor: '#FF9800',
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  navText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    position: 'absolute',
    bottom: -20,
  }
});

export default NavigationBar;