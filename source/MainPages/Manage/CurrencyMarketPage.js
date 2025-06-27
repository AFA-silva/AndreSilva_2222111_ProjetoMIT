import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
  Image,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Switch,
  StyleSheet
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { fetchLatestRates, getSupportedCurrencies, convertCurrency } from '../../Utility/CurrencyService';
import { setCurrentCurrency, getCurrentCurrency } from '../../Utility/FetchCountries';
import Header from '../../Utility/Header';
import { LinearGradient } from 'expo-linear-gradient';
import styles from '../../Styles/MainPageStyles/CurrencyMarketPageStyle';
import { supabase } from '../../../Supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserCurrencyPreference, updateUserCurrencyPreference, convertAllFinancialData } from '../../Utility/MainQueries';
import SkeletonLoading, { CardSkeleton, TextRowSkeleton } from '../../Utility/SkeletonLoading';
import { ConfirmModal } from '../../Utility/Alerts';

// Helper function to apply box shadows in a cross-platform way
const applyBoxShadow = (params) => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${params.x}px ${params.y}px ${params.blur}px ${params.spread}px ${params.color}`
    };
  } else {
    return {
      shadowColor: params.color,
      shadowOffset: { width: params.x, height: params.y },
      shadowOpacity: params.opacity || 0.3,
      shadowRadius: params.blur / 2,
      elevation: params.android || 4,
    };
  }
};

// Custom currency converter skeleton component
const CurrencyConverterSkeleton = () => (
  <View style={styles.converterCard}>
    <View style={styles.converterInputRow}>
      <TextRowSkeleton lines={1} style={{ width: '30%' }} />
      <SkeletonLoading 
        variant="rounded"
        height={50}
        style={{ marginTop: 6 }}
      />
    </View>
    
    <View style={styles.currencySelectionContainer}>
      <View style={styles.currencySelectionRow}>
        <View style={styles.currencySelection}>
          <TextRowSkeleton lines={1} style={{ width: '30%' }} />
          <SkeletonLoading 
            variant="rounded"
            height={50}
            style={{ marginTop: 6 }}
          />
        </View>
        
        <SkeletonLoading 
          variant="rounded"
          width={44}
          height={44}
          style={{ marginHorizontal: 10 }}
        />
        
        <View style={styles.currencySelection}>
          <TextRowSkeleton lines={1} style={{ width: '30%' }} />
          <SkeletonLoading 
            variant="rounded"
            height={50}
            style={{ marginTop: 6 }}
          />
        </View>
      </View>
      
      <SkeletonLoading 
        variant="rounded"
        height={70}
        style={{ marginTop: 16 }}
      />
    </View>
    
    <View style={styles.popularCurrenciesContainer}>
      <TextRowSkeleton lines={1} style={{ width: '50%' }} />
      <View style={styles.chipsContainer}>
        <SkeletonLoading 
          variant="rounded"
          width={80}
          height={35}
          style={{ marginRight: 8, marginBottom: 8, borderRadius: 20 }}
        />
        <SkeletonLoading 
          variant="rounded"
          width={80}
          height={35}
          style={{ marginRight: 8, marginBottom: 8, borderRadius: 20 }}
        />
        <SkeletonLoading 
          variant="rounded"
          width={80}
          height={35}
          style={{ marginRight: 8, marginBottom: 8, borderRadius: 20 }}
        />
      </View>
    </View>
  </View>
);

// Custom currency list item skeleton
const CurrencyListItemSkeleton = () => (
  <Animated.View style={{ opacity: 1 }}>
    <View style={styles.currencyItem}>
      <View style={styles.currencyInfo}>
        <SkeletonLoading 
          variant="circular"
          width={44}
          height={44}
          style={{ marginRight: 12 }}
        />
        <View style={styles.currencyDetails}>
          <TextRowSkeleton lines={2} lastLineWidth="70%" />
        </View>
      </View>
      <View style={styles.rateContainer}>
        <TextRowSkeleton lines={2} lastLineWidth="50%" style={{ alignItems: 'flex-end' }} />
      </View>
    </View>
  </Animated.View>
);

// Currency list skeleton - renders multiple items
const CurrencyListSkeleton = ({ count = 5 }) => {
  const skeletons = [];
  for (let i = 0; i < count; i++) {
    skeletons.push(<CurrencyListItemSkeleton key={i} />);
  }
  return <>{skeletons}</>;
};

// Full page skeleton for initial loading
const FullPageSkeleton = () => (
  <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
    {/* Converter Section Skeleton */}
    <View style={styles.converterContainer}>
      <TextRowSkeleton lines={1} style={{ width: '60%', marginBottom: 12 }} />
      <TextRowSkeleton lines={1} style={{ width: '80%', marginBottom: 12 }} />
      <CurrencyConverterSkeleton />
    </View>
    
    {/* Currency List Section Skeleton */}
    <View style={styles.listContainer}>
      <View style={styles.listHeader}>
        <View style={styles.listHeaderTitles}>
          <TextRowSkeleton lines={1} style={{ width: '50%', marginBottom: 8 }} />
          <TextRowSkeleton lines={1} style={{ width: '70%' }} />
        </View>
        <SkeletonLoading 
          variant="rounded"
          width={48}
          height={48}
          style={{ borderRadius: 10 }}
        />
      </View>
      
      {/* Currency List Items Skeleton */}
      <CurrencyListSkeleton count={8} />
    </View>
  </ScrollView>
);

// Add new styles to the existing styles object
Object.assign(styles, {
  loadMoreButton: {
    flexDirection: 'row',
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    alignSelf: 'center',
    shadowColor: '#FF8F00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Set main currency button styles
  setMainCurrencyButton: {
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#388E3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  setMainCurrencyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  setMainCurrencyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Currency tip text style
  currencyTipText: {
    fontSize: 12,
    color: '#718096',
    fontStyle: 'italic',
    marginLeft: 6,
    flex: 1,
  },
  
  // Tip container style
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.05)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  
  // Add new currency symbol container style
  modalCurrencySymbolContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden'
  },
  
  // Ajustes para os botões existentes
  currencySelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 90,
    shadowColor: '#718096',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  
  swapButton: {
    backgroundColor: '#FFF5E6',
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    shadowColor: '#FF8F00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  
  searchButton: {
    backgroundColor: '#FFF5E6',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    shadowColor: '#FF8F00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  
  popularCurrencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  clickableCurrencyChip: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#FF9800',
    backgroundColor: 'transparent',
  },
  
  selectedPopularCurrency: {
    backgroundColor: '#FF9800',
    borderColor: '#F57C00',
    shadowColor: '#FF8F00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },

  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },

  actionBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...applyBoxShadow({
      x: 0,
      y: -3,
      blur: 8,
      spread: 0,
      color: '#1A365D1A',
      opacity: 0.1,
      android: 8
    }),
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  actionButtonHalf: {
    width: '48%',
  },
  actionButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
});

const { width, height } = Dimensions.get('window');
const ITEM_HEIGHT = 90; // Altura aproximada de cada item de moeda
const CARD_HEIGHT = 220; // Altura do card do conversor

const CurrencyMarketPage = ({ navigation }) => {
  const [baseCurrency, setBaseCurrency] = useState(null); // Start with null to prevent initial API call
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [amount, setAmount] = useState('1');
  const [rates, setRates] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [allCurrencies, setAllCurrencies] = useState([]); // Add this state for full currency list
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState(''); // Search for modal
  const [currencyListModalVisible, setCurrencyListModalVisible] = useState(false); // New modal for currency list
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [userCurrencyName, setUserCurrencyName] = useState('');
  const [isUpdatingGlobal, setIsUpdatingGlobal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currencySelectionType, setCurrencySelectionType] = useState('base'); // 'base' ou 'target'
  const [isInitialized, setIsInitialized] = useState(false); // Track if user preferences are loaded
  
  // Add ref to track component mount status
  const isMountedRef = useRef(true);
  const [convertedResult, setConvertedResult] = useState({
    from: { code: '', amount: 1, symbol: '' },
    to: { code: 'EUR', amount: 0, symbol: '€' }
  });
  const [userPreferredCurrency, setUserPreferredCurrency] = useState(null);
  const [currencyLimit, setCurrencyLimit] = useState(10); // Novo estado para controlar o limite de moedas
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Estado para controlar carregamento adicional
  const [isConverterLoading, setIsConverterLoading] = useState(false); // New state for converter loading
  const [isCurrencyListLoading, setIsCurrencyListLoading] = useState(false); // New state for currency list loading
  
  // Novos estados para o modal de confirmação de moeda
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [convertValues, setConvertValues] = useState(true);
  const [pendingCurrencyChange, setPendingCurrencyChange] = useState(null);
  
  // Novo estado para moedas salvas pelo usuário
  const [savedCurrencies, setSavedCurrencies] = useState([]);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  
  // Custom alert modal states
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'info',
    title: '',
    message: '',
    buttons: []
  });
  
  // Refs para animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const converterScaleAnim = useRef(new Animated.Value(0.95)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Moedas populares com seus símbolos - transformaremos em moedas salvas
  const defaultPopularCurrencies = [];  // Removendo as moedas populares padrão

  // Estado para as moedas salvas (inicialmente populares)
  const [popularCurrencies, setPopularCurrencies] = useState(defaultPopularCurrencies);

  // Carregar a moeda preferida do usuário ao montar
  useEffect(() => {
    let isMounted = true;
    
    const loadUserPreferences = async () => {
      try {
        // Tentar carregar a moeda do usuário apenas do Supabase
        let userCurrency = null;
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user && isMounted) {
            // Fetch user preferences from database
            const { data, error } = await supabase
              .from('user_currency_preferences')
              .select('actual_currency')
              .eq('user_id', user.id)
              .maybeSingle();
              
            if (!error && data && data.actual_currency) {
              userCurrency = data.actual_currency;
              console.log('Currency loaded from database:', userCurrency);
            } else {
                              // If not found in database, use default value 'USD'
              userCurrency = 'USD';
                              console.log('No currency preference found, using default:', userCurrency);
              
              // Criar registro com valor padrão
              if (user && isMounted) {
                const { error: insertError } = await supabase
                  .from('user_currency_preferences')
                  .upsert({ 
                    user_id: user.id,
                    actual_currency: userCurrency
                  });
                  
                if (insertError) {
                  console.error('Error creating currency preference:', insertError);
                }
              }
            }
          } else {
            // Se usuário não estiver logado, usar USD padrão
            userCurrency = 'USD';
          }
        } catch (dbError) {
          console.error('Error loading currency from database:', dbError);
          // Fallback para valor padrão
          userCurrency = 'USD';
        }
        
        // Definir a moeda base com a preferência do usuário
        if (userCurrency && isMounted) {
          setBaseCurrency(userCurrency);
          setUserPreferredCurrency(userCurrency);
          // Guardar para comparação quando sair da página
          initialUserCurrency.current = userCurrency;
          // Mark as initialized to allow data loading
          setIsInitialized(true);
        }

        // Inicializar moedas salvas do AsyncStorage
        if (isMounted) {
          try {
            const savedCurrenciesData = await AsyncStorage.getItem('user_saved_currencies');
            if (savedCurrenciesData) {
              const parsedCurrencies = JSON.parse(savedCurrenciesData);
              setSavedCurrencies(Array.isArray(parsedCurrencies) ? parsedCurrencies : []);
            } else {
              setSavedCurrencies([]);
            }
          } catch (storageError) {
            console.error('Erro ao carregar moedas salvas do AsyncStorage:', storageError);
            setSavedCurrencies([]);
          }
        }
      } catch (error) {
        console.error("Error loading user preferences:", error);
        if (isMounted) {
          setSavedCurrencies([]);
        }
      }
    };
    
    loadUserPreferences();
    
    // Cleanup function
    return () => {
      isMounted = false;
      // Don't call async functions in cleanup - they can cause memory leaks
      // verifyAndSaveCurrencyChange() should be called elsewhere when needed
    };
  }, []);
  
  // Referência para armazenar a moeda inicial do usuário para comparação
  const initialUserCurrency = useRef(null);
  
  // Função para verificar e salvar mudança de moeda ao sair da página
  const verifyAndSaveCurrencyChange = async () => {
    try {
      // If current currency is different from initial, update in database
      if (initialUserCurrency.current && 
          userPreferredCurrency && 
          initialUserCurrency.current !== userPreferredCurrency) {
        
        console.log(`Moeda alterada: ${initialUserCurrency.current} → ${userPreferredCurrency}`);
        
        // Use centralized function to update currency in database
        const success = await updateUserCurrencyPreference(userPreferredCurrency);
        
        if (success) {
          console.log('Currency updated in database successfully via verifyAndSaveCurrencyChange');
        } else {
                      console.error('Error updating currency in database via verifyAndSaveCurrencyChange');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar mudança de moeda:', error);
    }
  };

  // Carregar taxas de câmbio e moedas suportadas
  useEffect(() => {
    // Only load data if baseCurrency is set and component is initialized
    if (!baseCurrency || !isInitialized) return;
    
    let isMounted = true;
    
    const loadDataSafely = async () => {
      try {
        await loadData();
      } catch (error) {
        if (isMounted) {
          console.error('Error loading data:', error);
        }
      }
    };
    
    loadDataSafely();
    
    return () => {
      isMounted = false;
    };
  }, [baseCurrency, isInitialized]);

  // Atualizar moedas populares quando a lista de moedas for carregada
  useEffect(() => {
    if (currencies.length > 0) {
      updatePopularCurrencies();
    }
  }, [currencies, userPreferredCurrency]);

  // Atualizar resultado da conversão quando valores mudam
  useEffect(() => {
    if (!loading && rates) {
      updateConversion();
    }
  }, [amount, baseCurrency, targetCurrency, rates]);

  // Iniciar animações quando o carregamento for concluído
  useEffect(() => {
    if (!loading) {
      startEntryAnimations();
    }
  }, [loading]);

  // Animar pontos de carregamento usando um timer em vez de Animated
  useEffect(() => {
    if (loading) {
      let dotCount = 0;
      const interval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        setLoadingDots('.'.repeat(dotCount));
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Iniciar a animação de rotação para o ícone de carregamento
  useEffect(() => {
    if (loading) {
      // Iniciar animação de rotação
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
          easing: Easing.linear,
        })
      ).start();
    } else {
      // Resetar a animação quando o carregamento terminar
      spinAnim.setValue(0);
    }
  }, [loading]);

  // Estado para os pontos de carregamento
  const [loadingDots, setLoadingDots] = useState('');

  // Função para iniciar as animações de entrada
  const startEntryAnimations = () => {
    // Resetar animações
    fadeAnim.setValue(0);
    converterScaleAnim.setValue(0.95);
    
    // Executar sequência de animações
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(converterScaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();
  };

  // Animação de rotação para ícone de refresh
  const startSpinAnimation = () => {
    spinAnim.setValue(0);
    
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: Platform.OS !== 'web',
      easing: Easing.linear,
    }).start();
  };

  // Animação de sucesso ao definir moeda global
  const startSuccessAnimation = () => {
    successAnim.setValue(0);
    
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.back(2)),
      }),
      Animated.delay(1000),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  };

  // Interpolações para animações
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const successScale = successAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1],
  });

  // Helper function to calculate conversion with minimum value logic
  const calculateOptimalConversion = (fromAmount, fromCurrency, toCurrency, exchangeRates) => {
    if (!exchangeRates || !fromCurrency || !toCurrency) return { from: fromAmount, to: 0 };
    
    // Calculate normal conversion
    const normalConversion = convertCurrency(fromAmount, fromCurrency, toCurrency, exchangeRates);
    
    // If converted amount is less than 0.01, calculate the minimum "from" amount needed for 0.01 "to"
    if (normalConversion < 0.01 && normalConversion > 0) {
      const rate = exchangeRates[toCurrency];
      if (rate && rate > 0) {
        // Calculate how much "from" currency is needed to get 0.01 "to" currency
        const minFromAmount = 0.01 / rate;
        let adjustedFromAmount = parseFloat(minFromAmount.toFixed(2));
        
        // If rounding to 2 decimals results in 0.00, use 0.01 as minimum
        if (adjustedFromAmount === 0.00) {
          adjustedFromAmount = 0.01;
        }
        
        return {
          from: adjustedFromAmount,
          to: 0.01,
          adjusted: true // Flag to indicate this was adjusted
        };
      }
    }
    
    return {
      from: fromAmount,
      to: normalConversion,
      adjusted: false
    };
  };

  // Função para calcular o resultado da conversão
  const updateConversion = () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    
    const inputValue = parseFloat(amount);
    const conversion = calculateOptimalConversion(inputValue, baseCurrency, targetCurrency, rates);
    
    setConvertedResult({
      from: {
        code: baseCurrency,
        amount: conversion.from,
        symbol: getCurrencySymbol(baseCurrency),
        adjusted: conversion.adjusted
      },
      to: {
        code: targetCurrency,
        amount: conversion.to,
        symbol: getCurrencySymbol(targetCurrency)
      }
    });
  };

  // Create a function to handle baseCurrency change
  const handleBaseCurrencyChange = (newBaseCurrency) => {
    if (newBaseCurrency === baseCurrency) return;
    
    setIsConverterLoading(true);
    setIsCurrencyListLoading(true);
    
    // Set the new base currency
    setBaseCurrency(newBaseCurrency);
  };

  const loadData = async () => {
    try {
      // Don't load if baseCurrency is not set yet
      if (!baseCurrency) {
        console.log('loadData: baseCurrency not set yet, skipping...');
        return;
      }
      
      if (!isConverterLoading && !isCurrencyListLoading && isMountedRef.current) {
        setLoading(true);
      }
      
      console.log('loadData: Loading data for baseCurrency:', baseCurrency);
      
      // Buscar taxas de câmbio para a moeda base
      const exchangeRates = await fetchLatestRates(baseCurrency);
      if (!isMountedRef.current) return;
      
      // Cache the rates for faster future swaps
      ratesCache.current[baseCurrency] = exchangeRates;
      
      setRates(exchangeRates);
      
      // Buscar lista de moedas suportadas
      const supportedCurrencies = await getSupportedCurrencies();
      if (!isMountedRef.current) return;
      
      // Store all currencies
      setAllCurrencies(supportedCurrencies);
      // Limitar para currencyLimit moedas para melhor performance
      setCurrencies(supportedCurrencies.slice(0, currencyLimit));
      
      // Encontrar o nome da moeda atual do usuário
      const currencyDetails = supportedCurrencies.find(c => c.code === baseCurrency);
      if (currencyDetails && isMountedRef.current) {
        setUserCurrencyName(currencyDetails.name);
      }
      
      // Force initial conversion calculation
      if (exchangeRates && isMountedRef.current) {
        const inputValue = parseFloat(amount);
        const conversion = calculateOptimalConversion(inputValue, baseCurrency, targetCurrency, exchangeRates);
        
        setConvertedResult({
          from: {
            code: baseCurrency,
            amount: conversion.from,
            symbol: getCurrencySymbol(baseCurrency),
            adjusted: conversion.adjusted
          },
          to: {
            code: targetCurrency,
            amount: conversion.to,
            symbol: getCurrencySymbol(targetCurrency)
          }
        });
      }
      
      if (isMountedRef.current) {
        setLoading(false);
        setIsConverterLoading(false);
        setIsCurrencyListLoading(false);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setLoading(false);
        setIsConverterLoading(false);
        setIsCurrencyListLoading(false);
        Alert.alert('Error', 'Failed to load currency data. Please try again later.');
      }
      console.error(error);
    }
  };

  // Nova função para carregar mais moedas
  const loadMoreCurrencies = async () => {
    try {
      setIsLoadingMore(true);
      const newLimit = currencyLimit + 10;
      setCurrencyLimit(newLimit);
      // Use allCurrencies instead of fetching again
      setCurrencies(allCurrencies.slice(0, newLimit));
      setIsLoadingMore(false);
    } catch (error) {
      setIsLoadingMore(false);
      Alert.alert('Error', 'Failed to load more currencies. Please try again.');
      console.error(error);
    }
  };

  // Atualizar a lista de moedas populares para incluir a moeda do usuário
  const updatePopularCurrencies = () => {
    // Não fazer nada se não tivermos moedas ainda
    if (!currencies || currencies.length === 0) return;

    // Encontrar a moeda preferida do usuário
    if (userPreferredCurrency) {
      const userCurrencyDetails = currencies.find(c => c.code === userPreferredCurrency);
      
      if (userCurrencyDetails) {
        // Criar uma array com as moedas populares padrão
        const updatedPopularCurrencies = [...defaultPopularCurrencies];
        
        // Verificar se a moeda preferida do usuário já está nas populares
        const existingIndex = updatedPopularCurrencies.findIndex(
          c => c.code === userPreferredCurrency
        );
        
        // Se já existe, apenas marque-a como a moeda do usuário
        if (existingIndex >= 0) {
          updatedPopularCurrencies[existingIndex] = {
            ...updatedPopularCurrencies[existingIndex],
            isUserCurrency: true
          };
        } 
        // Se não existe, adicione-a no início
        else {
          updatedPopularCurrencies.unshift({
            code: userPreferredCurrency,
            symbol: getCurrencySymbol(userPreferredCurrency),
            name: userCurrencyDetails.name || 'My Currency',
            isUserCurrency: true
          });
          
          // Limitar a 5 moedas (a do usuário + 4 das populares)
          if (updatedPopularCurrencies.length > 5) {
            updatedPopularCurrencies.pop();
          }
        }
        
        setPopularCurrencies(updatedPopularCurrencies);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    startSpinAnimation();
    await loadData();
    setRefreshing(false);
  };

  const handleCurrencySelect = (currency) => {
    // Allow deselecting if the same currency is clicked again
    if (selectedCurrency && selectedCurrency.code === currency.code) {
      setSelectedCurrency(null);
      return;
    }
    
    // Não permitir seleção da moeda base atual
    if (currency.code === baseCurrency) {
      showStyledAlert('info', 'Already Selected', `${currency.code} is already your base currency.`);
      return;
    }
    
    setSelectedCurrency(currency);
  };

  const handleSetAsPrimary = async () => {
    if (selectedCurrency) {
      try {
        // Em vez de atualizar imediatamente, mostrar o modal de confirmação
        setPendingCurrencyChange(selectedCurrency);
        setConfirmModalVisible(true);
      } catch (error) {
        console.error('Erro ao preparar mudança de moeda:', error);
        Alert.alert('Error', 'Failed to prepare currency change.');
      }
    }
  };

  // Nova função para confirmar a mudança de moeda
  const confirmCurrencyChange = async () => {
    if (!pendingCurrencyChange) return;
    
    try {
      setIsUpdatingGlobal(true);
      setConfirmModalVisible(false);
      
      // Obter a moeda atual para usar como moeda anterior
      const currentCurrency = getCurrentCurrency();
      console.log(`---------------------------------------`);
      console.log(`CHANGING CURRENCY: ${currentCurrency.code} → ${pendingCurrencyChange.code}`);
      console.log(`Convert values? ${convertValues ? 'YES' : 'NO'}`);
      
      // Verificar se já não está usando a mesma moeda
      if (currentCurrency.code === pendingCurrencyChange.code) {
        console.log('Same currency selected, no change needed');
        setIsUpdatingGlobal(false);
        showStyledAlert('info', 'Same Currency', 'This currency is already selected.');
        setPendingCurrencyChange(null);
        return;
      }
      
      // Atualizar o estado local primeiro
      setUserPreferredCurrency(pendingCurrencyChange.code);
      setBaseCurrency(pendingCurrencyChange.code);
      
      // Se a opção de converter valores estiver marcada, converter todos os dados financeiros
      if (convertValues) {
        console.log('Converting all financial data...');
        try {
          // Usar a função centralizada para conversão
          const result = await convertAllFinancialData(
            currentCurrency.code, 
            pendingCurrencyChange.code
          );
          
          if (result) {
            console.log('Financial data conversion successful');
          } else {
            console.error('Financial data conversion failed');
            Alert.alert(
              'Conversion Warning',
              'There was an issue converting your financial data. Some values may not have been updated correctly.',
              [{ text: 'OK' }]
            );
          }
        } catch (conversionError) {
          console.error('Error converting financial data:', conversionError);
          Alert.alert(
            'Conversion Error',
            'Failed to convert financial data. You may need to manually update your values.',
            [{ text: 'OK' }]
          );
        }
      } else {
        console.log('Currency change without value conversion');
      }
      
      // Atualizar a moeda global do aplicativo
      const currencyDetails = allCurrencies.find(c => c.code === pendingCurrencyChange.code) || 
                             currencies.find(c => c.code === pendingCurrencyChange.code);
      
      console.log('Looking for currency details for:', pendingCurrencyChange.code);
      console.log('Available in allCurrencies:', allCurrencies.some(c => c.code === pendingCurrencyChange.code));
      console.log('Available in currencies:', currencies.some(c => c.code === pendingCurrencyChange.code));
      console.log('Found currency details:', currencyDetails ? currencyDetails.name : 'NOT FOUND');
      
      if (currencyDetails) {
        const globalCurrency = {
          code: pendingCurrencyChange.code,
          name: currencyDetails.name,
          symbol: getCurrencySymbol(pendingCurrencyChange.code),
          convertValues: convertValues,
          previousCurrency: currentCurrency.code
        };
        
        // Atualizar a moeda global
        console.log('Updating global currency:', globalCurrency);
        const updateResult = await setCurrentCurrency(globalCurrency); // Isso agora atualiza TANTO AsyncStorage QUANTO Supabase
        console.log('setCurrentCurrency result:', updateResult);
        
        setUserCurrencyName(currencyDetails.name);
        
        console.log('Global currency updated successfully');
      } else {
        console.error('Currency details not found for:', pendingCurrencyChange.code);
        console.log('All available currencies:', allCurrencies.map(c => c.code).join(', '));
        throw new Error('Currency details not found');
      }
      
      // Atualizar as moedas populares para mostrar a nova moeda do usuário
      updatePopularCurrencies();
      
      // Limpar estados
      setSelectedCurrency(null);
      setPendingCurrencyChange(null);
      
      // Mostrar animação de sucesso
      startSuccessAnimation();
      setIsUpdatingGlobal(false);
      
      // Mostrar feedback ao usuário
      Alert.alert(
        'Currency Updated', 
        `${pendingCurrencyChange.code} is now your primary currency${convertValues ? ' and values have been converted' : ' (keeping original values)'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error changing currency:', error);
      setIsUpdatingGlobal(false);
      setConfirmModalVisible(false);
      setPendingCurrencyChange(null);
      Alert.alert('Error', `Failed to set primary currency: ${error.message}`);
    }
  };

  const openCurrencyListModal = () => {
    setCurrencyListModalVisible(true);
  };

  // Abrir modal para selecionar moeda
  const openCurrencySelector = (type) => {
    setCurrencySelectionType(type);
    setModalSearchQuery(''); // Reset modal search when opening
    setModalVisible(true);
  };

  // Selecionar moeda do modal
  const selectCurrencyFromModal = (currency) => {
    // Don't reload if selecting the same currency
    if (currencySelectionType === 'base' && currency.code === baseCurrency) {
      setModalSearchQuery(''); // Reset search
      setModalVisible(false);
      return;
    }
    if (currencySelectionType === 'target' && currency.code === targetCurrency) {
      setModalSearchQuery(''); // Reset search
      setModalVisible(false);
      return;
    }
    
    if (currencySelectionType === 'base') {
      setIsConverterLoading(true);
      setIsCurrencyListLoading(true);
      setBaseCurrency(currency.code);
    } else {
      setIsConverterLoading(true);
      setTargetCurrency(currency.code);
      
      // Immediately update conversion for target currency changes
      if (rates) {
        const inputValue = parseFloat(amount);
        const conversion = calculateOptimalConversion(inputValue, baseCurrency, currency.code, rates);
        
        setConvertedResult({
          from: {
            code: baseCurrency,
            amount: conversion.from,
            symbol: getCurrencySymbol(baseCurrency),
            adjusted: conversion.adjusted
          },
          to: {
            code: currency.code,
            amount: conversion.to,
            symbol: getCurrencySymbol(currency.code)
          }
        });
        
        // Hide loading after a short delay for visual feedback
        setTimeout(() => {
          setIsConverterLoading(false);
        }, 300);
      }
    }
    
    setModalSearchQuery(''); // Reset search when closing
    setModalVisible(false);
  };

  // Cache para otimizar swaps
  const ratesCache = useRef({});

  // Function to format amount input to 2 decimal places
  const formatAmountInput = (value) => {
    // Remove any non-numeric characters except decimal point
    let cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Allow only one decimal point
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      cleanValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      cleanValue = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return cleanValue;
  };

  // Trocar as moedas base e alvo - versão otimizada
  const swapCurrencies = async () => {
    setIsConverterLoading(true);
    
    const tempCode = baseCurrency;
    const tempSymbol = getCurrencySymbol(baseCurrency);
    
    // Swap the currencies
    const newBaseCurrency = targetCurrency;
    const newTargetCurrency = tempCode;
    
    setBaseCurrency(newBaseCurrency);
    setTargetCurrency(newTargetCurrency);
    
    try {
      // Try to get rates from cache first
      let newRates = ratesCache.current[newBaseCurrency];
      
      if (!newRates) {
        // If not in cache, fetch from API
        console.log('Fetching rates for swap to:', newBaseCurrency);
        newRates = await fetchLatestRates(newBaseCurrency);
        // Cache the rates
        ratesCache.current[newBaseCurrency] = newRates;
      } else {
        console.log('Using cached rates for:', newBaseCurrency);
      }
      
      // Update rates state
      setRates(newRates);
      
      // Immediately calculate and update the conversion with the new rates
      if (newRates && amount) {
        const inputValue = parseFloat(amount);
        const conversion = calculateOptimalConversion(inputValue, newBaseCurrency, newTargetCurrency, newRates);
        
        setConvertedResult({
          from: {
            code: newBaseCurrency,
            amount: conversion.from,
            symbol: getCurrencySymbol(newBaseCurrency),
            adjusted: conversion.adjusted
          },
          to: {
            code: newTargetCurrency,
            amount: conversion.to,
            symbol: getCurrencySymbol(newTargetCurrency)
          }
        });
      }
      
      // Set loading to false with minimal delay for visual feedback
      setTimeout(() => {
        setIsConverterLoading(false);
        setIsCurrencyListLoading(false);
      }, 100); // Much faster than 10 seconds!
      
    } catch (error) {
      console.error('Error during currency swap:', error);
      // Fallback to full reload if optimized swap fails
      setIsCurrencyListLoading(true);
      setTimeout(() => {
        setIsConverterLoading(false);
        setIsCurrencyListLoading(false);
      }, 300);
    }
  };

  const filteredCurrencies = React.useMemo(() => {
    let sourceList = currencies;
    
    // If there's a search query, filter the currencies
    if (modalSearchQuery && modalSearchQuery.trim()) {
      const query = modalSearchQuery.toLowerCase().trim();
      
      sourceList = allCurrencies.filter(currency => {
        // Special case for common currency names
        if (query === 'dollar' && currency.code === 'USD') return true;
        if (query === 'euro' && currency.code === 'EUR') return true;
        if (query === 'pound' && currency.code === 'GBP') return true;
        if (query === 'yen' && currency.code === 'JPY') return true;
        
        // Check if the currency code or name matches
        const basicMatch = (
          currency.code.toLowerCase().includes(query) ||
          (currency.name && currency.name.toLowerCase().includes(query))
        );
        
        if (basicMatch) return true;
        
        // Check if any country matches (if countries array exists)
        if (currency.countries && currency.countries.length > 0) {
          return currency.countries.some(country => 
            country.toLowerCase().includes(query)
          );
        }
        
        return false;
      });
    }
    
    return sourceList.sort((a, b) => {
      // First priority: Saved currencies at the very top
      const aIsSaved = savedCurrencies.some(c => c.code === a.code);
      const bIsSaved = savedCurrencies.some(c => c.code === b.code);
      
      if (aIsSaved && !bIsSaved) return -1;
      if (!aIsSaved && bIsSaved) return 1;
      
      // Second priority: User preferred currency
      if (a.code === userPreferredCurrency) return -1;
      if (b.code === userPreferredCurrency) return 1;
      
      // Third priority: Currently selected base currency
      if (a.code === baseCurrency) return -1;
      if (b.code === baseCurrency) return 1;
      
      // Finally sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [currencies, allCurrencies, modalSearchQuery, userPreferredCurrency, savedCurrencies, baseCurrency]);

  // Separate filtered currencies for modal
  const modalFilteredCurrencies = React.useMemo(() => {
    // Always use all currencies for modal search
    const sourceList = allCurrencies;
    
    return sourceList.filter(currency => {
      if (!modalSearchQuery) return true;
      
      const query = modalSearchQuery.toLowerCase().trim();
      
      // Special case for common currency names
      if (query === 'dollar' && currency.code === 'USD') return true;
      if (query === 'euro' && currency.code === 'EUR') return true;
      if (query === 'pound' && currency.code === 'GBP') return true;
      if (query === 'yen' && currency.code === 'JPY') return true;
      
      // Check if the currency code or name matches
      const basicMatch = (
        currency.code.toLowerCase().includes(query) ||
        (currency.name && currency.name.toLowerCase().includes(query))
      );
      
      if (basicMatch) return true;
      
      // Check if any country matches (if countries array exists)
      if (currency.countries && currency.countries.length > 0) {
        return currency.countries.some(country => 
          country.toLowerCase().includes(query)
        );
      }
      
      return false;
    })
    .sort((a, b) => {
      // First priority: Saved currencies at the very top
      const aIsSaved = savedCurrencies.some(c => c.code === a.code);
      const bIsSaved = savedCurrencies.some(c => c.code === b.code);
      
      if (aIsSaved && !bIsSaved) return -1;
      if (!aIsSaved && bIsSaved) return 1;
      
      // Second priority: User preferred currency
      if (a.code === userPreferredCurrency) return -1;
      if (b.code === userPreferredCurrency) return 1;
      
      // Third priority: Currently selected base currency
      if (a.code === baseCurrency) return -1;
      if (b.code === baseCurrency) return 1;
      
      // Finally sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [allCurrencies, modalSearchQuery, userPreferredCurrency, baseCurrency, targetCurrency, currencySelectionType]);

  // Obter símbolo da moeda
  const getCurrencySymbol = (code) => {
    const popularCurrency = [...defaultPopularCurrencies, ...currencies].find(c => c.code === code);
    return popularCurrency?.symbol || code;
  };

  // Renderizar chip de moeda popular
  const renderPopularCurrency = (currency) => {
    const isSelected = baseCurrency === currency.code;
    const isUserCurrency = currency.isUserCurrency || false;
    
    return (
      <TouchableOpacity
        key={currency.code}
        style={[
          styles.popularCurrencyChip,
          isSelected && { 
            backgroundColor: `${getIconColor(currency.code)}22`,  // Use transparent version of the currency color
            borderColor: getIconColor(currency.code)
          },
          isUserCurrency && styles.userCurrencyChip,
          !isSelected && styles.clickableCurrencyChip
        ]}
        onPress={() => handleBaseCurrencyChange(currency.code)}
        disabled={isSelected}
      >
        {isUserCurrency && (
          <Ionicons name="star" size={12} color="#FF9800" style={styles.userCurrencyIcon} />
        )}
        <Text style={[
          styles.popularCurrencySymbol,
          isSelected && { color: getIconColor(currency.code) }
        ]}>
          {currency.symbol || currency.code}
        </Text>
        <Text style={[
          styles.popularCurrencyCode,
          isSelected && { color: getIconColor(currency.code) }
        ]}>
          {currency.code}
        </Text>
      </TouchableOpacity>
    );
  };
  
  // Add a memoized convertedAmount function to prevent recalculations
  const memoizedConvertedAmount = useMemo(() => {
    return (targetCurrencyCode) => {
      if (!rates || !amount || isNaN(amount) || !baseCurrency) return '0.00';
      
      const convertedValue = convertCurrency(parseFloat(amount), baseCurrency, targetCurrencyCode, rates);
      return convertedValue ? convertedValue.toFixed(2) : '0.00';
    };
  }, [rates, amount, baseCurrency]);

  // Update the renderCurrencyItem to show better visual feedback for selected items
  const renderCurrencyItem = ({ item, index }) => {
    const isSelected = selectedCurrency && selectedCurrency.code === item.code;
    const isBaseCurrency = baseCurrency === item.code;
    const isUserPreferred = userPreferredCurrency === item.code;
    const isSaved = savedCurrencies.some(c => c.code === item.code);
    
    // Get the primary country if available
    const primaryCountry = item.countries && item.countries.length > 0 ? item.countries[0] : null;
    
    const itemAnimStyle = {
      opacity: fadeAnim,
    };
    
    return (
      <Animated.View style={itemAnimStyle}>
        <TouchableOpacity
          style={[
            styles.currencyItem,
            isSelected && styles.selectedItem,
            isBaseCurrency && styles.baseCurrencyItem,
            isUserPreferred && styles.userPreferredItem,
            isSaved && styles.savedCurrencyItem
          ]}
          onPress={() => handleCurrencySelect(item)}
          disabled={false} // Remove disabled to allow deselecting
          activeOpacity={0.7}
        >
          <View style={styles.currencyInfo}>
            <View style={[
              styles.currencyIconContainer,
              { backgroundColor: `${getIconColor(item.code)}22` } // Color with transparency
            ]}>
              <Text style={[
                styles.currencySymbol,
                { color: getIconColor(item.code) }
              ]}>
                {getCurrencySymbol(item.code)}
              </Text>
            </View>
            <View style={styles.currencyDetails}>
              <Text style={styles.currencyCode}>{item.code}</Text>
              <Text style={styles.currencyName} numberOfLines={1}>
                {item.name}
                {primaryCountry ? ` • ${primaryCountry}` : ''}
              </Text>
            </View>
            {isBaseCurrency && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>Selected</Text>
              </View>
            )}
            {!isBaseCurrency && isUserPreferred && (
              <View style={[styles.primaryBadge, {backgroundColor: '#4CAF50'}]}>
                <Text style={styles.primaryText}>Default</Text>
              </View>
            )}
            {isSaved && !isBaseCurrency && !isUserPreferred && (
              <View style={[styles.primaryBadge, {backgroundColor: '#2196F3'}]}>
                <Text style={styles.primaryText}>Saved</Text>
              </View>
            )}
            {isSelected && !isBaseCurrency && (
              <View style={[styles.primaryBadge, {backgroundColor: '#9C27B0'}]}>
                <Text style={styles.primaryText}>Selected</Text>
              </View>
            )}
          </View>
          <View style={styles.rateContainer}>
            <Text style={styles.rateValue}>
              {memoizedConvertedAmount(item.code)}
            </Text>
            <Text style={styles.baseAmount}>
              {amount} {baseCurrency} =
            </Text>
            
            {/* Save currency button */}
            <TouchableOpacity 
              style={[
                styles.bookmarkButton,
                isSaved ? styles.removeButton : styles.saveButton
              ]}
              onPress={() => saveCurrency(item)}
            >
              <Ionicons 
                name={isSaved ? "bookmark" : "bookmark-outline"} 
                size={24} 
                color={isSaved ? "#2196F3" : "#718096"} 
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderModalItem = ({ item }) => {
    const isSelected = item.code === (currencySelectionType === 'base' ? baseCurrency : targetCurrency);
    const isUserPreferred = item.code === userPreferredCurrency;
    const primaryCountry = item.countries && item.countries.length > 0 ? item.countries[0] : null;
    
    return (
      <TouchableOpacity
        style={[
          styles.modalCurrencyItem,
          isSelected && styles.modalSelectedItem,
          isUserPreferred && styles.modalUserPreferredItem
        ]}
        onPress={() => selectCurrencyFromModal(item)}
      >
        <View style={[
          styles.modalCurrencySymbolContainer,
          { backgroundColor: `${getIconColor(item.code)}22` }
        ]}>
          <Text style={[
            styles.modalCurrencySymbol,
            { color: getIconColor(item.code) }
          ]}>
            {getCurrencySymbol(item.code)}
          </Text>
        </View>
        <View style={styles.modalCurrencyInfo}>
          <Text style={styles.modalCurrencyCode}>{item.code}</Text>
          <Text style={styles.modalCurrencyName}>
            {item.name}
            {primaryCountry ? ` • ${primaryCountry}` : ''}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color="#4CAF50" style={styles.modalSelectedIcon} />
        )}
        {!isSelected && isUserPreferred && (
          <Ionicons name="star" size={18} color="#FF9800" style={styles.modalSelectedIcon} />
        )}
      </TouchableOpacity>
    );
  };

  const lastUpdated = rates 
    ? new Date().toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) 
    : 'Loading...';

  // Helper function to show styled alerts
  const showStyledAlert = (type, title, message, buttons = [{ text: 'OK' }]) => {
    setAlertConfig({
      type,
      title,
      message,
      buttons
    });
    setAlertModalVisible(true);
  };

  // Function to save a currency to the favorites list
  const saveCurrency = async (currencyToSave) => {
    try {
      // Check if currency is already saved
      const alreadySaved = savedCurrencies.some(c => c.code === currencyToSave.code);
      
      let updatedSavedCurrencies;
      let title, message, alertType;
      
      if (!alreadySaved) {
        // Add currency to favorites
        updatedSavedCurrencies = [...savedCurrencies, {
          code: currencyToSave.code,
          symbol: getCurrencySymbol(currencyToSave.code),
          name: currencyToSave.name
        }];
        title = 'Currency Saved';
        message = `${currencyToSave.code} has been added to your saved currencies.`;
        alertType = 'success';
      } else {
        // Remove currency from favorites
        updatedSavedCurrencies = savedCurrencies.filter(c => c.code !== currencyToSave.code);
        title = 'Currency Removed';
        message = `${currencyToSave.code} has been removed from your saved currencies.`;
        alertType = 'info';
      }
      
      // Always update local state first to ensure UI is updated
      setSavedCurrencies(updatedSavedCurrencies);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('user_saved_currencies', JSON.stringify(updatedSavedCurrencies));
      console.log('Saved currencies updated in AsyncStorage');
      
      // Show styled feedback to the user
      showStyledAlert(alertType, title, message);
    } catch (error) {
      console.error('Error saving currency:', error);
      showStyledAlert('error', 'Error', 'Could not save the currency. Please try again.');
    }
  };

  // Determinar a cor do ícone da moeda baseado no código
  const getIconColor = (code) => {
    const colors = {
      'USD': '#85bb65', // Dollar green
      'EUR': '#0052b4', // European blue
      'GBP': '#00247d', // British blue
      'JPY': '#bc002d', // Japanese red
      'AUD': '#00008b', // Australian blue
      'CAD': '#ff0000', // Canadian red
      'CHF': '#ff0000', // Swiss red
      'CNY': '#de2910', // Chinese red
      'BRL': '#009c3b', // Brazilian green
    };
    
    return colors[code] || '#FF9800'; // Default orange for currencies without specific color
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
    <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
    <LinearGradient
      colors={['rgba(255, 152, 0, 0.15)', 'rgba(255, 255, 255, 0)']}
      style={styles.gradientBackground}
    />
    <Header title="Currency Market" />
    
    {loading && !isInitialized ? (
      <FullPageSkeleton />
    ) : (
    <Animated.FlatList
        style={[styles.contentContainer, { opacity: fadeAnim }]}
        data={filteredCurrencies}
        renderItem={renderCurrencyItem}
        keyExtractor={item => item.code}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#FF9800"]}
            tintColor="#FF9800"
          />
        }
        ListHeaderComponent={
          <>
                           <View style={styles.converterContainer}>
                 <Text style={styles.sectionTitle}>Currency Converter</Text>
                 <Text style={styles.sectionSubtitle}>Convert between different currencies in real-time</Text>
                 
                 {isConverterLoading ? (
                  <CurrencyConverterSkeleton />
                ) : (
                  <Animated.View 
                    style={[
                      styles.converterCard,
                      { transform: [{ scale: converterScaleAnim }] }
                    ]}
                  >
                    {/* Input para valor */}
                    <View style={styles.converterInputRow}>
                      <Text style={styles.converterLabel}>Amount</Text>
                      <TextInput
                        style={styles.converterAmountInput}
                        value={amount}
                        onChangeText={(text) => setAmount(formatAmountInput(text))}
                        keyboardType="numeric"
                        placeholder="Enter amount"
                        placeholderTextColor="#A0AEC0"
                      />
                    </View>
                    
                    {/* Seletor de moedas */}
                    <View style={styles.currencySelectionContainer}>
                      <View style={styles.currencySelectionRow}>
                        <View style={styles.currencySelection}>
                          <Text style={styles.converterLabel}>From</Text>
                          <TouchableOpacity 
                            style={styles.currencySelectorButton}
                            onPress={() => openCurrencySelector('base')}
                          >
                            <Text style={styles.currencySelectorCode}>{baseCurrency}</Text>
                            <Text style={styles.currencySelectorSymbol}>
                              {getCurrencySymbol(baseCurrency)}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#718096" />
                          </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity 
                          style={styles.swapButton}
                          onPress={swapCurrencies}
                        >
                          <Ionicons name="swap-horizontal" size={24} color="#FF9800" />
                        </TouchableOpacity>
                        
                        <View style={styles.currencySelection}>
                          <Text style={styles.converterLabel}>To</Text>
                          <TouchableOpacity 
                            style={styles.currencySelectorButton}
                            onPress={() => openCurrencySelector('target')}
                          >
                            <Text style={styles.currencySelectorCode}>{targetCurrency}</Text>
                            <Text style={styles.currencySelectorSymbol}>
                              {getCurrencySymbol(targetCurrency)}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#718096" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      {/* Resultado da conversão */}
                      <View style={styles.conversionResultContainer}>
                        <Text style={styles.conversionResultText}>
                          {convertedResult.from.adjusted ? 
                            `${convertedResult.from.amount.toFixed(2)} ${baseCurrency} = ` : 
                            `${parseFloat(amount).toFixed(2)} ${baseCurrency} = `
                          }
                        </Text>
                        <Text style={styles.conversionResultValue}>
                          {convertedResult.to.amount.toFixed(2)} {targetCurrency}
                        </Text>
                        {convertedResult.from.adjusted && (
                          <Text style={[styles.conversionResultText, { fontSize: 11, color: '#FF9800', marginTop: 4 }]}>
                            ⚡ Adjusted to minimum 0.01 {targetCurrency}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    {/* Moedas salvas */}
                    <View style={styles.popularCurrenciesContainer}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.popularCurrenciesTitle}>Saved Currencies</Text>
                        {savedCurrencies.length === 0 && (
                          <Text style={styles.saveInstructionText}></Text>
                        )}
                      </View>
                      {savedCurrencies.length > 0 && (
                        <View style={styles.tipContainer}>
                          <Ionicons name="bulb-outline" size={14} color="#FF9800" />
                          <Text style={styles.currencyTipText}>
                            Tap any saved currency to quickly use it as your "From" currency
                          </Text>
                        </View>
                      )}
                      <View style={styles.chipsContainer}>
                        {savedCurrencies.length > 0 ? (
                          savedCurrencies.map(renderPopularCurrency)
                        ) : (
                          <Text style={styles.noSavedCurrenciesText}>
                            Use the bookmark icon to save currencies
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    {/* Set as main currency button */}
                    {baseCurrency !== userPreferredCurrency && (
                      <TouchableOpacity 
                        style={styles.setMainCurrencyButton}
                        onPress={() => {
                          const currencyDetails = allCurrencies.find(c => c.code === baseCurrency) || 
                                                currencies.find(c => c.code === baseCurrency);
                          if (currencyDetails) {
                            setPendingCurrencyChange(currencyDetails);
                            setConfirmModalVisible(true);
                          } else {
                            Alert.alert('Error', 'Currency details not found');
                          }
                        }}
                      >
                        <LinearGradient
                          colors={['#4CAF50', '#388E3C']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.setMainCurrencyGradient}
                        >
                          <Ionicons name="star" size={18} color="#FFFFFF" style={{marginRight: 8}} />
                          <Text style={styles.setMainCurrencyText}>
                            Use {baseCurrency} as your main currency
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                    
                    <View style={styles.infoContainer}>
                      <Ionicons name="time-outline" size={14} color="#718096" />
                      <Text style={styles.infoText}>Last updated: {lastUpdated}</Text>
                    </View>
                  </Animated.View>
                )}
              </View>
              
              <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                  <View style={styles.listHeaderTitles}>
                    <Text style={styles.sectionTitle}>All Currencies</Text>
                    <Text style={styles.sectionSubtitle}>Tap to select, bookmark to save</Text>
                  </View>
                  <View style={styles.searchContainer}>
                    <TouchableOpacity onPress={openCurrencyListModal} style={styles.searchButton}>
                      <Ionicons name="search-outline" size={24} color="#FF9800" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#CBD5E0" />
                              <Text style={styles.emptyText}>
                  No currencies available.
                </Text>
            </View>
          }
          ListFooterComponent={
            currencies.length >= 10 ? (
              <TouchableOpacity 
                style={styles.loadMoreButton}
                onPress={loadMoreCurrencies}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.loadMoreButtonText}>Load More Currencies</Text>
                    <Ionicons name="chevron-down" size={16} color="#FFFFFF" style={{marginLeft: 5}} />
                  </>
                )}
              </TouchableOpacity>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}
      
      {selectedCurrency && (
        <Animated.View 
          style={[
            styles.actionBar,
            { transform: [{ translateY: isUpdatingGlobal ? 100 : 0 }] }
          ]}
        >
          {/* Currency Selection Info */}
          <View style={styles.selectedCurrencyInfo}>
            <View style={styles.selectedCurrencyHeader}>
              <View style={[
                styles.selectedCurrencyIcon,
                { backgroundColor: `${getIconColor(selectedCurrency.code)}22` }
              ]}>
                <Text style={[
                  styles.selectedCurrencySymbol,
                  { color: getIconColor(selectedCurrency.code) }
                ]}>
                  {getCurrencySymbol(selectedCurrency.code)}
                </Text>
              </View>
              <View style={styles.selectedCurrencyDetails}>
                <Text style={styles.selectedCurrencyCode}>{selectedCurrency.code}</Text>
                <Text style={styles.selectedCurrencyName}>{selectedCurrency.name}</Text>
              </View>
              <TouchableOpacity 
                style={styles.deselectButton}
                onPress={() => setSelectedCurrency(null)}
              >
                <Ionicons name="close" size={20} color="#718096" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Options */}
          <View style={styles.actionOptionsContainer}>
            <Text style={styles.actionOptionsTitle}>What would you like to do?</Text>
            
            <View style={styles.actionGrid}>
              {/* Set as From Currency */}
              <TouchableOpacity
                style={[styles.actionCard, styles.fromCurrencyCard]}
                onPress={() => {
                  handleBaseCurrencyChange(selectedCurrency.code);
                  setSelectedCurrency(null);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionCardIcon, { backgroundColor: '#FFE0B2' }]}>
                  <Ionicons name="arrow-up" size={18} color="#FF9800" />
                </View>
                <Text style={styles.actionCardTitle}>From Currency</Text>
                <Text style={styles.actionCardSubtitle}>Use in converter</Text>
              </TouchableOpacity>

              {/* Set as To Currency */}
              <TouchableOpacity
                style={[styles.actionCard, styles.toCurrencyCard]}
                onPress={() => {
                  setIsConverterLoading(true);
                  setTargetCurrency(selectedCurrency.code);
                  
                  if (rates) {
                    const inputValue = parseFloat(amount);
                    const conversion = calculateOptimalConversion(inputValue, baseCurrency, selectedCurrency.code, rates);
                    
                    setConvertedResult({
                      from: {
                        code: baseCurrency,
                        amount: conversion.from,
                        symbol: getCurrencySymbol(baseCurrency),
                        adjusted: conversion.adjusted
                      },
                      to: {
                        code: selectedCurrency.code,
                        amount: conversion.to,
                        symbol: getCurrencySymbol(selectedCurrency.code)
                      }
                    });
                  }
                  
                  setTimeout(() => {
                    setIsConverterLoading(false);
                    setSelectedCurrency(null);
                  }, 300);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionCardIcon, { backgroundColor: '#BBDEFB' }]}>
                  <Ionicons name="arrow-down" size={18} color="#2196F3" />
                </View>
                <Text style={styles.actionCardTitle}>To Currency</Text>
                <Text style={styles.actionCardSubtitle}>Convert result</Text>
              </TouchableOpacity>

              {/* Set as Main Currency */}
              <TouchableOpacity
                style={[styles.actionCard, styles.mainCurrencyCard]}
                onPress={handleSetAsPrimary}
                disabled={isUpdatingGlobal}
                activeOpacity={0.7}
              >
                <View style={[styles.actionCardIcon, { backgroundColor: '#C8E6C9' }]}>
                  <Ionicons name="star" size={18} color="#4CAF50" />
                </View>
                <Text style={styles.actionCardTitle}>Main Currency</Text>
                <Text style={styles.actionCardSubtitle}>Set as primary</Text>
              </TouchableOpacity>

              {/* Save Currency */}
              <TouchableOpacity
                style={[styles.actionCard, styles.saveCurrencyCard]}
                onPress={() => {
                  saveCurrency(selectedCurrency);
                  setSelectedCurrency(null);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionCardIcon, { backgroundColor: '#E1BEE7' }]}>
                  <Ionicons 
                    name={savedCurrencies.some(c => c.code === selectedCurrency.code) ? "bookmark" : "bookmark-outline"} 
                    size={18} 
                    color="#9C27B0" 
                  />
                </View>
                <Text style={styles.actionCardTitle}>
                  {savedCurrencies.some(c => c.code === selectedCurrency.code) ? "Remove" : "Save"}
                </Text>
                <Text style={styles.actionCardSubtitle}>
                  {savedCurrencies.some(c => c.code === selectedCurrency.code) ? "From saved" : "For later"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
      
      {isUpdatingGlobal && (
        <Animated.View style={styles.successOverlay}>
          <Animated.View 
            style={[
              styles.successIcon,
              { transform: [{ scale: successScale }] }
            ]}
          >
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          </Animated.View>
        </Animated.View>
      )}
      
      {/* Modal de seleção de moeda */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {currencySelectionType === 'base' ? 'Base' : 'Target'} Currency
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setModalSearchQuery(''); // Reset search when closing
                  setModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color="#718096" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSearchContainer}>
              <Ionicons name="search" size={20} color="#A0AEC0" style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by currency or country..."
                placeholderTextColor="#A0AEC0"
                value={modalSearchQuery}
                onChangeText={setModalSearchQuery}
              />
            </View>
            
            <FlatList
              data={modalFilteredCurrencies}
              renderItem={renderModalItem}
              keyExtractor={item => item.code}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
      
      {/* Modal for searching all currencies */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={currencyListModalVisible}
        onRequestClose={() => setCurrencyListModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Search All Currencies
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setCurrencyListModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color="#718096" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSearchContainer}>
              <Ionicons name="search" size={20} color="#A0AEC0" style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by currency or country..."
                placeholderTextColor="#A0AEC0"
                value={modalSearchQuery}
                onChangeText={setModalSearchQuery}
              />
            </View>
            
            <FlatList
              data={modalFilteredCurrencies}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalCurrencyItem,
                    item.code === baseCurrency && styles.modalSelectedItem,
                    item.code === userPreferredCurrency && styles.modalUserPreferredItem
                  ]}
                  onPress={() => {
                    handleCurrencySelect(item);
                    setCurrencyListModalVisible(false);
                  }}
                >
                  <View style={[
                    styles.modalCurrencySymbolContainer,
                    { backgroundColor: `${getIconColor(item.code)}22` }
                  ]}>
                    <Text style={[
                      styles.modalCurrencySymbol,
                      { color: getIconColor(item.code) }
                    ]}>
                      {getCurrencySymbol(item.code)}
                    </Text>
                  </View>
                  <View style={styles.modalCurrencyInfo}>
                    <Text style={styles.modalCurrencyCode}>{item.code}</Text>
                    <Text style={styles.modalCurrencyName}>
                      {item.name}
                      {item.countries && item.countries.length > 0 ? ` • ${item.countries[0]}` : ''}
                    </Text>
                  </View>
                  {item.code === baseCurrency && (
                    <Ionicons name="checkmark-circle" size={22} color="#4CAF50" style={styles.modalSelectedIcon} />
                  )}
                  {item.code !== baseCurrency && item.code === userPreferredCurrency && (
                    <Ionicons name="star" size={18} color="#FF9800" style={styles.modalSelectedIcon} />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={item => item.code}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
      
      {/* Modal de confirmação de moeda */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { height: 'auto', paddingVertical: 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: 18 }]}>
                Change Currency
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#718096" />
              </TouchableOpacity>
            </View>
            
            <Text style={{ fontSize: 16, color: '#4A5568', marginTop: 12, lineHeight: 22 }}>
              You are about to change your primary currency from{' '}
              <Text style={{ fontWeight: 'bold' }}>{getCurrentCurrency().code}</Text> to{' '}
              <Text style={{ fontWeight: 'bold' }}>{pendingCurrencyChange?.code}</Text>.
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
              <Switch
                value={convertValues}
                onValueChange={setConvertValues}
                trackColor={{ false: '#E2E8F0', true: '#FEEBC8' }}
                thumbColor={convertValues ? '#FF9800' : '#CBD5E0'}
              />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#2D3748' }}>
                  Convert all values
                </Text>
                <Text style={{ fontSize: 14, color: '#718096', marginTop: 4 }}>
                  {convertValues ? 
                    'Values will be converted to equivalent amounts (e.g., €10 → £8.50)' : 
                    'Keep numeric values the same (e.g., €10 → £10)'
                  }
                </Text>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: '#EDF2F7',
                  alignItems: 'center',
                  marginRight: 8
                }}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={{ color: '#4A5568', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: '#FF9800',
                  alignItems: 'center'
                }}
                onPress={confirmCurrencyChange}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Custom Alert Modal */}
      <ConfirmModal
        visible={alertModalVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

export default CurrencyMarketPage; 