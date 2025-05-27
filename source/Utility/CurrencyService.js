import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../Supabase';

const API_KEY = 'de3d3cc388a2679655798ec7';
const BASE_URL = 'https://v6.exchangerate-api.com/v6';

// Helper function to check if cached data is older than the specified time
const isCacheExpired = (timestamp, expiryTimeInHours = 24) => {
  const now = new Date().getTime();
  const expiryTime = expiryTimeInHours * 60 * 60 * 1000; // Convert hours to milliseconds
  return now - timestamp > expiryTime;
};

export const fetchLatestRates = async (baseCurrency = 'USD') => {
  try {
    // Check if we have cached data
    const cachedData = await AsyncStorage.getItem(`currency_rates_${baseCurrency}`);
    
    if (cachedData) {
      const { timestamp, rates } = JSON.parse(cachedData);
      
      // If cache is still valid, return cached data
      if (!isCacheExpired(timestamp)) {
        return rates;
      }
    }
    
    // If no cache or cache expired, fetch new data
    const response = await fetch(`${BASE_URL}/${API_KEY}/latest/${baseCurrency}`);
    const data = await response.json();
    
    if (data.result === 'success') {
      // Store the new data in cache
      const cacheData = {
        timestamp: new Date().getTime(),
        rates: data.conversion_rates
      };
      
      await AsyncStorage.setItem(`currency_rates_${baseCurrency}`, JSON.stringify(cacheData));
      
      return data.conversion_rates;
    } else {
      throw new Error(data.error || 'Failed to fetch exchange rates');
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    throw error;
  }
};

export const getSupportedCurrencies = async () => {
  try {
    // Check if we have cached data
    const cachedData = await AsyncStorage.getItem('supported_currencies');
    
    if (cachedData) {
      const { timestamp, currencies } = JSON.parse(cachedData);
      
      // If cache is still valid, return cached data
      if (!isCacheExpired(timestamp, 168)) { // Cache for 1 week (168 hours)
        return currencies;
      }
    }
    
    // If no cache or cache expired, fetch new data
    const response = await fetch(`${BASE_URL}/${API_KEY}/codes`);
    const data = await response.json();
    
    if (data.result === 'success') {
      // Format the data into a more usable structure
      const currencies = data.supported_codes.map(code => ({
        code: code[0],
        name: code[1]
      }));
      
      // Store the new data in cache
      const cacheData = {
        timestamp: new Date().getTime(),
        currencies
      };
      
      await AsyncStorage.setItem('supported_currencies', JSON.stringify(cacheData));
      
      return currencies;
    } else {
      throw new Error(data.error || 'Failed to fetch supported currencies');
    }
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    throw error;
  }
};

export const convertCurrency = (amount, fromCurrency, toCurrency, rates) => {
  if (!rates) return null;
  
  // Direct conversion if rates are based on fromCurrency
  if (rates[toCurrency]) {
    return amount * rates[toCurrency];
  }
  
  return null;
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