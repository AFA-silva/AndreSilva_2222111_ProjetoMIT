import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../Supabase';

// Mapeamento de países para suas moedas e símbolos (para moedas populares)
const countryCurrencyMap = {
  'US': { code: 'USD', symbol: '$', name: 'US Dollar' },
  'EU': { code: 'EUR', symbol: '€', name: 'Euro' },
  'GB': { code: 'GBP', symbol: '£', name: 'British Pound' },
  'JP': { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  'BR': { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  'AU': { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  'CA': { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  'CH': { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  'CN': { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  'IN': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  'RU': { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  'ZA': { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  'AE': { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  'MX': { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  'KR': { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  'TR': { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  'SE': { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  'NO': { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  'DK': { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  'PL': { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
  'PT': { code: 'EUR', symbol: '€', name: 'Euro' },
  'ES': { code: 'EUR', symbol: '€', name: 'Euro' },
  'IT': { code: 'EUR', symbol: '€', name: 'Euro' },
  'DE': { code: 'EUR', symbol: '€', name: 'Euro' },
  'FR': { code: 'EUR', symbol: '€', name: 'Euro' }
};

const API_KEY = 'de3d3cc388a2679655798ec7';
const BASE_URL = 'https://v6.exchangerate-api.com/v6';

// Helper function to check if cached data is older than the specified time
const isCacheExpired = (timestamp, expiryTimeInHours = 24) => {
  const now = new Date().getTime();
  const expiryTime = expiryTimeInHours * 60 * 60 * 1000; // Convert hours to milliseconds
  return now - timestamp > expiryTime;
};

// Buscar taxas de câmbio mais recentes
export const fetchLatestRates = async (baseCurrency = 'USD') => {
  try {
    // Primeiro verificar se temos taxas em cache
    const cachedRatesStr = await AsyncStorage.getItem(`exchange_rates_${baseCurrency}`);
    const cachedTime = await AsyncStorage.getItem(`exchange_rates_time_${baseCurrency}`);
    
    // Se temos taxas em cache e elas são de menos de 3 horas atrás, usá-las
    if (cachedRatesStr && cachedTime) {
      const now = Date.now();
      const cacheTime = parseInt(cachedTime);
      const threeHoursMs = 3 * 60 * 60 * 1000;
      
      if (now - cacheTime < threeHoursMs) {
        console.log('Usando taxas de câmbio em cache para', baseCurrency);
        return JSON.parse(cachedRatesStr);
      }
    }
    
    // Se não temos cache válido, buscar novas taxas
    console.log('Buscando novas taxas de câmbio para', baseCurrency);
    
    // Usar a Exchange Rate API
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${baseCurrency}`);
    const data = await response.json();
    
    if (data.result === 'success') {
      // Salvar em cache
      await AsyncStorage.setItem(`exchange_rates_${baseCurrency}`, JSON.stringify(data.conversion_rates));
      await AsyncStorage.setItem(`exchange_rates_time_${baseCurrency}`, Date.now().toString());
      
      return data.conversion_rates;
    } else {
      throw new Error(`API Error: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Fallback: Retornar taxas em cache mesmo que sejam antigas
    try {
      const cachedRatesStr = await AsyncStorage.getItem(`exchange_rates_${baseCurrency}`);
      if (cachedRatesStr) {
        console.log('Usando taxas de câmbio em cache antigas como fallback');
        return JSON.parse(cachedRatesStr);
      }
    } catch (cacheError) {
      console.error('Error reading cache:', cacheError);
    }
    
    // Se tudo falhar, retornar algumas taxas hard-coded para o app não quebrar
    return getHardcodedRates(baseCurrency);
  }
};

// Taxas hard-coded para fallback (valores aproximados)
const getHardcodedRates = (baseCurrency) => {
  const rates = {
    'USD': { 'EUR': 0.92, 'GBP': 0.78, 'JPY': 150, 'BRL': 5.63, 'AUD': 1.52, 'CKD': 1.35, 'CUC': 1.0 },
    'EUR': { 'USD': 1.09, 'GBP': 0.85, 'JPY': 164, 'BRL': 6.13, 'AUD': 1.65, 'CKD': 1.46, 'CUC': 1.09 },
    'GBP': { 'USD': 1.28, 'EUR': 1.17, 'JPY': 192, 'BRL': 7.18, 'AUD': 1.93, 'CKD': 1.72, 'CUC': 1.28 },
    'JPY': { 'USD': 0.0067, 'EUR': 0.0061, 'GBP': 0.0052, 'BRL': 0.038, 'AUD': 0.010, 'CKD': 0.009, 'CUC': 0.0067 },
    'BRL': { 'USD': 0.18, 'EUR': 0.16, 'GBP': 0.14, 'JPY': 26.5, 'AUD': 0.27, 'CKD': 0.24, 'CUC': 0.18 },
    'CKD': { 'USD': 0.74, 'EUR': 0.68, 'GBP': 0.58, 'JPY': 111, 'BRL': 4.15, 'AUD': 1.12, 'CUC': 0.74 },
    'CUC': { 'USD': 1.0, 'EUR': 0.92, 'GBP': 0.78, 'JPY': 150, 'BRL': 5.63, 'AUD': 1.52, 'CKD': 1.35 }
  };
  
  // Retornar as taxas para a moeda base se existirem, ou um objeto vazio
  if (rates[baseCurrency]) {
    return rates[baseCurrency];
  }
  
  // Se a moeda base não estiver nas taxas hardcoded, criar taxas aproximadas
  // baseadas no USD para pelo menos permitir alguma conversão
  const defaultRates = {
    'EUR': 0.92, 
    'USD': 1.0,
    'GBP': 0.78, 
    'JPY': 150, 
    'BRL': 5.63, 
    'AUD': 1.52, 
    'CKD': 1.35, 
    'CUC': 1.0
  };
  
  // Gerar taxas aproximadas para a moeda desconhecida
  return defaultRates;
};

// Buscar lista de moedas suportadas
export const getSupportedCurrencies = async () => {
  try {
    // Verificar cache primeiro
    const cachedCurrenciesStr = await AsyncStorage.getItem('supported_currencies');
    
    if (cachedCurrenciesStr) {
      console.log('Usando lista de moedas em cache');
      return JSON.parse(cachedCurrenciesStr);
    }
    
    console.log('Buscando lista de moedas suportadas');
    
    // Obter lista de países e suas moedas
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies,cca2');
    const data = await response.json();
    
    // Extrair moedas únicas
    const currenciesMap = new Map();
    
    data.forEach(country => {
      if (country.currencies) {
        Object.entries(country.currencies).forEach(([code, details]) => {
          // Só adicionar se ainda não existir no map
          if (!currenciesMap.has(code)) {
            currenciesMap.set(code, {
              code,
              name: details.name,
              symbol: details.symbol || code,
              countries: [country.name.common]
            });
          } else {
            // Adicionar país à lista de países que usam essa moeda
            currenciesMap.get(code).countries.push(country.name.common);
          }
        });
      }
    });
    
    // Converter para array e ordenar por código
    const currencies = Array.from(currenciesMap.values())
      .sort((a, b) => a.code.localeCompare(b.code));
    
    // Salvar em cache
    await AsyncStorage.setItem('supported_currencies', JSON.stringify(currencies));
    
    return currencies;
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    
    // Tentar obter do cache mesmo que antigo
    try {
      const cachedCurrenciesStr = await AsyncStorage.getItem('supported_currencies');
      if (cachedCurrenciesStr) {
        return JSON.parse(cachedCurrenciesStr);
      }
    } catch (cacheError) {
      console.error('Error reading cache:', cacheError);
    }
    
    // Se tudo falhar, retornar lista hardcoded
    return getHardcodedCurrencies();
  }
};

// Moedas hard-coded para fallback
const getHardcodedCurrencies = () => {
  return Object.values(countryCurrencyMap).map(currency => ({
    ...currency,
    countries: [`Countries using ${currency.code}`]
  }));
};

// Função para converter valores entre moedas
export const convertCurrency = (amount, fromCurrency, toCurrency, rates) => {
  if (!rates || !amount || isNaN(amount)) {
    return null;
  }

  // Converter para números para garantir
  const value = parseFloat(amount);
  
  // Se são a mesma moeda, retornar o valor original
  if (fromCurrency === toCurrency) {
    return value;
  }

  // Verificar se a taxa para a moeda de destino existe
  if (!rates[toCurrency]) {
    console.error(`Taxa de conversão não encontrada para ${toCurrency}`);
    return null;
  }
  
  // Realizar a conversão
  const result = value * rates[toCurrency];
  return result;
};

// Get user's preferred currency from Supabase or AsyncStorage
export const getUserCurrency = async () => {
  try {
    // First try to get from Supabase if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.rpc('get_user_currency');
      
      if (!error && data) {
        // Also update local storage for offline use
        await AsyncStorage.setItem('user_preferred_currency', data);
        return data;
      }
    }
    
    // If Supabase failed or user not logged in, try local storage
    const currency = await AsyncStorage.getItem('user_preferred_currency');
    return currency || 'USD'; // Default to USD if not set
  } catch (error) {
    console.error('Error getting user currency:', error);
    return 'USD';
  }
};

// Save user's preferred currency to Supabase and AsyncStorage
export const setUserCurrency = async (currencyCode) => {
  try {
    // Save to AsyncStorage first for offline use
    await AsyncStorage.setItem('user_preferred_currency', currencyCode);
    
    // Try to save to Supabase if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.rpc('set_user_currency', { 
        code: currencyCode 
      });
      
      if (error) {
        console.warn('Failed to save currency preference to Supabase:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error setting user currency:', error);
    return false;
  }
};

export default {
  fetchLatestRates,
  getSupportedCurrencies,
  convertCurrency,
  countryCurrencyMap
}; 