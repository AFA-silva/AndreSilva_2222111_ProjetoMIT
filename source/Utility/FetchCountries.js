import { fetchUserCurrencyPreference, updateUserCurrencyPreference } from './MainQueries';

export const fetchCountries = async () => {
    try {
      const response = await fetch('https://restcountries.com/v3.1/all');
      const data = await response.json();
      const countryList = data
        .map((country) => ({
          name: country.name.common,
          code: country.cca2,
          currency: country.currencies ? Object.keys(country.currencies)[0] : null,
          currencyName: country.currencies ? country.currencies[Object.keys(country.currencies)[0]].name : null,
          currencySymbol: country.currencies ? country.currencies[Object.keys(country.currencies)[0]].symbol : null
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return countryList;
    } catch (error) {
      console.error('Error fetching countries:', error);
      return [];
    }
  };

// Função para obter moeda pelo código ou nome do país
export const getCurrencyByCountryCode = async (countryCodeOrName) => {
  try {
    const countries = await fetchCountries();
    // Procurar por código ou por nome do país
    const country = countries.find(
      c => c.code === countryCodeOrName || c.name === countryCodeOrName
    );
    return country ? {
      code: country.currency,
      name: country.currencyName,
      symbol: country.currencySymbol
    } : null;
  } catch (error) {
    console.error('Error getting currency:', error);
    return null;
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
    // Se é uma string, assumimos que é um código ou nome de país
    if (typeof countryCodeOrName === 'string') {
      currentCurrencyInfo = await getCurrencyByCountryCode(countryCodeOrName);
    } 
    // Se é um objeto, assumimos que já é um objeto de moeda
    else if (typeof countryCodeOrName === 'object' && countryCodeOrName !== null) {
      currentCurrencyInfo = countryCodeOrName;
    }
    
    // Salvar a moeda atual no AsyncStorage para persistência
    if (currentCurrencyInfo) {
      // Atualizar no AsyncStorage
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('app_currency', JSON.stringify(currentCurrencyInfo));
        console.log('Currency saved to AsyncStorage:', currentCurrencyInfo.code);
      } catch (storageError) {
        console.error('Error saving currency to AsyncStorage:', storageError);
      }
      
      // Atualizar na Supabase (crucial para sincronização entre dispositivos)
      try {
        await updateUserCurrencyPreference(currentCurrencyInfo.code);
        console.log('Currency saved to Supabase:', currentCurrencyInfo.code);
      } catch (supabaseError) {
        console.error('Error saving currency to Supabase:', supabaseError);
      }
      
      // Notificar todos os componentes registrados
      notifyCurrencyChange();
    }
    
    return currentCurrencyInfo;
  } catch (error) {
    console.error('Error setting current currency:', error);
    return null;
  }
};

// Função para carregar a moeda salva no início do aplicativo
export const loadSavedCurrency = async () => {
  try {
    // Tentar carregar do Supabase primeiro (prioridade)
    try {
      const currencyCode = await fetchUserCurrencyPreference();
      if (currencyCode) {
        console.log('Moeda carregada do Supabase:', currencyCode);
        const currencyInfo = await getCurrencyByCountryCode(currencyCode);
        if (currencyInfo) {
          currentCurrencyInfo = currencyInfo;
          notifyCurrencyChange();
          return currentCurrencyInfo;
        }
      }
    } catch (supabaseError) {
      console.error('Erro ao carregar moeda do Supabase:', supabaseError);
      // Continuar para tentar carregar do AsyncStorage
    }
    
    // Carregar do AsyncStorage como fallback
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const savedCurrency = await AsyncStorage.getItem('app_currency');
    
    // Carregar a preferência de conversão
    try {
      const convertValues = await AsyncStorage.getItem('convert_currency_values');
      if (convertValues !== null) {
        shouldConvertValues = convertValues === 'true';
        console.log('Preferência de conversão carregada:', shouldConvertValues);
      }
    } catch (error) {
      console.error('Erro ao carregar preferência de conversão:', error);
    }
    
    if (savedCurrency) {
      const parsedCurrency = JSON.parse(savedCurrency);
      console.log('Moeda carregada do AsyncStorage:', parsedCurrency);
      
      // Se a moeda global tem uma configuração de conversão, usá-la
      if (parsedCurrency.hasOwnProperty('convertValues')) {
        shouldConvertValues = parsedCurrency.convertValues;
        console.log('Usando preferência de conversão da moeda:', shouldConvertValues);
      }
      
      // Verificar se a moeda já está definida e é a mesma
      // Isso evita notificações desnecessárias que podem causar loops
      const isSameCurrency = currentCurrencyInfo && 
        currentCurrencyInfo.code === parsedCurrency.code;
      
      if (!isSameCurrency) {
        currentCurrencyInfo = parsedCurrency;
        // Só notificar se realmente houve mudança
        notifyCurrencyChange();
      } else {
        // Apenas atualizar a referência sem notificar
        currentCurrencyInfo = parsedCurrency;
      }
      
      return currentCurrencyInfo;
    }
    
    return null;
  } catch (error) {
    console.error('Error loading saved currency:', error);
    return null;
  }
};

// Obter a moeda atual do cache
export const getCurrentCurrency = () => {
  // Valor padrão caso não tenha sido definido
  if (!currentCurrencyInfo) {
    // Tentar buscar do Supabase em modo síncrono
    if (!getCurrentCurrency.fetchingFromSupabase) {
      getCurrentCurrency.fetchingFromSupabase = true;
      
      // Iniciar busca assíncrona
      (async () => {
        try {
          const currencyCode = await fetchUserCurrencyPreference();
          if (currencyCode) {
            console.log('Buscando moeda do Supabase:', currencyCode);
            const currencyInfo = await getCurrencyByCountryCode(currencyCode);
            if (currencyInfo) {
              currentCurrencyInfo = currencyInfo;
              notifyCurrencyChange();
              console.log('Moeda atualizada com base no Supabase:', currentCurrencyInfo);
            }
          }
        } catch (error) {
          console.error('Erro ao buscar moeda do Supabase:', error);
        } finally {
          getCurrentCurrency.fetchingFromSupabase = false;
        }
      })();
    }
    
    // Usar um valor padrão baseado no Supabase (default USD em vez de EUR)
    return { code: 'USD', name: 'US Dollar', symbol: '$' };
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
  
  // Caso contrário, obter do cache atual
  const currency = getCurrentCurrency();
  const symbol = currency?.symbol || '$'; // Usar $ como símbolo de fallback em vez de €
  
  // Garantir que o valor seja um número
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return `${symbol} 0.00`;
  }
  
  // Formatar o número com 2 casas decimais
  const formattedValue = numValue.toFixed(2);
  
  // Retornar o valor formatado com o símbolo da moeda e um espaço
  return `${symbol} ${formattedValue}`;
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

// Taxas fixas para uso quando a API falhar
const FIXED_RATES = {
  'EUR': { 'USD': 1.09, 'GBP': 0.85, 'BRL': 6.13 },
  'USD': { 'EUR': 0.92, 'GBP': 0.78, 'BRL': 5.63 },
  'GBP': { 'EUR': 1.17, 'USD': 1.28, 'BRL': 7.18 },
  'BRL': { 'EUR': 0.16, 'USD': 0.18, 'GBP': 0.14 }
};

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
      
      // Se a API falhar, usar taxas fixas de emergência
      if (FIXED_RATES[baseCurrency]) {
        console.log(`Usando taxas fixas para ${baseCurrency}`, FIXED_RATES[baseCurrency]);
        return FIXED_RATES[baseCurrency];
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error('Erro geral ao buscar taxas de câmbio:', error);
    
    // Retornar cache expirado se disponível
    if (exchangeRatesCache.rates && exchangeRatesCache.baseCurrency === baseCurrency) {
      console.log('Usando cache expirado como fallback');
      return exchangeRatesCache.rates;
    }
    
    // Ou retornar taxas fixas como último recurso
    if (FIXED_RATES[baseCurrency]) {
      console.log('Usando taxas fixas de emergência');
      return FIXED_RATES[baseCurrency];
    }
    
    // Se tudo falhar, retornar objeto vazio
    return {};
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