import { fetchUserCurrencyPreference, updateUserCurrencyPreference } from './MainQueries';
import { supabase } from '../../Supabase';
import { convertCurrencyForUserData } from './CurrencyService';

// Fallback countries data in case API fails
const fallbackCountries = [
  { name: 'Portugal', code: 'PT', currency: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { name: 'Spain', code: 'ES', currency: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { name: 'France', code: 'FR', currency: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { name: 'Germany', code: 'DE', currency: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { name: 'Italy', code: 'IT', currency: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { name: 'United Kingdom', code: 'GB', currency: 'GBP', currencyName: 'British Pound', currencySymbol: '£' },
  { name: 'United States', code: 'US', currency: 'USD', currencyName: 'US Dollar', currencySymbol: '$' },
  { name: 'Brazil', code: 'BR', currency: 'BRL', currencyName: 'Brazilian Real', currencySymbol: 'R$' },
  { name: 'Canada', code: 'CA', currency: 'CAD', currencyName: 'Canadian Dollar', currencySymbol: 'C$' },
  { name: 'Japan', code: 'JP', currency: 'JPY', currencyName: 'Japanese Yen', currencySymbol: '¥' },
  { name: 'Australia', code: 'AU', currency: 'AUD', currencyName: 'Australian Dollar', currencySymbol: 'A$' },
  { name: 'Switzerland', code: 'CH', currency: 'CHF', currencyName: 'Swiss Franc', currencySymbol: 'CHF' },
  { name: 'Norway', code: 'NO', currency: 'NOK', currencyName: 'Norwegian Krone', currencySymbol: 'kr' },
  { name: 'Sweden', code: 'SE', currency: 'SEK', currencyName: 'Swedish Krona', currencySymbol: 'kr' },
  { name: 'Denmark', code: 'DK', currency: 'DKK', currencyName: 'Danish Krone', currencySymbol: 'kr' }
];

export const fetchCountries = async () => {
  try {
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,currencies');
    
    // Check if response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate that data is an array
    if (!Array.isArray(data)) {
      console.error('API returned invalid data format:', typeof data);
      throw new Error('Invalid data format from API');
    }
    
    const countryList = data
      .filter(country => country && country.name && country.name.common) // Filter out invalid entries
      .map((country) => {
        try {
          return {
            name: country.name.common,
            code: country.cca2,
            currency: country.currencies ? Object.keys(country.currencies)[0] : null,
            currencyName: country.currencies ? country.currencies[Object.keys(country.currencies)[0]]?.name : null,
            currencySymbol: country.currencies ? country.currencies[Object.keys(country.currencies)[0]]?.symbol : null
          };
        } catch (mapError) {
          console.warn('Error mapping country:', country.name?.common, mapError);
          return null;
        }
      })
      .filter(country => country !== null) // Remove null entries
      .sort((a, b) => a.name.localeCompare(b.name));
    
    return countryList;
  } catch (error) {
    console.error('Error fetching countries from API:', error);
    return fallbackCountries.sort((a, b) => a.name.localeCompare(b.name));
  }
};

// Function to get currency by country code or name
export const getCurrencyByCountryCode = async (countryCodeOrName) => {
  try {
    const countries = await fetchCountries();
    
    if (!Array.isArray(countries) || countries.length === 0) {
      console.error('No countries data available');
      // Return default EUR if no countries data
      return {
        code: 'EUR',
        name: 'Euro',
        symbol: '€'
      };
    }
    
    // Search by code or country name
    const country = countries.find(
      c => c.code === countryCodeOrName || 
           c.name === countryCodeOrName ||
           c.name.toLowerCase() === countryCodeOrName.toLowerCase()
    );
    
    if (country && country.currency) {
      return {
        code: country.currency,
        name: country.currencyName,
        symbol: country.currencySymbol
      };
    } else {
      // Return EUR as default when country is not found
      return {
        code: 'EUR',
        name: 'Euro',
        symbol: '€'
      };
    }
  } catch (error) {
    console.error('Error getting currency:', error);
    // Return EUR as default in case of error
    return {
      code: 'EUR',
      name: 'Euro',
      symbol: '€'
    };
  }
};

// Cache current currency to avoid multiple API calls
let currentCurrencyInfo = null;

// Flag para indicar se os valores devem ser convertidos
let shouldConvertValues = true;

// Array de callbacks para notificar componentes quando a moeda for alterada
const currencyChangeListeners = [];

// Register a component to receive currency change notifications
export const addCurrencyChangeListener = (callback) => {
  if (typeof callback === 'function' && !currencyChangeListeners.includes(callback)) {
    currencyChangeListeners.push(callback);
    return true;
  }
  return false;
};

// Remove a listener when component is unmounted
export const removeCurrencyChangeListener = (callback) => {
  const index = currencyChangeListeners.indexOf(callback);
  if (index !== -1) {
    currencyChangeListeners.splice(index, 1);
    return true;
  }
  return false;
};

// Notify all registered components about currency change
const notifyCurrencyChange = () => {
  currencyChangeListeners.forEach(callback => {
    try {
      callback(currentCurrencyInfo);
    } catch (error) {
      console.error('Error in currency change listener:', error);
    }
  });
};

// Define current currency for use throughout the application
export const setCurrentCurrency = async (countryCodeOrName) => {
  try {
    let currencyData = null;
    
    // If it's a string, assume it's a country code or name
    if (typeof countryCodeOrName === 'string') {
      currencyData = await getCurrencyByCountryCode(countryCodeOrName);
    } 
          // If it's an object, assume it's already a currency object
    else if (typeof countryCodeOrName === 'object' && countryCodeOrName !== null) {
      currencyData = countryCodeOrName;
    }
    
          // If we still don't have valid currency data, use EUR as default
    if (!currencyData || !currencyData.code) {
      currencyData = {
        code: 'EUR',
        name: 'Euro',
        symbol: '€'
      };
    }
    
          // Validate that currency data is valid
    if (!currencyData.code || !currencyData.symbol) {
      console.error('Invalid currency data structure:', currencyData);
      // Use EUR as fallback
      currencyData = {
        code: 'EUR',
        name: 'Euro',
        symbol: '€'
      };
    }
    
    try {
      // Update in Supabase (single source of truth)
      await updateUserCurrencyPreference(currencyData);
    } catch (dbError) {
      console.error('Error saving currency to database:', dbError);
      // Continue with local update even if database fails
    }
    
          // Update local cache
    currentCurrencyInfo = currencyData;
    
    // Notificar todos os componentes registrados
    notifyCurrencyChange();
    
    return currentCurrencyInfo;
  } catch (error) {
    console.error('Error setting current currency:', error);
    
    // Set EUR as fallback and continue
    const fallbackCurrency = {
      code: 'EUR',
      name: 'Euro',
      symbol: '€'
    };
    
    currentCurrencyInfo = fallbackCurrency;
    notifyCurrencyChange();
    
    return currentCurrencyInfo;
  }
};

// Function to load saved currency at app startup
export const loadSavedCurrency = async () => {
  try {
    // Carregar diretamente do Supabase
    const currencyInfo = await fetchUserCurrencyPreference();
    
    // Check if currency is already defined and is the same
    // This avoids unnecessary notifications that could cause loops
    const isSameCurrency = currentCurrencyInfo && 
      currentCurrencyInfo.code === currencyInfo.code;
    
    if (!isSameCurrency) {
      currentCurrencyInfo = currencyInfo;
              // Only notify if there was actually a change
      notifyCurrencyChange();
    } else {
              // Just update the reference without notifying
      currentCurrencyInfo = currencyInfo;
    }
    
    return currentCurrencyInfo;
  } catch (error) {
    console.error('Error loading saved currency:', error);
    throw new Error('Currency service unavailable');
  }
};

// Obter a moeda atual do cache
export const getCurrentCurrency = () => {
  // If we don't have it, start an asynchronous search and throw error
  if (!currentCurrencyInfo) {
    getCurrentCurrency.fetchingFromSupabase = true;
    
    // Start asynchronous search
    loadSavedCurrency().then(() => {
      getCurrentCurrency.fetchingFromSupabase = false;
    }).catch(() => {
      getCurrentCurrency.fetchingFromSupabase = false;
    });
    
    // We don't have a value until loading is completed
    throw new Error('Currency not loaded yet');
  }
  return currentCurrencyInfo;
};

// Function to format monetary values with current currency symbol
export const formatCurrency = (value, forcedSymbol = null) => {
  // If a symbol was provided, use it directly
  if (forcedSymbol) {
    // Ensure the value is a number
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return `${forcedSymbol} 0.00`;
    }
    
    // Format the number with 2 decimal places
    const formattedValue = numValue.toFixed(2);
    // Return the formatted value with the currency symbol and a space
    return `${forcedSymbol} ${formattedValue}`;
  }
  
  // Otherwise, try to get from current cache
  const currentCurrency = getCurrentCurrency();
  if (currentCurrency && currentCurrency.symbol) {
    // Ensure the value is a number
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return `${currentCurrency.symbol} 0.00`;
    }
    
    // Format the number with 2 decimal places
    const formattedValue = numValue.toFixed(2);
    // Return the formatted value with the currency symbol and a space
    return `${currentCurrency.symbol} ${formattedValue}`;
  }
  
  // If we couldn't get the currency, use $ as default
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return '$ 0.00';
  }
  return `$ ${numValue.toFixed(2)}`;
};

// Cache exchange rates to avoid multiple API calls
let exchangeRatesCache = {
  rates: {},
  lastUpdated: null,
  baseCurrency: null
};

// API configuration - replace with your API key
const EXCHANGE_API_KEY = 'de3d3cc388a2679655798ec7'; // Added public key
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// No longer using fixed rates

// Function to fetch updated exchange rates
export const fetchExchangeRates = async (baseCurrency = 'EUR') => {
  try {
    // Verificar cache primeiro
    const now = new Date();
    if (
      exchangeRatesCache.lastUpdated &&
      exchangeRatesCache.baseCurrency === baseCurrency &&
      now - exchangeRatesCache.lastUpdated < CACHE_DURATION
    ) {
      return exchangeRatesCache.rates;
    }

    // If there's no valid cache, fetch from API
    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/${baseCurrency}`);
      const data = await response.json();
      
      if (data.result === 'success') {
        // Update cache
        exchangeRatesCache = {
          rates: data.conversion_rates,
          lastUpdated: new Date(),
          baseCurrency: baseCurrency
        };
        
        return data.conversion_rates;
      } else {
        throw new Error(data.error || 'Failed to fetch exchange rates');
      }
    } catch (apiError) {
      console.error('Error fetching exchange rates from API:', apiError);
      
      // No longer using fixed rates as a fallback
      throw new Error('Exchange rate service unavailable');
    }
  } catch (error) {
    console.error('General error fetching exchange rates:', error);
    
    // No longer using cache or fixed rates
    throw new Error('Currently our currency exchange services are unavailable. Try again later!');
  }
};

// Function to convert values between currencies
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    // Ensure the value is a number
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      throw new Error('Invalid value for conversion');
    }
    
    // If currencies are the same, no need to convert
    if (fromCurrency === toCurrency) {
      return numAmount;
    }
    
    // Fetch rates based on source currency
    const rates = await fetchExchangeRates(fromCurrency);
    
    // Check if the rate for the target currency exists
    if (!rates[toCurrency]) {
      throw new Error(`Exchange rate not available for ${toCurrency}`);
    }
    
    return numAmount * rates[toCurrency];
  } catch (error) {
    console.error('Error converting currency:', error);
    return null;
  }
};

// Function to format monetary values with a specific currency
export const formatCurrencyWithCode = async (value, currencyCode) => {
  try {
    // If no currency specified, use current one
    if (!currencyCode) {
      return formatCurrency(value);
    }
    
    // Get currency information
    const country = await getCurrencyByCountryCode(currencyCode);
    
    // If not found, use default formatting
    if (!country || !country.currencySymbol) {
      return `${value}`;
    }
    
    // Format with the specific currency symbol and a space
    return `${country.currencySymbol} ${parseFloat(value).toFixed(2)}`;
  } catch (error) {
    console.error('Error formatting with currency code:', error);
    return `${value}`;
  }
};

// Function to check if values should be converted
export const shouldConvertCurrencyValues = () => {
  return shouldConvertValues;
};

// New function to handle currency conversion preference
export const setCurrencyConversionPreference = async (shouldConvert, userId) => {
  try {
    // Update local state
    shouldConvertValues = shouldConvert;
    
    // If true, convert values and update them in the database
    if (shouldConvert && userId) {
      // Get current currency
      const currentCurrency = getCurrentCurrency();
      
      // Get previous currency (we need this for conversion)
      const { data } = await supabase
        .from('user_currency_preferences')
        .select('previous_currency')
        .eq('user_id', userId)
        .single();
      
      const previousCurrency = data?.previous_currency || 'USD';
      
      if (currentCurrency.code !== previousCurrency) {
        // Convert all financial data in database
        await convertCurrencyForUserData(previousCurrency, currentCurrency.code);
      }
    }
    
    // Return the current setting
    return shouldConvertValues;
  } catch (error) {
    console.error('Error setting currency conversion preference:', error);
    throw new Error('Failed to update currency conversion preference');
  }
};