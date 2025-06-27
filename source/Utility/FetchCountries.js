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
    console.log('Fetching countries from API...');
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
    
    console.log(`Successfully fetched ${data.length} countries from API`);
    
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
    
    console.log(`Processed ${countryList.length} valid countries`);
    return countryList;
  } catch (error) {
    console.error('Error fetching countries from API:', error);
    console.log('Using fallback countries data');
    return fallbackCountries.sort((a, b) => a.name.localeCompare(b.name));
  }
};

// Função para obter moeda pelo código ou nome do país
export const getCurrencyByCountryCode = async (countryCodeOrName) => {
  try {
    console.log(`Looking for currency info for: ${countryCodeOrName}`);
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
    
    // Procurar por código ou por nome do país
    const country = countries.find(
      c => c.code === countryCodeOrName || 
           c.name === countryCodeOrName ||
           c.name.toLowerCase() === countryCodeOrName.toLowerCase()
    );
    
    if (country && country.currency) {
      console.log(`Found currency for ${countryCodeOrName}:`, {
        code: country.currency,
        name: country.currencyName,
        symbol: country.currencySymbol
      });
      return {
        code: country.currency,
        name: country.currencyName,
        symbol: country.currencySymbol
      };
    } else {
      console.log(`Currency not found for country: ${countryCodeOrName}, using EUR as default`);
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

// Armazenar em cache a moeda atual para evitar múltiplas chamadas à API
let currentCurrencyInfo = null;

// Flag para indicar se os valores devem ser convertidos
let shouldConvertValues = true;

// Array de callbacks para notificar componentes quando a moeda for alterada
const currencyChangeListeners = [];

// Registrar um componente para receber notificações de alteração de moeda
export const addCurrencyChangeListener = (callback) => {
  if (typeof callback === 'function' && !currencyChangeListeners.includes(callback)) {
    currencyChangeListeners.push(callback);
    return true;
  }
  return false;
};

// Remover um listener quando o componente for desmontado
export const removeCurrencyChangeListener = (callback) => {
  const index = currencyChangeListeners.indexOf(callback);
  if (index !== -1) {
    currencyChangeListeners.splice(index, 1);
    return true;
  }
  return false;
};

// Notificar todos os componentes registrados sobre alteração de moeda
const notifyCurrencyChange = () => {
  currencyChangeListeners.forEach(callback => {
    try {
      callback(currentCurrencyInfo);
    } catch (error) {
      console.error('Error in currency change listener:', error);
    }
  });
};

// Definir a moeda atual para uso em toda a aplicação
export const setCurrentCurrency = async (countryCodeOrName) => {
  try {
    let currencyData = null;
    
    // Se é uma string, assumimos que é um código ou nome de país
    if (typeof countryCodeOrName === 'string') {
      currencyData = await getCurrencyByCountryCode(countryCodeOrName);
    } 
    // Se é um objeto, assumimos que já é um objeto de moeda
    else if (typeof countryCodeOrName === 'object' && countryCodeOrName !== null) {
      currencyData = countryCodeOrName;
    }
    
    // Se ainda não temos dados de moeda válidos, usar EUR como padrão
    if (!currencyData || !currencyData.code) {
      console.log('No valid currency data found, using EUR as default');
      currencyData = {
        code: 'EUR',
        name: 'Euro',
        symbol: '€'
      };
    }
    
    // Validar que os dados de moeda são válidos
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
      // Atualizar na Supabase (única fonte de verdade)
      await updateUserCurrencyPreference(currencyData);
      console.log('Currency saved to database:', currencyData.code);
    } catch (dbError) {
      console.error('Error saving currency to database:', dbError);
      // Continue with local update even if database fails
    }
    
    // Atualizar o cache local
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

// Função para carregar a moeda salva no início do aplicativo
export const loadSavedCurrency = async () => {
  try {
    // Carregar diretamente do Supabase
    const currencyInfo = await fetchUserCurrencyPreference();
    
          console.log('Currency loaded from Supabase:', currencyInfo);
    
    // Verificar se a moeda já está definida e é a mesma
    // Isso evita notificações desnecessárias que podem causar loops
    const isSameCurrency = currentCurrencyInfo && 
      currentCurrencyInfo.code === currencyInfo.code;
    
    if (!isSameCurrency) {
      currentCurrencyInfo = currencyInfo;
      // Só notificar se realmente houve mudança
      notifyCurrencyChange();
    } else {
      // Apenas atualizar a referência sem notificar
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
  // Verificar se temos a moeda em cache
  if (!currentCurrencyInfo) {
    // Se não temos, iniciar uma busca assíncrona e lançar erro
    if (!getCurrentCurrency.fetchingFromSupabase) {
      getCurrentCurrency.fetchingFromSupabase = true;
      
      // Iniciar busca assíncrona
      (async () => {
        try {
          currentCurrencyInfo = await fetchUserCurrencyPreference();
          notifyCurrencyChange();
          console.log('Currency updated based on Supabase:', currentCurrencyInfo);
        } catch (error) {
          console.error('Erro ao buscar moeda do Supabase:', error);
        } finally {
          getCurrentCurrency.fetchingFromSupabase = false;
        }
      })();
    }
    
    // Não temos valor até o carregamento ser concluído
    throw new Error('Currency not yet loaded. Please initialize currency first with loadSavedCurrency()');
  }
  return currentCurrencyInfo;
};

// Função para formatar valores monetários com o símbolo da moeda atual
export const formatCurrency = (value, forcedSymbol = null) => {
  // Se um símbolo foi fornecido, usá-lo diretamente
  if (forcedSymbol) {
    // Garantir que o valor seja um número
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      return `${forcedSymbol} 0.00`;
    }
    
    // Formatar o número com 2 casas decimais
    const formattedValue = numValue.toFixed(2);
    
    // Retornar o valor formatado com o símbolo da moeda e um espaço
    return `${forcedSymbol} ${formattedValue}`;
  }
  
  // Caso contrário, tentar obter do cache atual
  try {
    const currency = getCurrentCurrency();
    const symbol = currency?.symbol;
    if (!symbol) {
      return `$ ${parseFloat(value).toFixed(2)}`;
    }
    
    // Garantir que o valor seja um número
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      return `${symbol} 0.00`;
    }
    
    // Formatar o número com 2 casas decimais
    const formattedValue = numValue.toFixed(2);
    
    // Retornar o valor formatado com o símbolo da moeda e um espaço
    return `${symbol} ${formattedValue}`;
  } catch (error) {
    // Se não foi possível obter a moeda, usar $ como padrão
    console.log('Currency not loaded yet, using default symbol');
    const numValue = parseFloat(value);
    return `$ ${isNaN(numValue) ? '0.00' : numValue.toFixed(2)}`;
  }
};

// Armazenar em cache as taxas de câmbio para evitar múltiplas chamadas à API
let exchangeRatesCache = {
  rates: {},
  lastUpdated: null,
  baseCurrency: null
};

// Configurações da API - substitua pela sua chave de API
const EXCHANGE_API_KEY = 'de3d3cc388a2679655798ec7'; // Adicionada chave pública
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

// No longer using fixed rates

// Função para buscar taxas de câmbio atualizadas
export const fetchExchangeRates = async (baseCurrency = 'EUR') => {
  try {
    console.log(`Buscando taxas para ${baseCurrency}...`);
    
    // Verificar cache primeiro
    const now = new Date();
    if (
      exchangeRatesCache.lastUpdated &&
      exchangeRatesCache.baseCurrency === baseCurrency &&
      now - exchangeRatesCache.lastUpdated < CACHE_DURATION
    ) {
      console.log('Usando taxas de câmbio em cache');
      return exchangeRatesCache.rates;
    }

    // Se não houver cache válido, buscar da API
    console.log(`Buscando taxas de câmbio da API para ${baseCurrency}`);
    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/${baseCurrency}`);
      const data = await response.json();
      
      if (data.result === 'success') {
        // Atualizar cache
        exchangeRatesCache = {
          rates: data.conversion_rates,
          lastUpdated: now,
          baseCurrency
        };
        console.log(`Taxas recebidas da API: ${Object.keys(data.conversion_rates).length} moedas`);
        console.log(`Exemplos: 1 ${baseCurrency} = ${data.conversion_rates.USD} USD, ${data.conversion_rates.GBP} GBP`);
        return data.conversion_rates;
      } else {
        console.error(`Erro na API: ${data.error_type}`);
        throw new Error(`Erro na API: ${data.error_type}`);
      }
    } catch (apiError) {
      console.error('Erro ao buscar taxas de câmbio da API:', apiError);
      
      // No longer using fixed rates as a fallback
      throw new Error('Currently our currency exchange services are unavailable. Try again later!');
    }
  } catch (error) {
    console.error('Erro geral ao buscar taxas de câmbio:', error);
    
    // No longer using cache or fixed rates
    throw new Error('Currently our currency exchange services are unavailable. Try again later!');
  }
};

// Função para converter valores entre moedas
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    // Garantir que o valor seja um número
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      throw new Error('Valor inválido para conversão');
    }
    
    // Se as moedas forem iguais, não precisa converter
    if (fromCurrency === toCurrency) {
      return numAmount;
    }
    
    // Buscar as taxas com base na moeda de origem
    const rates = await fetchExchangeRates(fromCurrency);
    
    // Verificar se a taxa para a moeda de destino existe
    if (!rates[toCurrency]) {
      throw new Error(`Taxa de câmbio não disponível para ${toCurrency}`);
    }
    
    // Converter o valor
    const convertedAmount = numAmount * rates[toCurrency];
    return convertedAmount;
  } catch (error) {
    console.error('Erro ao converter moeda:', error);
    return null;
  }
};

// Função para formatar valores monetários com uma moeda específica
export const formatCurrencyWithCode = async (value, currencyCode = null) => {
  try {
    // Se não especificar moeda, usar a atual
    if (!currencyCode) {
      return formatCurrency(value);
    }
    
    // Obter informações da moeda
    const countries = await fetchCountries();
    const country = countries.find(c => c.currency === currencyCode);
    
    // Se não encontrar, usar formatação padrão
    if (!country || !country.currencySymbol) {
      return `${currencyCode} ${parseFloat(value).toFixed(2)}`;
    }
    
    // Formatar com o símbolo da moeda específica e um espaço
    return `${country.currencySymbol} ${parseFloat(value).toFixed(2)}`;
  } catch (error) {
    console.error('Erro ao formatar com código de moeda:', error);
    return `${value}`;
  }
};

// Função para verificar se os valores devem ser convertidos
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
        console.log('Converted all financial data to', currentCurrency.code);
      }
    }
    
    // Return the current setting
    return shouldConvertValues;
  } catch (error) {
    console.error('Error setting currency conversion preference:', error);
    throw new Error('Failed to update currency conversion preference');
  }
};