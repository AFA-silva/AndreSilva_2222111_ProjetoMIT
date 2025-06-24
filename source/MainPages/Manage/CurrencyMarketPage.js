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
    backgroundColor: '#F7FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#718096',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  
  clickableCurrencyChip: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#FF9800',
    backgroundColor: 'rgba(255, 152, 0, 0.05)',
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
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [amount, setAmount] = useState('1');
  const [rates, setRates] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [allCurrencies, setAllCurrencies] = useState([]); // Add this state for full currency list
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [userCurrencyName, setUserCurrencyName] = useState('');
  const [isUpdatingGlobal, setIsUpdatingGlobal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currencySelectionType, setCurrencySelectionType] = useState('base'); // 'base' ou 'target'
  const [convertedResult, setConvertedResult] = useState({
    from: { code: 'USD', amount: 1, symbol: '$' },
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
  
  // Refs para animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const converterScaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const searchExpandAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Moedas populares com seus símbolos - transformaremos em moedas salvas
  const defaultPopularCurrencies = [];  // Removendo as moedas populares padrão

  // Estado para as moedas salvas (inicialmente populares)
  const [popularCurrencies, setPopularCurrencies] = useState(defaultPopularCurrencies);

  // Carregar a moeda preferida do usuário ao montar
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        // Tentar carregar a moeda do usuário apenas do Supabase
        let userCurrency = null;
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Buscar preferências do usuário do banco de dados
            const { data, error } = await supabase
              .from('user_currency_preferences')
              .select('actual_currency')
              .eq('user_id', user.id)
              .maybeSingle();
              
            if (!error && data && data.actual_currency) {
              userCurrency = data.actual_currency;
              console.log('Moeda carregada do banco de dados:', userCurrency);
            } else {
              // Se não encontrou no banco, usar o valor padrão 'USD'
              userCurrency = 'USD';
              console.log('Nenhuma preferência de moeda encontrada, usando padrão:', userCurrency);
              
              // Criar registro com valor padrão
              if (user) {
                const { error: insertError } = await supabase
                  .from('user_currency_preferences')
                  .upsert({ 
                    user_id: user.id,
                    actual_currency: userCurrency
                  });
                  
                if (insertError) {
                  console.error('Erro ao criar preferência de moeda:', insertError);
                }
              }
            }
          } else {
            // Se usuário não estiver logado, usar USD padrão
            userCurrency = 'USD';
          }
        } catch (dbError) {
          console.error('Erro ao carregar moeda do banco:', dbError);
          // Fallback para valor padrão
          userCurrency = 'USD';
        }
        
        // Definir a moeda base com a preferência do usuário
        if (userCurrency) {
          setBaseCurrency(userCurrency);
          setUserPreferredCurrency(userCurrency);
          // Guardar para comparação quando sair da página
          initialUserCurrency.current = userCurrency;
        }

        // Inicializar moedas salvas do AsyncStorage
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
      } catch (error) {
        console.error("Error loading user preferences:", error);
        setSavedCurrencies([]);
      }
    };
    
    loadUserPreferences();
    
    // Verificar se houve mudança de moeda ao sair da página
    return () => {
      verifyAndSaveCurrencyChange();
    };
  }, []);
  
  // Referência para armazenar a moeda inicial do usuário para comparação
  const initialUserCurrency = useRef(null);
  
  // Função para verificar e salvar mudança de moeda ao sair da página
  const verifyAndSaveCurrencyChange = async () => {
    try {
      // Se a moeda atual é diferente da inicial, atualizar no banco
      if (initialUserCurrency.current && 
          userPreferredCurrency && 
          initialUserCurrency.current !== userPreferredCurrency) {
        
        console.log(`Moeda alterada: ${initialUserCurrency.current} → ${userPreferredCurrency}`);
        
        // Usar a função centralizada para atualizar a moeda no banco
        const success = await updateUserCurrencyPreference(userPreferredCurrency);
        
        if (success) {
          console.log('Moeda atualizada no banco com sucesso via verifyAndSaveCurrencyChange');
        } else {
          console.error('Erro ao atualizar moeda no banco via verifyAndSaveCurrencyChange');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar mudança de moeda:', error);
    }
  };

  // Carregar taxas de câmbio e moedas suportadas
  useEffect(() => {
    loadData();
  }, [baseCurrency]);

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
    slideUpAnim.setValue(50);
    
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
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.cubic),
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

  const searchWidth = searchExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const successScale = successAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1],
  });

  // Função para calcular o resultado da conversão
  const updateConversion = () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    
    // No need to reload the whole screen, just update the conversion result
    // without causing a full re-render
    const value = parseFloat(amount);
    setConvertedResult({
      from: {
        code: baseCurrency,
        amount: value,
        symbol: getCurrencySymbol(baseCurrency)
      },
      to: {
        code: targetCurrency,
        amount: convertCurrency(value, baseCurrency, targetCurrency, rates) || 0,
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
      if (!isConverterLoading && !isCurrencyListLoading) {
        setLoading(true);
      }
      
      // Buscar taxas de câmbio para a moeda base
      const exchangeRates = await fetchLatestRates(baseCurrency);
      setRates(exchangeRates);
      
      // Buscar lista de moedas suportadas
      const supportedCurrencies = await getSupportedCurrencies();
      // Store all currencies
      setAllCurrencies(supportedCurrencies);
      // Limitar para currencyLimit moedas para melhor performance
      setCurrencies(supportedCurrencies.slice(0, currencyLimit));
      
      // Encontrar o nome da moeda atual do usuário
      const currencyDetails = supportedCurrencies.find(c => c.code === baseCurrency);
      if (currencyDetails) {
        setUserCurrencyName(currencyDetails.name);
      }
      
      // Force initial conversion calculation
      if (exchangeRates) {
        const value = parseFloat(amount);
        setConvertedResult({
          from: {
            code: baseCurrency,
            amount: value,
            symbol: getCurrencySymbol(baseCurrency)
          },
          to: {
            code: targetCurrency,
            amount: convertCurrency(value, baseCurrency, targetCurrency, exchangeRates) || 0,
            symbol: getCurrencySymbol(targetCurrency)
          }
        });
      }
      
      setLoading(false);
      setIsConverterLoading(false);
      setIsCurrencyListLoading(false);
    } catch (error) {
      setLoading(false);
      setIsConverterLoading(false);
      setIsCurrencyListLoading(false);
      Alert.alert('Error', 'Failed to load currency data. Please try again later.');
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
    // Não permitir seleção da moeda base atual
    if (currency.code === baseCurrency) {
      Alert.alert('Info', `${currency.code} is already your base currency.`);
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
        Alert.alert('Info', 'This currency is already selected.');
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

  const toggleSearchMode = () => {
    if (!searching) {
      setSearching(true);
      Animated.timing(searchExpandAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      Animated.timing(searchExpandAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.cubic),
      }).start(() => {
        setSearching(false);
        setSearchQuery('');
      });
    }
  };

  // Abrir modal para selecionar moeda
  const openCurrencySelector = (type) => {
    setCurrencySelectionType(type);
    setModalVisible(true);
  };

  // Selecionar moeda do modal
  const selectCurrencyFromModal = (currency) => {
    // Don't reload if selecting the same currency
    if (currencySelectionType === 'base' && currency.code === baseCurrency) {
      setModalVisible(false);
      return;
    }
    if (currencySelectionType === 'target' && currency.code === targetCurrency) {
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
        const value = parseFloat(amount);
        setConvertedResult({
          from: {
            code: baseCurrency,
            amount: value,
            symbol: getCurrencySymbol(baseCurrency)
          },
          to: {
            code: currency.code,
            amount: convertCurrency(value, baseCurrency, currency.code, rates) || 0,
            symbol: getCurrencySymbol(currency.code)
          }
        });
        
        // Hide loading after a short delay for visual feedback
        setTimeout(() => {
          setIsConverterLoading(false);
        }, 300);
      }
    }
    
    setModalVisible(false);
  };

  // Trocar as moedas base e alvo
  const swapCurrencies = () => {
    setIsConverterLoading(true);
    
    const tempCode = baseCurrency;
    const tempSymbol = getCurrencySymbol(baseCurrency);
    
    setBaseCurrency(targetCurrency);
    setTargetCurrency(tempCode);
    
    // Immediately update the conversion result with swapped values
    if (rates) {
      const value = parseFloat(amount);
      const targetRate = rates[tempCode] || 1;
      
      setConvertedResult({
        from: {
          code: targetCurrency,
          amount: value,
          symbol: getCurrencySymbol(targetCurrency)
        },
        to: {
          code: tempCode,
          amount: convertCurrency(value, targetCurrency, tempCode, rates) || 0,
          symbol: tempSymbol
        }
      });
    }
    
    // Don't need to load list for target changes
    if (tempCode === baseCurrency) {
      setIsCurrencyListLoading(false);
    }
    
    // Hide loading after a short delay for visual feedback
    setTimeout(() => {
      setIsConverterLoading(false);
    }, 300);
  };

  const filteredCurrencies = React.useMemo(() => {
    // If searching, filter from all currencies, otherwise use the limited list
    const sourceList = searchQuery ? allCurrencies : currencies;
    
    return sourceList.filter(currency => {
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase().trim();
      
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
      // Colocar a moeda do usuário no topo
      if (a.code === userPreferredCurrency) return -1;
      if (b.code === userPreferredCurrency) return 1;
      
      // Colocar moedas salvas depois da moeda do usuário
      const aIsSaved = savedCurrencies.some(c => c.code === a.code);
      const bIsSaved = savedCurrencies.some(c => c.code === b.code);
      
      if (aIsSaved && !bIsSaved) return -1;
      if (!aIsSaved && bIsSaved) return 1;
      
      // Priorizar correspondências exatas para pesquisas
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const aExactMatch = a.code.toLowerCase() === query;
        const bExactMatch = b.code.toLowerCase() === query;
        
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        
        // Priorizar correspondências que começam com a consulta
        const aStartsWithMatch = a.code.toLowerCase().startsWith(query);
        const bStartsWithMatch = b.code.toLowerCase().startsWith(query);
        
        if (aStartsWithMatch && !bStartsWithMatch) return -1;
        if (!aStartsWithMatch && bStartsWithMatch) return 1;
      }
      
      // Depois colocar a moeda selecionada
      if (a.code === baseCurrency) return -1;
      if (b.code === baseCurrency) return 1;
      
      // Finalmente ordenar pelo nome
      return a.name.localeCompare(b.name);
    });
  }, [currencies, allCurrencies, searchQuery, userPreferredCurrency, savedCurrencies, baseCurrency]);

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
      if (!rates || !amount || isNaN(amount)) return '0.00';
      
      const convertedValue = convertCurrency(parseFloat(amount), baseCurrency, targetCurrencyCode, rates);
      return convertedValue ? convertedValue.toFixed(2) : '0.00';
    };
  }, [rates, amount, baseCurrency]);

  // Update the renderCurrencyItem to use the memoized function
  const renderCurrencyItem = ({ item, index }) => {
    const isSelected = selectedCurrency && selectedCurrency.code === item.code;
    const isBaseCurrency = baseCurrency === item.code;
    const isUserPreferred = userPreferredCurrency === item.code;
    const isSaved = savedCurrencies.some(c => c.code === item.code);
    
    // Get the primary country if available
    const primaryCountry = item.countries && item.countries.length > 0 ? item.countries[0] : null;
    
    // Calcular animação de deslocamento para cada item
    const itemDelayOffset = Math.min(index, 10) * 50; // Limitar a 10 itens para evitar atrasos muito longos
    
    const itemAnimStyle = {
      opacity: fadeAnim,
      transform: [
        { 
          translateY: slideUpAnim.interpolate({
            inputRange: [0, 50],
            outputRange: [0, 50 + itemDelayOffset],
          })
        }
      ]
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
          disabled={isBaseCurrency}
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

  // Function to save a currency to the favorites list
  const saveCurrency = async (currencyToSave) => {
    try {
      // Check if currency is already saved
      const alreadySaved = savedCurrencies.some(c => c.code === currencyToSave.code);
      
      let updatedSavedCurrencies;
      let message;
      
      if (!alreadySaved) {
        // Add currency to favorites
        updatedSavedCurrencies = [...savedCurrencies, {
          code: currencyToSave.code,
          symbol: getCurrencySymbol(currencyToSave.code),
          name: currencyToSave.name
        }];
        message = `${currencyToSave.code} has been added to your saved currencies.`;
      } else {
        // Remove currency from favorites
        updatedSavedCurrencies = savedCurrencies.filter(c => c.code !== currencyToSave.code);
        message = `${currencyToSave.code} has been removed from your saved currencies.`;
      }
      
      // Always update local state first to ensure UI is updated
      setSavedCurrencies(updatedSavedCurrencies);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('user_saved_currencies', JSON.stringify(updatedSavedCurrencies));
      console.log('Saved currencies updated in AsyncStorage');
      
      // Show feedback to the user
      Alert.alert('Currency ' + (alreadySaved ? 'Removed' : 'Saved'), message);
    } catch (error) {
      console.error('Error saving currency:', error);
      Alert.alert('Error', 'Could not save the currency. Please try again.');
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

  // Render loading screen
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <LinearGradient
          colors={['rgba(255, 152, 0, 0.15)', 'rgba(255, 255, 255, 0)']}
          style={styles.gradientBackground}
        />
        <Header title="Currency Market" />
        
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <Animated.View style={[styles.loadingIconContainer, { transform: [{ rotate: spin }] }]}>
              <Ionicons name="sync" size={40} color="#FF9800" />
            </Animated.View>
            <Text style={styles.loadingTitle}>Loading Currency Data</Text>
            <Animated.Text style={styles.loadingText}>
              Please wait{loadingDots}
            </Animated.Text>
            <LinearGradient
              colors={['rgba(255, 152, 0, 0.1)', 'rgba(255, 152, 0, 0.3)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loadingProgress}
            />
          </View>
        </View>
      </View>
    );
  }

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
      
      <Animated.ScrollView
        style={[styles.contentContainer, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#FF9800"]}
            tintColor="#FF9800"
          />
        }
      >
        <View style={styles.converterContainer}>
          <Text style={styles.sectionTitle}>Currency Converter</Text>
          
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
                  onChangeText={setAmount}
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
                    {parseFloat(amount).toFixed(2)} {baseCurrency} = 
                  </Text>
                  <Text style={styles.conversionResultValue}>
                    {convertedResult.to.amount.toFixed(2)} {targetCurrency}
                  </Text>
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
        
        <Animated.View 
          style={[
            styles.listContainer,
            { transform: [{ translateY: slideUpAnim }] }
          ]}
        >
          <View style={styles.listHeader}>
            <View style={styles.listHeaderTitles}>
              <Text style={styles.sectionTitle}>All Currencies</Text>
              <Text style={styles.sectionSubtitle}>Tap to select, bookmark to save</Text>
            </View>
            <View style={styles.searchContainer}>
              {searching ? (
                <Animated.View style={{ width: searchWidth }}>
                  <View style={styles.searchInputContainer}>
                    <Ionicons name="search-outline" size={18} color="#A0AEC0" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search by currency or country..."
                      placeholderTextColor="#A0AEC0"
                      autoFocus
                    />
                    <TouchableOpacity onPress={toggleSearchMode}>
                      <Ionicons name="close-outline" size={22} color="#A0AEC0" />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ) : (
                <TouchableOpacity onPress={toggleSearchMode} style={styles.searchButton}>
                  <Ionicons name="search-outline" size={24} color="#FF9800" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {isCurrencyListLoading ? (
            <CurrencyListSkeleton count={10} />
          ) : (
            <FlatList
              style={{ flex: 1 }}
              contentContainerStyle={[styles.container, { paddingBottom: 80, flexGrow: 1 }]}
              data={filteredCurrencies}
              renderItem={renderCurrencyItem}
              keyExtractor={item => item.code}
              showsVerticalScrollIndicator={true}
              bounces={true}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color="#CBD5E0" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? "No currencies found matching your search." : "No currencies available."}
                  </Text>
                </View>
              }
              ListFooterComponent={
                currencies.length >= 10 && !searching ? (
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
            />
          )}
        </Animated.View>
      </Animated.ScrollView>
      
      {selectedCurrency && (
        <Animated.View 
          style={[
            styles.actionBar,
            { transform: [{ translateY: isUpdatingGlobal ? 100 : 0 }] }
          ]}
        >
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonHalf]}
              onPress={() => {
                handleBaseCurrencyChange(selectedCurrency.code);
                setSelectedCurrency(null);
              }}
            >
              <LinearGradient
                colors={['#FF9800', '#F57C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="arrow-up-circle-outline" size={18} color="#FFFFFF" style={styles.actionButtonIcon} />
                <Text style={styles.actionButtonText}>Set as From Currency</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonHalf]}
              onPress={() => {
                setIsConverterLoading(true);
                setTargetCurrency(selectedCurrency.code);
                
                // Immediately update conversion
                if (rates) {
                  const value = parseFloat(amount);
                  setConvertedResult({
                    from: {
                      code: baseCurrency,
                      amount: value,
                      symbol: getCurrencySymbol(baseCurrency)
                    },
                    to: {
                      code: selectedCurrency.code,
                      amount: convertCurrency(value, baseCurrency, selectedCurrency.code, rates) || 0,
                      symbol: getCurrencySymbol(selectedCurrency.code)
                    }
                  });
                }
                
                setTimeout(() => {
                  setIsConverterLoading(false);
                  setSelectedCurrency(null);
                }, 300);
              }}
            >
              <LinearGradient
                colors={['#2196F3', '#1976D2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="arrow-down-circle-outline" size={18} color="#FFFFFF" style={styles.actionButtonIcon} />
                <Text style={styles.actionButtonText}>Set as To Currency</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSetAsPrimary}
            disabled={isUpdatingGlobal}
          >
            <LinearGradient
              colors={['#4CAF50', '#388E3C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="star-outline" size={18} color="#FFFFFF" style={styles.actionButtonIcon} />
              <Text style={styles.actionButtonText}>Set as Main Currency</Text>
            </LinearGradient>
          </TouchableOpacity>
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
                onPress={() => setModalVisible(false)}
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
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            <FlatList
              data={filteredCurrencies}
              renderItem={renderModalItem}
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
    </KeyboardAvoidingView>
  );
};

export default CurrencyMarketPage; 