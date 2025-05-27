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
  Modal
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { fetchLatestRates, getSupportedCurrencies, convertCurrency } from '../../Utility/CurrencyService';
import { setCurrentCurrency } from '../../Utility/FetchCountries';
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
      
      // Buscar lista de moedas suportadas
      const supportedCurrencies = await getSupportedCurrencies();
      setCurrencies(supportedCurrencies);
      
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
        setIsUpdatingGlobal(true);
        // Salvar no AsyncStorage
        await AsyncStorage.setItem('user_preferred_currency', selectedCurrency.code);
        setUserPreferredCurrency(selectedCurrency.code);
        
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
                .update({ preferred_currency: selectedCurrency.code })
                .eq('id', existingPrefs.id);
            } else {
              // Inserir novo registro
              await supabase
                .from('user_currency_preferences')
                .insert({
                  user_id: user.id,
                  preferred_currency: selectedCurrency.code
                });
            }
          }
        } catch (supabaseError) {
          console.log('Erro ao salvar no Supabase, mas continuando com localStorage:', supabaseError);
          // Não interromper o fluxo se falhar no Supabase
        }
        
        // Atualizar a moeda global do aplicativo
        const currencyDetails = currencies.find(c => c.code === selectedCurrency.code);
        if (currencyDetails) {
          const globalCurrency = {
            code: selectedCurrency.code,
            name: currencyDetails.name,
            symbol: getCurrencySymbol(selectedCurrency.code)
          };
          
          // Atualizar a moeda global
          await setCurrentCurrency(globalCurrency);
          setUserCurrencyName(currencyDetails.name);
        }
        
        // Atualizar a UI
        setBaseCurrency(selectedCurrency.code);
        setSelectedCurrency(null);
        
        // Mostrar animação de sucesso
        startSuccessAnimation();
        setIsUpdatingGlobal(false);
        
        // Mostrar feedback ao usuário
        Alert.alert(
          'Currency Updated', 
          `${selectedCurrency.code} is now your primary currency for the entire app.`,
          [{ text: 'OK' }]
        );

        // Atualizar as moedas populares para mostrar a nova moeda do usuário
        updatePopularCurrencies();
      } catch (error) {
        setIsUpdatingGlobal(false);
        Alert.alert('Error', 'Failed to set primary currency.');
        console.error(error);
      }
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
    return (
      currency.code.toLowerCase().includes(query) ||
      currency.name.toLowerCase().includes(query)
    );
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
              <Text style={styles.currencyName} numberOfLines={1}>{item.name}</Text>
            </View>
            {isBaseCurrency && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>Primary</Text>
              </View>
            )}
            {!isBaseCurrency && isUserPreferred && (
              <View style={[styles.primaryBadge, {backgroundColor: '#4CAF50'}]}>
                <Text style={styles.primaryText}>Preferred</Text>
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

  const renderModalItem = ({ item }) => (
    <TouchableOpacity
      style={styles.modalCurrencyItem}
      onPress={() => selectCurrencyFromModal(item)}
    >
      <Text style={styles.modalCurrencySymbol}>{getCurrencySymbol(item.code)}</Text>
      <View style={styles.modalCurrencyInfo}>
        <Text style={styles.modalCurrencyCode}>{item.code}</Text>
        <Text style={styles.modalCurrencyName}>{item.name}</Text>
      </View>
      {(item.code === baseCurrency || item.code === targetCurrency) && (
        <Ionicons name="checkmark-circle" size={22} color="#4CAF50" style={styles.modalSelectedIcon} />
      )}
    </TouchableOpacity>
  );

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
                      placeholder="Search currencies..."
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
            data={filteredCurrencies}
            renderItem={renderCurrencyItem}
            keyExtractor={item => item.code}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#CBD5E0" />
                <Text style={styles.emptyText}>
                  {searchQuery ? "No currencies found matching your search." : "No currencies available."}
                </Text>
              </View>
            }
            contentContainerStyle={[
              styles.listContentContainer,
              { paddingBottom: selectedCurrency ? 140 : 60 }
            ]}
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
                placeholder="Search currencies..."
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
    </KeyboardAvoidingView>
  );
};

export default CurrencyMarketPage; 