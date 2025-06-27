import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../Supabase';

const API_KEY = 'b1a52eae5ec86b3e274823dd';
const BASE_URL = 'https://v6.exchangerate-api.com/v6';

// No longer using cache expiry management

export const fetchLatestRates = async (baseCurrency = 'USD') => {
  try {
    // Always fetch fresh data from API
    const response = await fetch(`${BASE_URL}/${API_KEY}/latest/${baseCurrency}`);
    const data = await response.json();
    
    if (data.result === 'success') {
      // Store the data in AsyncStorage for potential offline use
      await AsyncStorage.setItem(`currency_rates_${baseCurrency}`, JSON.stringify({
        timestamp: new Date().getTime(),
        rates: data.conversion_rates
      }));
      
      return data.conversion_rates;
    } else {
      // If API fails, try to get data from AsyncStorage
      const cachedData = await AsyncStorage.getItem(`currency_rates_${baseCurrency}`);
      
      if (cachedData) {
        const { rates } = JSON.parse(cachedData);
        return rates;
      }
      
      throw new Error(data.error || 'Failed to fetch exchange rates');
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Last resort - check if there's any saved data
    try {
      const cachedData = await AsyncStorage.getItem(`currency_rates_${baseCurrency}`);
      
      if (cachedData) {
        const { rates } = JSON.parse(cachedData);
        return rates;
      }
    } catch (storageError) {
      console.error('Failed to read from AsyncStorage:', storageError);
    }
    
    throw new Error('Currently our currency exchange services are unavailable. Try again later!');
  }
};

export const getSupportedCurrencies = async () => {
  try {
    // Always try to fetch fresh data first
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
        
        return currencyInfo;
      });
      
      // Store the data for offline use
      await AsyncStorage.setItem('supported_currencies', JSON.stringify({
        timestamp: new Date().getTime(),
        currencies
      }));
      
      return currencies;
    } else {
      // If API fails, fall back to AsyncStorage
      const cachedData = await AsyncStorage.getItem('supported_currencies');
      
      if (cachedData) {
        const { currencies } = JSON.parse(cachedData);
        return currencies;
      }
      
      throw new Error(data.error || 'Failed to fetch supported currencies');
    }
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    
    // Try to use saved data as last resort
    try {
      const cachedData = await AsyncStorage.getItem('supported_currencies');
      
      if (cachedData) {
        const { currencies } = JSON.parse(cachedData);
        return currencies;
      }
    } catch (storageError) {
      console.error('Failed to read supported currencies from AsyncStorage:', storageError);
    }
    
    throw new Error('Currently our currency service is unavailable. Try again later!');
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
    if (!currency) {
      throw new Error('No currency preference found');
    }
    return currency;
  } catch (error) {
    console.error('Error getting user currency:', error);
    throw new Error('Currency services unavailable. Try again later.');
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
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return { success: false, error: 'Usuário não autenticado' };

    const userId = session.user.id;

    // If currencies are the same, no conversion needed
    if (fromCurrency === toCurrency) {
      // Removed console.log - not essential
      return { success: true, message: 'Moedas iguais, conversão não necessária' };
    }

    // Get conversion rate
    const rate = await getConversionRate(fromCurrency, toCurrency);
    if (!rate) {
      return { success: false, error: 'Não foi possível obter taxa de conversão' };
    }

    // Convert incomes
    const incomesResult = await convertIncomes(userId, fromCurrency, toCurrency, rate);
    if (!incomesResult.success) {
      console.error('Error converting incomes:', incomesResult.error);
    }

    // Convert expenses
    const expensesResult = await convertExpenses(userId, fromCurrency, toCurrency, rate);
    if (!expensesResult.success) {
      console.error('Error converting expenses:', expensesResult.error);
    }

    return { 
      success: true, 
      message: `Conversão concluída: ${incomesResult.converted} receitas, ${expensesResult.converted} despesas` 
    };
  } catch (error) {
    console.error('Error in convertCurrencyForUserData:', error);
    return { success: false, error: error.message };
  }
};

// Função para converter receitas
async function convertIncomes(userId, fromCurrency, toCurrency, rate) {
  try {
    const { data: incomes, error } = await supabase
      .from('income')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching incomes for conversion:', error);
      return { success: false, error: error.message };
    }

    if (!incomes || incomes.length === 0) {
      return { success: true, converted: 0 };
    }

    let convertedCount = 0;
    for (const income of incomes) {
      try {
        // Check if this income was already converted from the same currency
        if (income.last_currency === fromCurrency) {
          // Removed console.log - not essential
          continue;
        }

        const originalAmount = parseFloat(income.amount);
        const convertedAmount = originalAmount * rate;

        const { error: updateError } = await supabase
          .from('income')
          .update({ 
            amount: convertedAmount.toFixed(2),
            last_currency: fromCurrency
          })
          .eq('id', income.id);

        if (updateError) {
          console.error(`Error updating income ${income.id}:`, updateError);
        } else {
          convertedCount++;
        }
      } catch (incomeError) {
        console.error(`Error processing income ${income.id}:`, incomeError);
      }
    }

    return { success: true, converted: convertedCount };
  } catch (error) {
    console.error('Error in convertIncomes:', error);
    return { success: false, error: error.message };
  }
}

// Função para converter despesas
async function convertExpenses(userId, fromCurrency, toCurrency, rate) {
  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching expenses for conversion:', error);
      return { success: false, error: error.message };
    }

    if (!expenses || expenses.length === 0) {
      return { success: true, converted: 0 };
    }

    let convertedCount = 0;
    for (const expense of expenses) {
      try {
        // Check if this expense was already converted from the same currency
        if (expense.last_currency === fromCurrency) {
          // Removed console.log - not essential
          continue;
        }

        const originalAmount = parseFloat(expense.amount);
        const convertedAmount = originalAmount * rate;

        const { error: updateError } = await supabase
          .from('expenses')
          .update({ 
            amount: convertedAmount.toFixed(2),
            last_currency: fromCurrency
          })
          .eq('id', expense.id);

        if (updateError) {
          console.error(`Error updating expense ${expense.id}:`, updateError);
        } else {
          convertedCount++;
        }
      } catch (expenseError) {
        console.error(`Error processing expense ${expense.id}:`, expenseError);
      }
    }

    return { success: true, converted: convertedCount };
  } catch (error) {
    console.error('Error in convertExpenses:', error);
    return { success: false, error: error.message };
  }
}

// Update currency preference
export const updateUserCurrencyPreference = async (userId, newCurrency, previousCurrency) => {
  try {
    // Update in database
    const { error } = await supabase
      .from('user_currency_preferences')
      .upsert([
        {
          user_id: userId,
          actual_currency: newCurrency,
          previous_currency: previousCurrency
        }
      ]);

    if (error) {
      console.error('Error updating currency preference in database:', error);
      return false;
    }

    // Update AsyncStorage also for redundancy
    await AsyncStorage.setItem('user_preferred_currency', newCurrency);

    // Removed console.log - not essential
    return true;
  } catch (error) {
    console.error('Error in updateUserCurrencyPreference:', error);
    return false;
  }
}; 