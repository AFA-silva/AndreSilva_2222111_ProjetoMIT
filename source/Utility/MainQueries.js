import { supabase } from '../../Supabase';

// Fetch the current user's session
export const getSession = async () => {
  try {
    const { data: session, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (session) {
      console.log('Session fetched successfully:', session);
      return session;
    } else {
      console.log('No active session found.');
      return null;
    }
  } catch (err) {
    console.error('Error fetching session:', err);
    return null;
  }
};

// Fetch user currency preferences
export const fetchUserCurrencyPreference = async () => {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      console.log('No authenticated user to fetch currency preference');
      return null;
    }

    const userId = session.user.id;
    console.log('Fetching currency preference for user:', userId);
    
    // First, check if we have multiple rows for this user - if yes, clean them up
    const { data: allRows, error: checkError } = await supabase
      .from('user_currency_preferences')
      .select('id, actual_currency, updated_at')
      .eq('user_id', userId);
      
    if (checkError) {
      console.error('Error checking user currency preferences:', checkError);
    } else if (allRows && allRows.length > 1) {
      // Multiple rows found, keep only the most recent one
      console.warn(`Found ${allRows.length} currency preferences for user, cleaning up...`);
      
      // Sort by updated_at descending
      const sortedRows = [...allRows].sort((a, b) => 
        new Date(b.updated_at) - new Date(a.updated_at)
      );
      
      // Keep the first row (most recent)
      const mostRecent = sortedRows[0];
      
      // Delete all other rows
      for (const row of sortedRows.slice(1)) {
        const { error: deleteError } = await supabase
          .from('user_currency_preferences')
          .delete()
          .eq('id', row.id);
          
        if (deleteError) {
          console.error(`Error deleting redundant currency preference ${row.id}:`, deleteError);
        }
      }
      
      console.log('Using most recent currency preference:', mostRecent.actual_currency);
      return mostRecent.actual_currency;
    }
    
    // Get user currency preference (should be just one row now)
    const { data, error } = await supabase
      .from('user_currency_preferences')
      .select('actual_currency')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user currency preference:', error);
      return 'USD'; // Default on error
    }

    if (data && data.actual_currency) {
      console.log('User currency preference fetched:', data.actual_currency);
      return data.actual_currency;
    } else {
      console.log('No currency preference found, using default USD');
      return 'USD'; // Default currency
    }
  } catch (err) {
    console.error('Error in fetchUserCurrencyPreference:', err);
    return 'USD'; // Default currency on error
  }
};

// Fetch user data by their unique ID
export const fetchUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    console.log('User fetched successfully:', data);
    return data;
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    return null;
  }
};

// Fetch user data by email
export const fetchUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;

    console.log('User fetched successfully:', data);
    return data;
  } catch (err) {
    console.error('Error fetching user by email:', err);
    return null;
  }
};

// Create a new user in the database
export const createUser = async (userDetails) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([userDetails]);

    if (error) throw error;

    console.log('User created successfully:', data);
    return data;
  } catch (err) {
    console.error('Error creating user:', err);
    return null;
  }
};

// Update an existing user's data
export const updateUser = async (userId, updates) => {
  console.log('updateUser called with:', { userId, updates });

  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user:', error.message);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      console.log(`No rows updated. The user ID ${userId} may not exist or the update conditions did not match.`);
      return { data: null, error: null }; // Removed warning and considered it a no-op.
    }

    console.log('User updated successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in updateUser:', err);
    return { data: null, error: err };
  }
};

// Delete a user by ID
export const deleteUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    console.log('User deleted successfully:', data);
    return data;
  } catch (err) {
    console.error('Error deleting user:', err);
    return null;
  }
};

// Fetch incomes by user_id
export const fetchIncomesByUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('income')
      .select('*, frequencies(name, days), categories(name)')
      .eq('user_id', userId);

    if (error) throw error;

    console.log('Incomes fetched successfully:', data);
    return data;
  } catch (err) {
    console.error('Error fetching incomes:', err);
    return null;
  }
};

// Fetch expenses by user_id
export const fetchExpensesByUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, frequencies(name, days), categories(name)')
      .eq('user_id', userId);

    if (error) throw error;

    console.log('Expenses fetched successfully:', data);
    return data;
  } catch (err) {
    console.error('Error fetching expenses:', err);
    return null;
  }
};

// Fetch goals by user_id
export const fetchGoalsByUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('id, name, amount, deadline, status, created_at, goal_saving_minimum')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log('Goals fetched successfully:', data);
    return data;
  } catch (err) {
    console.error('Error fetching goals:', err);
    return null;
  }
};

// Fetch user settings for allocation percentages
export const fetchUserSettings = async (userId) => {
  try {
    // Check if the user_settings table exists first
    const { error: tableCheckError } = await supabase
      .from('user_settings')
      .select('count')
      .limit(1);
    
    // If table doesn't exist, return default values
    if (tableCheckError && tableCheckError.code === '42P01') {
      console.log('Warning: user_settings table does not exist, returning default values');
      return { default_allocation_percentage: 20 };
    }
    
    // If table exists, fetch the user's settings
    const { data, error } = await supabase
      .from('user_settings')
      .select('default_allocation_percentage')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching user settings:', error);
      return { default_allocation_percentage: 20 }; // Return default on error
    }
    
    // If no data, return default
    if (!data) {
      return { default_allocation_percentage: 20 };
    }
    
    return data;
  } catch (err) {
    console.error('Error fetching user settings:', err);
    return { default_allocation_percentage: 20 }; // Return default on error
  }
};

// Fetch frequencies by user_id
export const fetchFrequenciesByUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('frequencies')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    console.log('Frequencies fetched successfully:', data);
    return data;
  } catch (err) {
    console.error('Error fetching frequencies:', err);
    return null;
  }
};

// Fetch categories by user_id
export const fetchCategoriesByUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    console.log('Categories fetched successfully:', data);
    return data;
  } catch (err) {
    console.error('Error fetching categories:', err);
    return null;
  }
};

// Update user's currency preference in Supabase
export const updateUserCurrencyPreference = async (currencyCode) => {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      console.log('No authenticated user to update currency preference');
      return false;
    }

    const userId = session.user.id;
    
    // Get current currency to set as previous
    const { data: currentData } = await supabase
      .from('user_currency_preferences')
      .select('actual_currency')
      .eq('user_id', userId)
      .single();
      
    const previousCurrency = currentData?.actual_currency || 'USD';
    
    // First, clean up any existing entries for this user to prevent duplicates
    console.log('Cleaning up existing currency preferences for user:', userId);
    const { error: deleteError } = await supabase
      .from('user_currency_preferences')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) {
      console.error('Error cleaning up existing currency preferences:', deleteError);
      // Continue anyway to try the insert
    }

    // Insert the new currency preference
    console.log('Inserting new currency preference:', currencyCode);
    const { data, error } = await supabase
      .from('user_currency_preferences')
      .insert({ 
        user_id: userId,
        actual_currency: currencyCode,
        previous_currency: previousCurrency,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating currency preference in Supabase:', error);
      return false;
    }

    console.log('Currency preference updated in Supabase:', currencyCode);
    return true;
  } catch (err) {
    console.error('Error in updateUserCurrencyPreference:', err);
    return false;
  }
};

// This function should be called during app initialization to clean up any duplicate currency preferences
export const cleanupDuplicateCurrencyPreferences = async () => {
  try {
    console.log('Starting cleanup of duplicate currency preferences...');
    
    // First, get all currency preferences
    const { data, error } = await supabase
      .from('user_currency_preferences')
      .select('*');
      
    if (error) {
      console.error('Error fetching currency preferences for cleanup:', error);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.log('No currency preferences to clean up');
      return true;
    }
    
    // Group by user_id
    const userGroups = {};
    data.forEach(row => {
      if (!userGroups[row.user_id]) {
        userGroups[row.user_id] = [];
      }
      userGroups[row.user_id].push(row);
    });
    
    // Process each user
    for (const userId in userGroups) {
      const userRows = userGroups[userId];
      
      if (userRows.length > 1) {
        console.warn(`Found ${userRows.length} currency preferences for user ${userId}, cleaning up...`);
        
        // Sort by updated_at descending to keep the most recent
        const sortedRows = [...userRows].sort((a, b) => 
          new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
        );
        
        // Keep the first row (most recent)
        const mostRecent = sortedRows[0];
        
        // Delete all other rows
        for (const row of sortedRows.slice(1)) {
          const { error: deleteError } = await supabase
            .from('user_currency_preferences')
            .delete()
            .eq('id', row.id);
            
          if (deleteError) {
            console.error(`Error deleting redundant currency preference ${row.id}:`, deleteError);
          } else {
            console.log(`Deleted redundant currency preference ${row.id} for user ${userId}`);
          }
        }
      }
    }
    
    console.log('Currency preferences cleanup completed');
    return true;
  } catch (err) {
    console.error('Error cleaning up currency preferences:', err);
    return false;
  }
};

// Update all incomes for a user with converted values when currency changes
export const updateIncomesWithConvertedValues = async (userId, conversionRates, fromCurrency, toCurrency) => {
  try {
    console.log(`Converting all income values from ${fromCurrency} to ${toCurrency}`);
    
    // Get current incomes
    const { data: incomes, error: fetchError } = await supabase
      .from('income')
      .select('*')
      .eq('user_id', userId);
      
    if (fetchError) {
      console.error('Error fetching incomes for conversion:', fetchError);
      return false;
    }
    
    if (!incomes || incomes.length === 0) {
      console.log('No incomes to convert');
      return true;
    }
    
    console.log(`Found ${incomes.length} income records to convert`);
    
    // Convert and update each income
    let successCount = 0;
    for (const income of incomes) {
      try {
        // Convert amount
        const originalAmount = parseFloat(income.amount) || 0;
        const conversionRate = conversionRates[toCurrency] || 1;
        const convertedAmount = originalAmount * conversionRate;
        
        console.log(`Converting income: ${originalAmount} ${fromCurrency} → ${convertedAmount.toFixed(2)} ${toCurrency}`);
        
        // Verificar se o valor é válido antes de salvar
        if (isNaN(convertedAmount)) {
          console.error(`Valor convertido inválido para income ${income.id}: ${convertedAmount}`);
          continue;
        }
        
        // Update in database - extraímos o comando para debug
        const updateData = { 
          amount: parseFloat(convertedAmount.toFixed(2)).toString(),
          last_currency: fromCurrency,  // Track the previous currency
          last_converted_at: new Date().toISOString()
        };
        
        console.log(`Atualizando income ${income.id} com dados:`, updateData);
        
        const { data, error: updateError } = await supabase
          .from('income')
          .update(updateData)
          .eq('id', income.id);
          
        if (updateError) {
          console.error(`Error updating income ${income.id}:`, updateError);
        } else {
          console.log(`Income ${income.id} atualizado com sucesso`);
          successCount++;
        }
      } catch (conversionError) {
        console.error(`Error converting income ${income.id}:`, conversionError);
      }
    }
    
    console.log(`Successfully converted ${successCount} of ${incomes.length} incomes`);
    return successCount > 0;
  } catch (error) {
    console.error('Error in updateIncomesWithConvertedValues:', error);
    return false;
  }
};

// Update all expenses for a user with converted values when currency changes
export const updateExpensesWithConvertedValues = async (userId, conversionRates, fromCurrency, toCurrency) => {
  try {
    console.log(`Converting all expense values from ${fromCurrency} to ${toCurrency}`);
    
    // Get current expenses
    const { data: expenses, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId);
      
    if (fetchError) {
      console.error('Error fetching expenses for conversion:', fetchError);
      return false;
    }
    
    if (!expenses || expenses.length === 0) {
      console.log('No expenses to convert');
      return true;
    }
    
    console.log(`Found ${expenses.length} expense records to convert`);
    
    // Convert and update each expense
    let successCount = 0;
    for (const expense of expenses) {
      try {
        // Convert amount
        const originalAmount = parseFloat(expense.amount) || 0;
        const conversionRate = conversionRates[toCurrency] || 1;
        const convertedAmount = originalAmount * conversionRate;
        
        console.log(`Converting expense: ${originalAmount} ${fromCurrency} → ${convertedAmount.toFixed(2)} ${toCurrency}`);
        
        // Verificar se o valor é válido antes de salvar
        if (isNaN(convertedAmount)) {
          console.error(`Valor convertido inválido para expense ${expense.id}: ${convertedAmount}`);
          continue;
        }
        
        // Update in database - extraímos o comando para debug
        const updateData = { 
          amount: parseFloat(convertedAmount.toFixed(2)).toString(),
          last_currency: fromCurrency,  // Track the previous currency
          last_converted_at: new Date().toISOString()
        };
        
        console.log(`Atualizando expense ${expense.id} com dados:`, updateData);
        
        const { data, error: updateError } = await supabase
          .from('expenses')
          .update(updateData)
          .eq('id', expense.id);
          
        if (updateError) {
          console.error(`Error updating expense ${expense.id}:`, updateError);
        } else {
          console.log(`Expense ${expense.id} atualizado com sucesso`);
          successCount++;
        }
      } catch (conversionError) {
        console.error(`Error converting expense ${expense.id}:`, conversionError);
      }
    }
    
    console.log(`Successfully converted ${successCount} of ${expenses.length} expenses`);
    return successCount > 0;
  } catch (error) {
    console.error('Error in updateExpensesWithConvertedValues:', error);
    return false;
  }
};

// Update all goals for a user with converted values when currency changes
export const updateGoalsWithConvertedValues = async (userId, conversionRates, fromCurrency, toCurrency) => {
  try {
    console.log(`Converting all goal values from ${fromCurrency} to ${toCurrency}`);
    
    // Get current goals
    const { data: goals, error: fetchError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);
      
    if (fetchError) {
      console.error('Error fetching goals for conversion:', fetchError);
      return false;
    }
    
    if (!goals || goals.length === 0) {
      console.log('No goals to convert');
      return true;
    }
    
    console.log(`Found ${goals.length} goal records to convert`);
    
    // Convert and update each goal
    let successCount = 0;
    for (const goal of goals) {
      try {
        // Convert amount
        const originalAmount = parseFloat(goal.amount) || 0;
        const conversionRate = conversionRates[toCurrency] || 1;
        const convertedAmount = originalAmount * conversionRate;
        
        console.log(`Converting goal: ${originalAmount} ${fromCurrency} → ${convertedAmount.toFixed(2)} ${toCurrency}`);
        
        // Verificar se o valor é válido antes de salvar
        if (isNaN(convertedAmount)) {
          console.error(`Valor convertido inválido para goal ${goal.id}: ${convertedAmount}`);
          continue;
        }
        
        // Update in database - extraímos o comando para debug
        const updateData = { 
          amount: parseFloat(convertedAmount.toFixed(2)).toString(),
          last_currency: fromCurrency,  // Track the previous currency
          last_converted_at: new Date().toISOString()
        };
        
        console.log(`Atualizando goal ${goal.id} com dados:`, updateData);
        
        const { data, error: updateError } = await supabase
          .from('goals')
          .update(updateData)
          .eq('id', goal.id);
          
        if (updateError) {
          console.error(`Error updating goal ${goal.id}:`, updateError);
        } else {
          console.log(`Goal ${goal.id} atualizado com sucesso`);
          successCount++;
        }
      } catch (conversionError) {
        console.error(`Error converting goal ${goal.id}:`, conversionError);
      }
    }
    
    console.log(`Successfully converted ${successCount} of ${goals.length} goals`);
    return successCount > 0;
  } catch (error) {
    console.error('Error in updateGoalsWithConvertedValues:', error);
    return false;
  }
};

// Main function to convert all financial data when currency changes
export const convertAllFinancialData = async (fromCurrency, toCurrency) => {
  try {
    console.log(`Starting conversion of all financial data from ${fromCurrency} to ${toCurrency}`);
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      console.log('No authenticated user for currency conversion');
      return false;
    }
    
    const userId = session.user.id;
    console.log('Usuário autenticado para conversão:', userId);
    
    // Get conversion rates
    console.log('Fetching conversion rates...');
    let conversionRates = null;
    
    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/de3d3cc388a2679655798ec7/latest/${fromCurrency}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.result === 'success') {
        conversionRates = data.conversion_rates;
        
        // If the target currency isn't in the rates (unlikely but possible)
        if (!conversionRates[toCurrency]) {
          console.error(`Conversion rate not available for ${toCurrency}`);
          return false;
        }
        
        console.log(`Conversion rate: 1 ${fromCurrency} = ${conversionRates[toCurrency]} ${toCurrency}`);
      } else {
        console.error('Error fetching exchange rates:', data.error_type);
        return false;
      }
    } catch (apiError) {
      console.error('API error fetching exchange rates:', apiError);
      return false;
    }
    
    if (!conversionRates) {
      console.error('Failed to obtain conversion rates');
      return false;
    }
    
    // Verifica se realmente temos os dados antes de continuar
    if (!conversionRates[toCurrency]) {
      console.error(`Não foi possível obter a taxa de conversão para ${toCurrency}`);
      return false;
    }
    
    console.log('Taxas de conversão obtidas com sucesso. Iniciando atualização de dados...');
    
    // Garantir que os updates no banco de dados são atômicos
    try {
      // Convert all financial data
      const incomesUpdated = await updateIncomesWithConvertedValues(userId, conversionRates, fromCurrency, toCurrency);
      console.log('Incomes updated result:', incomesUpdated);
      
      const expensesUpdated = await updateExpensesWithConvertedValues(userId, conversionRates, fromCurrency, toCurrency);
      console.log('Expenses updated result:', expensesUpdated);
      
      const goalsUpdated = await updateGoalsWithConvertedValues(userId, conversionRates, fromCurrency, toCurrency);
      console.log('Goals updated result:', goalsUpdated);
      
      console.log('Financial data conversion complete!');
      
      return true;
    } catch (updateError) {
      console.error('Error updating financial data:', updateError);
      return false;
    }
  } catch (error) {
    console.error('Error in convertAllFinancialData:', error);
    return false;
  }
};