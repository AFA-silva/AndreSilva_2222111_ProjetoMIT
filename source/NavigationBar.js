import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const NavigationBar = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const appState = useRef(AppState.currentState);
  
  // Estado que controla qual tab está ativa
  const [activeTab, setActiveTab] = useState('MainMenuPage');
  const [isInitialized, setIsInitialized] = useState(false);
  // Estado de loading para skeleton effect
  const [isLoading, setIsLoading] = useState(true);
  // Estado para forçar re-renderização
  const [forceRender, setForceRender] = useState(0);
  
  // Animation values para cada tab - Inicializar com valores fixos
  const tabAnimations = {
    MainMenuPage: useRef(new Animated.Value(1)).current,
    ManagerPage: useRef(new Animated.Value(0.8)).current,
    CalendarPage: useRef(new Animated.Value(0.8)).current,
    SettingsPage: useRef(new Animated.Value(0.8)).current
  };
  
  const navbarAnim = useRef(new Animated.Value(1)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  // No longer using getCurrentRouteName function

  // Função para fazer refresh da navbar
  const refreshNavbar = () => {
    setIsLoading(true);
    
    // Reset das animações mas mantendo valores visíveis
    navbarAnim.setValue(1);
    loadingAnim.setValue(0);
    
    // Garantir que os valores iniciais sejam visíveis
    const currentActiveTab = 'MainMenuPage'; // Default to MainMenuPage
    setActiveTab(currentActiveTab);
    
    Object.keys(tabAnimations).forEach(tab => {
      tabAnimations[tab].setValue(tab === currentActiveTab ? 1 : 0.8);
    });
    
    // Reiniciar as animações após um pequeno delay
    setTimeout(() => {
      initializeNavbar();
    }, 100);
  };
  
  // Função para inicializar a navbar
  const initializeNavbar = () => {
    // Reduzir o tempo de loading para melhorar a experiência do usuário
    setTimeout(() => {
      // Garantir que todos os botões estejam visíveis, independentemente do estado de loading
      const currentActiveTab = 'MainMenuPage'; // Always default to MainMenuPage when initializing
      setActiveTab(currentActiveTab);
      
      Object.keys(tabAnimations).forEach(tab => {
        tabAnimations[tab].setValue(tab === currentActiveTab ? 1 : 0.8);
      });
      
      setIsLoading(false);
      setIsInitialized(true);
      
      // Forçar uma re-renderização para garantir que os estilos sejam aplicados corretamente
      setForceRender(prev => prev + 1);
    }, 300);
  };

  // Monitora mudanças no estado do aplicativo (foreground, background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App voltou para o primeiro plano, forçar refresh
        refreshNavbar();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Inicialização após a montagem do componente
  useEffect(() => {
    // Forçar seleção do Home
    setActiveTab('MainMenuPage');
    // Garantir que todos os botões sejam visíveis inicialmente - sem animação de entrada
    Object.keys(tabAnimations).forEach(tab => {
      tabAnimations[tab].setValue(tab === 'MainMenuPage' ? 1 : 0.8);
    });
    // Iniciar com a navbar visível imediatamente
    navbarAnim.setValue(1);
    // Single optimized timeout to handle initialization
    setTimeout(() => {
      initializeNavbar();
      if (isLoading) {
        refreshNavbar();
      }
    }, 300);
  }, []);

  // Sincroniza o activeTab com a navegação usando evento de foco
  useFocusEffect(
    React.useCallback(() => {
      const state = navigation.getState();
      const activeRouteIndex = state.index;
      const activeRouteName = state.routes[activeRouteIndex].name;
      setActiveTab(activeRouteName);
      Object.keys(tabAnimations).forEach(tab => {
        Animated.timing(tabAnimations[tab], {
          toValue: tab === activeRouteName ? 1 : 0.8,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      });
    }, [navigation])
  );

  // Função para navegar para uma tab
  const navigateToTab = (tabName) => {
    navigation.navigate('MainPages', { screen: tabName });
    setActiveTab(tabName);
  };

  // Renderizar um botão de tab
  const renderTabButton = (tabName, iconName, label) => {
    const isActive = activeTab === tabName;
    const animValue = tabAnimations[tabName];
    const baseIconScale = 1;
    const baseIconTranslate = isActive ? -6 : 0;
    return (
      <TouchableOpacity 
        style={[styles.navItem, isActive && styles.activeNavItem]} 
        onPress={() => navigateToTab(tabName)}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonCircle} />
            <View style={styles.skeletonText} />
          </View>
        ) : (
          <>
            <Animated.View 
              style={{
                transform: [
                  { scale: baseIconScale },
                  { translateY: baseIconTranslate }
                ]
              }}
            >
              <Animated.View 
                style={[
                  styles.iconBackground,
                  {
                    backgroundColor: '#FFECB3'
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
            {isActive && (
              <Animated.Text 
                style={[
                  styles.navText, 
                  styles.activeNavText,
                  {
                    color: '#000',
                    opacity: animValue,
                    transform: [
                      { translateY: Animated.multiply(Animated.subtract(1, animValue), 10) }
                    ]
                  }
                ]}
                numberOfLines={1}
              >
                {label}
              </Animated.Text>
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.navbarContainer}>
      <View style={styles.navbarBackground}>
        <View style={styles.navbarGlow} />
      </View>
      
      <View style={styles.navbar}>
        {renderTabButton('MainMenuPage', 'home', 'Home')}
        {renderTabButton('ManagerPage', 'briefcase', 'Manager')}
        {renderTabButton('CalendarPage', 'calendar', 'Calendar')}
        {renderTabButton('SettingsPage', 'settings', 'Settings')}
      </View>
    </View>
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
    width: '100%',
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
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 70,
    width: '100%',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 16,
    position: 'relative',
    minWidth: width / 4,
    height: 64,
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFECB3',
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
    color: '#000',
    marginTop: 0,
    textAlign: 'center',
    position: 'absolute',
    bottom: 4,
    width: '100%',
    paddingHorizontal: 2,
  },
  activeNavItem: {
    backgroundColor: 'rgba(255, 152, 0, 0.05)',
  },
  activeNavText: {
    color: '#F9A825',
    fontWeight: '700',
  },
  skeletonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEEEEE',
    marginBottom: 8,
  },
  skeletonText: {
    width: 30,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EEEEEE',
    position: 'absolute',
    bottom: 4,
  }
});

export default NavigationBar;