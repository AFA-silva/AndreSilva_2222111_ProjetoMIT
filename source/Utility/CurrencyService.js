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
      const currencies = data.supported_codes.map(code => {
        const currencyCode = code[0];
        const currencyInfo = {
          code: currencyCode,
          name: code[1],
          countries: []
        };
        
        // Remove country information lookup that was causing the error
        // We'll populate this data from different sources or directly from the API
        
        return currencyInfo;
      });
      
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
  // Validate inputs
  if (amount === null || amount === undefined || isNaN(parseFloat(amount))) {
    console.warn('Invalid amount for currency conversion:', amount);
    return 0;
  }
  
  // Ensure amount is a number
  const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : parseFloat(amount);
  
  if (!fromCurrency || !toCurrency) {
    console.warn('Invalid currencies for conversion:', { from: fromCurrency, to: toCurrency });
    return numAmount;
  }
  
  if (!rates || typeof rates !== 'object') {
    console.warn('No valid rates provided for currency conversion');
    return numAmount;
  }
  
  // If same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return numAmount;
  }
  
  // Direct conversion if rates are based on fromCurrency
  if (rates[toCurrency]) {
    const rate = rates[toCurrency];
    // Validate the rate is a valid number
    if (isNaN(parseFloat(rate)) || parseFloat(rate) <= 0) {
      console.warn(`Invalid conversion rate for ${fromCurrency} to ${toCurrency}: ${rate}`);
      return numAmount;
    }
    
    const convertedAmount = numAmount * parseFloat(rate);
    console.log(`Converted ${numAmount} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency} (rate: ${rate})`);
    return convertedAmount;
  }
  
  console.warn(`Conversion rate not found for ${fromCurrency} to ${toCurrency}`);
  return numAmount;
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

export const convertCurrencyForUserData = async (fromCurrency, toCurrency) => {
  try {
    // Não converter se as moedas forem iguais
    if (fromCurrency === toCurrency) {
      console.log('Moedas iguais, conversão não necessária');
      return { success: true, skipped: true };
    }
    
    // 1. Obter a sessão do usuário
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return { success: false, error: 'Usuário não autenticado' };
    
    const userId = session.user.id;
    console.log(`Iniciando conversão de ${fromCurrency} para ${toCurrency} para usuário ${userId}`);
    
    // 2. Obter taxa de conversão
    let rate = null;
    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/de3d3cc388a2679655798ec7/latest/${fromCurrency}`);
      if (!response.ok) throw new Error('Resposta da API inválida');
      
      const data = await response.json();
      if (data.result !== 'success') throw new Error('API retornou erro');
      
      rate = data.conversion_rates[toCurrency];
      if (!rate) throw new Error(`Taxa para ${toCurrency} não disponível`);
      
      console.log(`Taxa obtida: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
    } catch (apiError) {
      console.error('Erro ao obter taxa de câmbio:', apiError);
      // Em caso de falha, manter moeda atual e informar o erro
      return { 
        success: false, 
        error: 'Não foi possível obter taxa de câmbio. Mantendo moeda atual.'
      };
    }
    
    // 3. Converter receitas e despesas com controle de versão
    await Promise.all([
      convertIncomes(userId, fromCurrency, toCurrency, rate),
      convertExpenses(userId, fromCurrency, toCurrency, rate)
    ]);
    
    // 4. Atualizar preferência de moeda do usuário
    await updateUserCurrencyPreference(userId, toCurrency, fromCurrency);
    
    return { success: true };
  } catch (error) {
    console.error('Erro na conversão de moeda:', error);
    return { success: false, error: error.message };
  }
};

// Função para converter receitas
async function convertIncomes(userId, fromCurrency, toCurrency, rate) {
  // Buscar receitas
  const { data: incomes, error } = await supabase
    .from('income')
    .select('*')
    .eq('user_id', userId);
  
  if (error || !incomes) {
    console.error('Erro ao buscar receitas:', error);
    return;
  }
  
  // Converter cada receita usando a meta de última moeda para prevenir conversões em cascata
  for (const income of incomes) {
    // Verificar flag de última moeda para evitar conversões em cascata
    const lastCurrency = income.last_converted_currency || fromCurrency;
    let newAmount;
    
    if (lastCurrency === fromCurrency) {
      // Conversão direta
      newAmount = parseFloat(income.amount) * rate;
    } else {
      // Se última moeda for diferente, precisamos fazer correção para evitar cascata
      console.log(`Atenção: Receita ${income.id} foi previamente convertida de ${lastCurrency}`);
      // Usar valor original se disponível, ou fazer melhor estimativa
      newAmount = income.original_amount ? 
        parseFloat(income.original_amount) * rate : 
        parseFloat(income.amount) * rate;
    }
    
    // Atualizar receita com novo valor e flags de controle
    await supabase
      .from('income')
      .update({
        amount: newAmount,
        last_converted_currency: toCurrency,
        original_amount: income.original_amount || income.amount // Preserva o valor original
      })
      .eq('id', income.id);
  }
}

// Função para converter despesas
async function convertExpenses(userId, fromCurrency, toCurrency, rate) {
  // Buscar despesas
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId);
  
  if (error || !expenses) {
    console.error('Erro ao buscar despesas:', error);
    return;
  }
  
  // Converter cada despesa
  for (const expense of expenses) {
    // Verificar flag de última moeda para evitar conversões em cascata
    const lastCurrency = expense.last_converted_currency || fromCurrency;
    let newAmount;
    
    if (lastCurrency === fromCurrency) {
      // Conversão direta
      newAmount = parseFloat(expense.amount) * rate;
    } else {
      // Se última moeda for diferente, precisamos fazer correção para evitar cascata
      console.log(`Atenção: Despesa ${expense.id} foi previamente convertida de ${lastCurrency}`);
      // Usar valor original se disponível, ou fazer melhor estimativa
      newAmount = expense.original_amount ? 
        parseFloat(expense.original_amount) * rate : 
        parseFloat(expense.amount) * rate;
    }
    
    // Atualizar despesa com novo valor e flags de controle
    await supabase
      .from('expenses')
      .update({
        amount: newAmount,
        last_converted_currency: toCurrency,
        original_amount: expense.original_amount || expense.amount // Preserva o valor original
      })
      .eq('id', expense.id);
  }
}

// Atualizar preferência de moeda
async function updateUserCurrencyPreference(userId, newCurrency, previousCurrency) {
  try {
    // Limpar preferências existentes para evitar duplicatas
    await supabase
      .from('user_currency_preferences')
      .delete()
      .eq('user_id', userId);
      
    // Criar nova preferência
    await supabase
      .from('user_currency_preferences')
      .insert({
        user_id: userId,
        actual_currency: newCurrency,
        previous_currency: previousCurrency,
        updated_at: new Date().toISOString()
      });
      
    // Atualizar AsyncStorage também para redundância
    await AsyncStorage.setItem('user_preferred_currency', newCurrency);
    
    console.log(`Preferência de moeda atualizada: ${newCurrency} (anterior: ${previousCurrency})`);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar preferência de moeda:', error);
    return false;
  }
} 