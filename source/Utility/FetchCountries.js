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
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('app_currency', JSON.stringify(currentCurrencyInfo));
      } catch (storageError) {
        console.error('Error saving currency to storage:', storageError);
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
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const savedCurrency = await AsyncStorage.getItem('app_currency');
    
    if (savedCurrency) {
      const parsedCurrency = JSON.parse(savedCurrency);
      
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
    return { code: 'EUR', name: 'Euro', symbol: '€' };
  }
  return currentCurrencyInfo;
};

// Função para formatar valores monetários com o símbolo da moeda atual
export const formatCurrency = (value) => {
  const { symbol } = getCurrentCurrency();
  
  // Garantir que o valor seja um número
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return `${symbol}0.00`;
  }
  
  // Formatar o número com 2 casas decimais
  const formattedValue = numValue.toFixed(2);
  
  // Retornar o valor formatado com o símbolo da moeda
  return `${symbol}${formattedValue}`;
};

// Armazenar em cache as taxas de câmbio para evitar múltiplas chamadas à API
let exchangeRatesCache = {
  rates: {},
  lastUpdated: null,
  baseCurrency: null
};

// Configurações da API - substitua pela sua chave de API
const EXCHANGE_API_KEY = 'YOUR_API_KEY'; // Substitua pela sua chave real
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

// Função para buscar taxas de câmbio atualizadas
export const fetchExchangeRates = async (baseCurrency = 'EUR') => {
  try {
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
    console.log('Buscando taxas de câmbio atualizadas da API');
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/${baseCurrency}`);
    const data = await response.json();
    
    if (data.result === 'success') {
      // Atualizar cache
      exchangeRatesCache = {
        rates: data.conversion_rates,
        lastUpdated: now,
        baseCurrency
      };
      return data.conversion_rates;
    } else {
      throw new Error(`Erro na API: ${data.error_type}`);
    }
  } catch (error) {
    console.error('Erro ao buscar taxas de câmbio:', error);
    // Retornar cache expirado se disponível, ou objeto vazio
    return exchangeRatesCache.rates || {};
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
    
    // Formatar com o símbolo da moeda específica
    return `${country.currencySymbol}${parseFloat(value).toFixed(2)}`;
  } catch (error) {
    console.error('Erro ao formatar com código de moeda:', error);
    return `${value}`;
  }
};