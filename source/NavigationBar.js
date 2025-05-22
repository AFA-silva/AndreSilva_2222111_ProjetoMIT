import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const NavigationBar = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Estado que controla qual tab está ativa
  const [activeTab, setActiveTab] = useState('MainMenuPage');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Animation values para cada tab - Inicializar com valor base para garantir visibilidade
  const tabAnimations = {
    MainMenuPage: useRef(new Animated.Value(0.5)).current,
    ManagerPage: useRef(new Animated.Value(0.5)).current,
    SettingsPage: useRef(new Animated.Value(0.5)).current
  };
  
  const navbarAnim = useRef(new Animated.Value(0)).current;

  // Função para determinar qual rota está ativa
  const getCurrentRouteName = () => {
    try {
      // Se estamos em um stack navigator
      if (route.state) {
        const currentRouteName = route.state.routes[route.state.index].name;
        return currentRouteName;
      }
      
      // Para nested navigators
      if (route.params && route.params.screen) {
        return route.params.screen;
      }
      
      // Fallback para o nome da rota direta
      return route.name;
    } catch (error) {
      console.log('Error getting route name:', error);
      return 'MainMenuPage'; // Default fallback
    }
  };

  // Inicialização após a montagem do componente
  useEffect(() => {
    // Garantir que todos os botões sejam visíveis inicialmente
    Object.keys(tabAnimations).forEach(tab => {
      tabAnimations[tab].setValue(tab === 'MainMenuPage' ? 1 : 0.5);
    });
    
    // Marcar como inicializado para permitir animações futuras
    setIsInitialized(true);
  }, []);

  // Efeito para atualizar as animações quando a tab muda
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      // Verificar a rota atual a partir dos estados de navegação
      const state = navigation.getState();
      
      // Encontrar qual stack está ativa
      let activeRouteName = 'MainMenuPage';
      for (const r of state.routes) {
        if (r.name === 'MainPages' && r.state) {
          const activeRouteIndex = r.state.index;
          activeRouteName = r.state.routes[activeRouteIndex].name;
          break;
        }
      }
      
      setActiveTab(activeRouteName);
      
      // Animar as tabs
      const animateTab = (tab, toValue) => {
        Animated.timing(tabAnimations[tab], {
          toValue,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      };
      
      // Ativar a tab correta e desativar as outras
      Object.keys(tabAnimations).forEach(tab => {
        animateTab(tab, tab === activeRouteName ? 1 : 0.5);
      });
    } catch (error) {
      console.log('Error updating tab animations:', error);
      // Garantir que todos os botões permaneçam visíveis em caso de erro
      Object.keys(tabAnimations).forEach(tab => {
        tabAnimations[tab].setValue(tab === activeTab ? 1 : 0.5);
      });
    }
  }, [navigation.getState(), isInitialized]);

  // Animação inicial da navbar
  useEffect(() => {
    Animated.timing(navbarAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  // Função para navegar para uma tab
  const navigateToTab = (tabName) => {
    navigation.navigate('MainPages', { screen: tabName });
    setActiveTab(tabName);
  };

  // Renderizar um botão de tab
  const renderTabButton = (tabName, iconName, label) => {
    const isActive = activeTab === tabName;
    const animValue = tabAnimations[tabName];
    
    return (
      <TouchableOpacity 
        style={[styles.navItem, isActive && styles.activeNavItem]} 
        onPress={() => navigateToTab(tabName)}
        activeOpacity={0.7}
      >
        <Animated.View 
          style={{
            transform: [
              { 
                scale: animValue.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 0.9, 1]
                }) 
              },
              {
                translateY: animValue.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0, -6]
                })
              }
            ]
          }}
        >
          <Animated.View 
            style={[
              styles.iconBackground,
              {
                backgroundColor: animValue.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: ['#FFECB3', '#FFECB3', 'rgba(249, 168, 37, 0.15)']
                })
              }
            ]}
          >
            <Ionicons 
              name={isActive ? iconName : `${iconName}-outline`} 
              size={22} 
              color={isActive ? "#F9A825" : "#6B5B3D"} 
            />
          </Animated.View>
        </Animated.View>
        
        <Animated.Text 
          style={[
            styles.navText, 
            isActive && styles.activeNavText,
            {
              opacity: animValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0, 1]
              }),
              transform: [
                {
                  translateY: animValue.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [-5, 0, 0]
                  })
                }
              ]
            }
          ]}
        >
          {label}
        </Animated.Text>
        
        {isActive && (
          <View style={styles.activeIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View 
      style={[
        styles.navbarContainer,
        {
          transform: [
            { 
              translateY: navbarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              }) 
            }
          ],
          opacity: navbarAnim
        }
      ]}
    >
      <View style={styles.navbarBackground}>
        <View style={styles.navbarGlow} />
      </View>
      
      <View style={styles.navbar}>
        {renderTabButton('MainMenuPage', 'home', 'Home')}
        {renderTabButton('ManagerPage', 'briefcase', 'Manager')}
        {renderTabButton('SettingsPage', 'settings', 'Settings')}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  navbarContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 18 : 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#1E1E1E',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
    position: 'relative',
    zIndex: 10,
  },
  navbarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  navbarGlow: {
    position: 'absolute',
    width: width * 1.5,
    height: 150,
    backgroundColor: 'rgba(249, 168, 37, 0.03)',
    borderRadius: 100,
    top: -60,
    left: width / 2 - (width * 1.5) / 2,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 16,
    position: 'relative',
    minWidth: width / 5,
    height: 64,
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 168, 37, 0.15)',
    shadowColor: '#F9A825',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 8,
  },
  navText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B5B3D',
    marginTop: 0,
    textAlign: 'center',
    position: 'absolute',
    bottom: 4,
  },
  activeNavItem: {
    backgroundColor: 'rgba(255, 152, 0, 0.05)',
  },
  activeNavText: {
    color: '#F9A825',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    width: 16,
    height: 3,
    backgroundColor: '#F9A825',
    bottom: 0,
    borderRadius: 2,
  },
});

export default NavigationBar;