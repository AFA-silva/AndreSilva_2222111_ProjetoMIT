import React, { useState, useEffect, useRef } from 'react';
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
  Switch
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { fetchLatestRates, getSupportedCurrencies, convertCurrency } from '../../Utility/CurrencyService';
import { setCurrentCurrency, getCurrentCurrency } from '../../Utility/FetchCountries';
import Header from '../../Utility/Header';
import { LinearGradient } from 'expo-linear-gradient';
import styles from '../../Styles/MainPageStyles/CurrencyMarketPageStyle';
import { supabase } from '../../../Supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const ITEM_HEIGHT = 90; // Altura aproximada de cada item de moeda
const CARD_HEIGHT = 220; // Altura do card do conversor

const CurrencyMarketPage = ({ navigation }) => {
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [amount, setAmount] = useState('1');
  const [rates, setRates] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [userCurrencyName, setUserCurrencyName] = useState('');
  const [isUpdatingGlobal, setIsUpdatingGlobal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currencySelectionType, setCurrencySelectionType] = useState('base'); // 'base' ou 'target'
  const [convertedResult, setConvertedResult] = useState(null);
  const [userPreferredCurrency, setUserPreferredCurrency] = useState(null);
  
  // Novos estados para o modal de confirmação de moeda
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [convertValues, setConvertValues] = useState(true);
  const [pendingCurrencyChange, setPendingCurrencyChange] = useState(null);
  
  // Refs para animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const converterScaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const searchExpandAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Moedas populares com seus símbolos
  const defaultPopularCurrencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  ];

  // Estado para as moedas populares (pode incluir a moeda do usuário)
  const [popularCurrencies, setPopularCurrencies] = useState(defaultPopularCurrencies);

  // Carregar a moeda preferida do usuário ao montar
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        // Primeiro, tente obter do AsyncStorage
        const userCurrency = await AsyncStorage.getItem('user_preferred_currency');
        if (userCurrency) {
          setBaseCurrency(userCurrency);
          setUserPreferredCurrency(userCurrency);
        }
      } catch (error) {
        console.error("Error loading user preferences:", error);
      }
    };
    
    loadUserPreferences();
  }, []);

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
    if (!rates || !amount || isNaN(amount)) {
      setConvertedResult(null);
      return;
    }
    
    const numAmount = parseFloat(amount);
    const result = convertCurrency(numAmount, baseCurrency, targetCurrency, rates);
    setConvertedResult(result);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Buscar taxas de câmbio para a moeda base
      const exchangeRates = await fetchLatestRates(baseCurrency);
      setRates(exchangeRates);
      
      // Buscar lista de moedas suportadas (limitado a 50 moedas)
      const supportedCurrencies = await getSupportedCurrencies();
      // Limitar para 50 moedas para melhor performance
      setCurrencies(supportedCurrencies.slice(0, 50));
      
      // Encontrar o nome da moeda atual do usuário
      const currencyDetails = supportedCurrencies.find(c => c.code === baseCurrency);
      if (currencyDetails) {
        setUserCurrencyName(currencyDetails.name);
      }
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to load currency data. Please try again later.');
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
      
      // Salvar a moeda anterior como moeda original para conversões
      const currentCurrency = getCurrentCurrency();
      console.log(`---------------------------------------`);
      console.log(`MUDANDO MOEDA: ${currentCurrency.code} → ${pendingCurrencyChange.code}`);
      console.log(`Converter valores? ${convertValues ? 'SIM' : 'NÃO'}`);
      
      // IMPORTANTE: Sempre salvar a moeda atual como original para referência futura
      await AsyncStorage.setItem('original_app_currency', currentCurrency.code);
      console.log(`Moeda original salva: ${currentCurrency.code}`);
      
      // Salvar no AsyncStorage
      await AsyncStorage.setItem('user_preferred_currency', pendingCurrencyChange.code);
      
      // Salvar a opção de conversão explicitamente
      await AsyncStorage.setItem('convert_currency_values', convertValues.toString());
      console.log(`Preferência de conversão salva: ${convertValues}`);
      
      setUserPreferredCurrency(pendingCurrencyChange.code);
      
      // Tentar salvar no Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Primeiro tente obter dados existentes usando filtro correto
          const { data: existingPrefs } = await supabase
            .from('user_currency_preferences')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle(); // Usar maybeSingle em vez de single para evitar erros
            
          if (existingPrefs) {
            // Atualizar registro existente
            await supabase
              .from('user_currency_preferences')
              .update({ 
                preferred_currency: pendingCurrencyChange.code,
                convert_values: convertValues,
                original_currency: currentCurrency.code // Salvar a moeda original no Supabase também
              })
              .eq('id', existingPrefs.id);
          } else {
            // Inserir novo registro
            await supabase
              .from('user_currency_preferences')
              .insert({
                user_id: user.id,
                preferred_currency: pendingCurrencyChange.code,
                convert_values: convertValues,
                original_currency: currentCurrency.code // Salvar a moeda original no Supabase também
              });
          }
        }
      } catch (supabaseError) {
        console.log('Erro ao salvar no Supabase, mas continuando com localStorage:', supabaseError);
        // Não interromper o fluxo se falhar no Supabase
      }
      
      // Atualizar a moeda global do aplicativo com todas as informações necessárias
      const currencyDetails = currencies.find(c => c.code === pendingCurrencyChange.code);
      if (currencyDetails) {
        const globalCurrency = {
          code: pendingCurrencyChange.code,
          name: currencyDetails.name,
          symbol: getCurrencySymbol(pendingCurrencyChange.code),
          convertValues: convertValues,
          originalCurrency: currentCurrency.code
        };
        
        // Atualizar a moeda global
        console.log('Atualizando moeda global:', globalCurrency);
        await setCurrentCurrency(globalCurrency);
        setUserCurrencyName(currencyDetails.name);
      }
      
      // Atualizar a UI
      setBaseCurrency(pendingCurrencyChange.code);
      setSelectedCurrency(null);
      setPendingCurrencyChange(null);
      
      // Mostrar animação de sucesso
      startSuccessAnimation();
      setIsUpdatingGlobal(false);
      
      // Mostrar feedback ao usuário
      Alert.alert(
        'Currency Updated', 
        `${pendingCurrencyChange.code} is now your primary currency${convertValues ? ' and values will be converted' : ' (keeping original values)'}`,
        [{ text: 'OK' }]
      );

      // Atualizar as moedas populares para mostrar a nova moeda do usuário
      updatePopularCurrencies();
    } catch (error) {
      setIsUpdatingGlobal(false);
      setConfirmModalVisible(false);
      Alert.alert('Error', 'Failed to set primary currency.');
      console.error(error);
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
    if (currencySelectionType === 'base') {
      setBaseCurrency(currency.code);
    } else {
      setTargetCurrency(currency.code);
    }
    setModalVisible(false);
  };

  // Trocar as moedas base e alvo
  const swapCurrencies = () => {
    const temp = baseCurrency;
    setBaseCurrency(targetCurrency);
    setTargetCurrency(temp);
  };

  const filteredCurrencies = currencies.filter(currency => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Check if the currency code or name matches
    const basicMatch = (
      currency.code.toLowerCase().includes(query) ||
      currency.name.toLowerCase().includes(query)
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
    
    // Colocar a moeda selecionada em seguida
    if (a.code === baseCurrency) return -1;
    if (b.code === baseCurrency) return 1;
    
    // Depois ordenar pelo nome
    return a.name.localeCompare(b.name);
  });

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
          isSelected && styles.selectedPopularCurrency,
          isUserCurrency && styles.userCurrencyChip
        ]}
        onPress={() => setBaseCurrency(currency.code)}
        disabled={isSelected}
      >
        {isUserCurrency && (
          <Ionicons name="star" size={12} color="#FF9800" style={styles.userCurrencyIcon} />
        )}
        <Text style={[
          styles.popularCurrencySymbol,
          isSelected && styles.selectedPopularCurrencyText
        ]}>
          {currency.symbol}
        </Text>
        <Text style={[
          styles.popularCurrencyCode,
          isSelected && styles.selectedPopularCurrencyText
        ]}>
          {currency.code}
        </Text>
      </TouchableOpacity>
    );
  };
  
  const renderCurrencyItem = ({ item, index }) => {
    const isSelected = selectedCurrency && selectedCurrency.code === item.code;
    const isBaseCurrency = baseCurrency === item.code;
    const isUserPreferred = userPreferredCurrency === item.code;
    
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
            isUserPreferred && styles.userPreferredItem
          ]}
          onPress={() => handleCurrencySelect(item)}
          disabled={isBaseCurrency}
          activeOpacity={0.7}
        >
          <View style={styles.currencyInfo}>
            <View style={styles.currencyIconContainer}>
              <Text style={styles.currencySymbol}>
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
          </View>
          <View style={styles.rateContainer}>
            <Text style={styles.rateValue}>
              {convertedAmount(item.code)}
            </Text>
            <Text style={styles.baseAmount}>
              {amount} {baseCurrency} =
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Converter valor para exibição
  const convertedAmount = (targetCurrencyCode) => {
    if (!rates || !amount || isNaN(amount)) return '0.00';
    
    const convertedValue = convertCurrency(parseFloat(amount), baseCurrency, targetCurrencyCode, rates);
    return convertedValue ? convertedValue.toFixed(2) : '0.00';
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
        <Text style={styles.modalCurrencySymbol}>{getCurrencySymbol(item.code)}</Text>
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

  // Renderizar tela de carregamento
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <LinearGradient
          colors={['rgba(255, 152, 0, 0.2)', 'rgba(255, 255, 255, 0)']}
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
              {convertedResult !== null && (
                <View style={styles.conversionResultContainer}>
                  <Text style={styles.conversionResultText}>
                    {parseFloat(amount).toFixed(2)} {baseCurrency} = 
                  </Text>
                  <Text style={styles.conversionResultValue}>
                    {convertedResult.toFixed(2)} {targetCurrency}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Moedas populares */}
            <View style={styles.popularCurrenciesContainer}>
              <Text style={styles.popularCurrenciesTitle}>Popular Currencies</Text>
              <View style={styles.chipsContainer}>
                {popularCurrencies.map(renderPopularCurrency)}
              </View>
            </View>
            
            <View style={styles.infoContainer}>
              <Ionicons name="time-outline" size={14} color="#718096" />
              <Text style={styles.infoText}>Last updated: {lastUpdated}</Text>
            </View>
          </Animated.View>
        </View>
        
        <Animated.View 
          style={[
            styles.listContainer,
            { transform: [{ translateY: slideUpAnim }] }
          ]}
        >
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>All Currencies</Text>
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
          
          <FlatList
            style={{ flex: 1 }}
            contentContainerStyle={[styles.container, { paddingBottom: 24, flexGrow: 1 }]}
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
          />
        </Animated.View>
      </Animated.ScrollView>
      
      {selectedCurrency && (
        <Animated.View 
          style={[
            styles.actionBar,
            { transform: [{ translateY: isUpdatingGlobal ? 100 : 0 }] }
          ]}
        >
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSetAsPrimary}
            disabled={isUpdatingGlobal}
          >
            <LinearGradient
              colors={['#FF9800', '#F57C00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={styles.actionButtonIcon} />
              <Text style={styles.actionButtonText}>Set as Primary Currency</Text>
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