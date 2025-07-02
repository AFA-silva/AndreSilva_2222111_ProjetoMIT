import { supabase } from '../../Supabase';

// Fetch the current user's session
export const getSession = async () => {
  try {
    const { data: session, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (session) {
      return session;
    } else {
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
      return null;
    }

    const userId = session.user.id;
    
    // Try to get user currency preference
    const { data, error } = await supabase
      .from('user_currency_preferences')
      .select('actual_currency')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user currency preference:', error);
      throw new Error('Unable to retrieve currency preferences');
    }

    if (data && data.actual_currency) {
      // Return the actual currency preference from database
      return {
        code: data.actual_currency,
        symbol: data.actual_currency === 'EUR' ? '€' : data.actual_currency,
        name: data.actual_currency === 'EUR' ? 'Euro' : data.actual_currency
      };
    } else {
      // No preference found, create one with EUR as default
      // ONLY if the user doesn't have a preference yet
      const { error: insertError } = await supabase
        .from('user_currency_preferences')
        .insert([
          {
            user_id: userId,
            actual_currency: 'EUR',
            previous_currency: null
          }
        ]);
      if (insertError) {
        console.error('Error inserting default currency preference:', insertError);
        throw new Error('Unable to create default currency preference');
      }
      return {
        code: 'EUR',
        symbol: '€',
        name: 'Euro'
      };
    }
  } catch (err) {
    console.error('Error in fetchUserCurrencyPreference:', err);
    // Return EUR as a last-resort fallback
    return {
      code: 'EUR',
      symbol: '€',
      name: 'Euro'
    };
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

    return data;
  } catch (err) {
    console.error('Error creating user:', err);
    return null;
  }
};

// Update an existing user's data
export const updateUser = async (userId, updates) => {
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
      return { data: null, error: null }; // Removed warning and considered it a no-op.
    }

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
    
    // If table doesn't exist, check if we can get allocation from goals
    if (tableCheckError && tableCheckError.code === '42P01') {
      console.log('Warning: user_settings table does not exist');
      
      try {
        // Try to get allocation percentage from existing goals
        const { data: goals } = await supabase
          .from('goals')
          .select('goal_saving_minimum')
          .eq('user_id', userId);
        
        if (goals && goals.length > 0) {
          // Calculate average allocation from existing goals
          const totalAllocation = goals.reduce((sum, goal) => {
            return sum + (Number(goal.goal_saving_minimum) || 0);
          }, 0);
          
          // Return average if there are goals, otherwise null
          return { 
            default_allocation_percentage: totalAllocation > 0 ? 
              Math.min(totalAllocation, 100) : null 
          };
        }
      } catch (goalsError) {
        console.log('Could not fetch goals for allocation percentage:', goalsError);
      }
      
      // If no goals or error fetching goals, return null to let caller decide
      return { default_allocation_percentage: null };
    }
    
    // If table exists, fetch the user's settings
    const { data, error } = await supabase
      .from('user_settings')
      .select('default_allocation_percentage')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching user settings:', error);
      return { default_allocation_percentage: null };
    }
    
    // If no data, return null to let caller decide
    if (!data) {
      return { default_allocation_percentage: null };
    }
    
    return data;
  } catch (err) {
    console.error('Error fetching user settings:', err);
    // Return null to let caller decide
    return { default_allocation_percentage: null };
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

    return data;
  } catch (err) {
    console.error('Error fetching categories:', err);
    return null;
  }
};

// Update an existing user's currency preference
export const updateUserCurrencyPreference = async (currencyInfo) => {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      return false;
    }

    const userId = session.user.id;
    const currencyCode = typeof currencyInfo === 'object' ? currencyInfo.code : currencyInfo;
    
    // Use the simpler testUpdateCurrency function which is known to work
    return await testUpdateCurrency(currencyCode);
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
      return true;
    }
    
    let successCount = 0;
    for (const income of incomes) {
      try {
        // Convert amount - ensure we have a valid number
        const originalAmount = typeof income.amount === 'string' ? 
          parseFloat(income.amount.replace(/,/g, '')) : 
          parseFloat(income.amount) || 0;
        
        if (isNaN(originalAmount)) {
          console.error(`Invalid original amount for income ${income.id}: ${income.amount}`);
          continue;
        }
        
        const conversionRate = conversionRates[toCurrency] || 1;
        const convertedAmount = originalAmount * conversionRate;
        
        const { error: updateError } = await supabase
          .from('income')
          .update({ 
            amount: convertedAmount.toFixed(2)
          })
          .eq('id', income.id);
          
        if (updateError) {
          console.error(`Error updating income ${income.id}:`, updateError);
        } else {
          successCount++;
        }
      } catch (conversionError) {
        console.error(`Error converting income ${income.id}:`, conversionError);
      }
    }
    
    return successCount > 0;
  } catch (error) {
    console.error('Error in updateIncomesWithConvertedValues:', error);
    return false;
  }
};

// Update all expenses for a user with converted values when currency changes
export const updateExpensesWithConvertedValues = async (userId, conversionRates, fromCurrency, toCurrency) => {
  try {
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
      return true;
    }
    
    let successCount = 0;
    for (const expense of expenses) {
      try {
        // Convert amount - ensure we have a valid number
        const originalAmount = typeof expense.amount === 'string' ? 
          parseFloat(expense.amount.replace(/,/g, '')) : 
          parseFloat(expense.amount) || 0;
        
        if (isNaN(originalAmount)) {
          console.error(`Invalid original amount for expense ${expense.id}: ${expense.amount}`);
          continue;
        }
        
        const conversionRate = conversionRates[toCurrency] || 1;
        const convertedAmount = originalAmount * conversionRate;
        
        const { error: updateError } = await supabase
          .from('expenses')
          .update({ 
            amount: convertedAmount.toFixed(2)
          })
          .eq('id', expense.id);
          
        if (updateError) {
          console.error(`Error updating expense ${expense.id}:`, updateError);
        } else {
          successCount++;
        }
      } catch (conversionError) {
        console.error(`Error converting expense ${expense.id}:`, conversionError);
      }
    }
    
    return successCount > 0;
  } catch (error) {
    console.error('Error in updateExpensesWithConvertedValues:', error);
    return false;
  }
};

// Update all goals for a user with converted values when currency changes
export const updateGoalsWithConvertedValues = async (userId, conversionRates, fromCurrency, toCurrency) => {
  try {
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
      return true;
    }
    
    let successCount = 0;
    for (const goal of goals) {
      try {
        // Convert amount - ensure we have a valid number
        const originalAmount = typeof goal.amount === 'string' ? 
          parseFloat(goal.amount.replace(/,/g, '')) : 
          parseFloat(goal.amount) || 0;
        
        if (isNaN(originalAmount)) {
          console.error(`Invalid original amount for goal ${goal.id}: ${goal.amount}`);
          continue;
        }
        
        const conversionRate = conversionRates[toCurrency] || 1;
        const convertedAmount = originalAmount * conversionRate;
        
        const { error: updateError } = await supabase
          .from('goals')
          .update({ 
            amount: convertedAmount.toFixed(2)
          })
          .eq('id', goal.id);
          
        if (updateError) {
          console.error(`Error updating goal ${goal.id}:`, updateError);
        } else {
          successCount++;
        }
      } catch (conversionError) {
        console.error(`Error converting goal ${goal.id}:`, conversionError);
      }
    }
    
    return successCount > 0;
  } catch (error) {
    console.error('Error in updateGoalsWithConvertedValues:', error);
    return false;
  }
};

// Main function to convert all financial data when currency changes
export const convertAllFinancialData = async (fromCurrency, toCurrency) => {
  try {
    // Check if conversion is needed
    if (fromCurrency === toCurrency) {
      return true;
    }
    
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      return false;
    }
    
    const userId = session.user.id;

    // Get conversion rates from exchange rate API
    let conversionRates = {};
    
    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/de3d3cc388a2679655798ec7/latest/${fromCurrency}`);
      const data = await response.json();
      
      if (data.result === 'success') {
        conversionRates = data.conversion_rates;
      } else {
        throw new Error(`API error: ${data.error_type || 'Unknown error'}`);
      }
    } catch (apiError) {
      console.error('Primary API failed, trying alternative...', apiError);
      
      try {
        const altResponse = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency}`);
        const altData = await altResponse.json();
        
        if (altData.rates) {
          conversionRates = altData.rates;
        } else {
          throw new Error('Alternative API also failed');
        }
      } catch (altApiError) {
        console.error('Both APIs failed:', altApiError);
        return false;
      }
    }
    
    // Update all financial data
    const [incomesUpdated, expensesUpdated, goalsUpdated] = await Promise.all([
      updateIncomesWithConvertedValues(userId, conversionRates, fromCurrency, toCurrency),
      updateExpensesWithConvertedValues(userId, conversionRates, fromCurrency, toCurrency),
      updateGoalsWithConvertedValues(userId, conversionRates, fromCurrency, toCurrency)
    ]);

    const isSuccessful = incomesUpdated && expensesUpdated && goalsUpdated;

    return isSuccessful;
  } catch (error) {
    console.error('Error in convertAllFinancialData:', error);
    return false;
  }
};

// Simple test function to directly update currency preference
// Use this to test if currency preference updates are working
export const testUpdateCurrency = async (currencyCode) => {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      return false;
    }

    const userId = session.user.id;
    
    // Get current currency to set as previous
    const { data: currentData } = await supabase
      .from('user_currency_preferences')
      .select('actual_currency')
      .eq('user_id', userId)
      .single();
      
    const previousCurrency = currentData?.actual_currency || null;
    
    // First, clean up any existing entries for this user
    console.log('Cleaning up existing currency preferences for user:', userId);
    const { error: deleteError } = await supabase
      .from('user_currency_preferences')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) {
      console.error('Error cleaning up existing currency preferences:', deleteError);
      return false;
    }

    // Insert the new currency preference with minimal fields
    const { error: insertError } = await supabase
      .from('user_currency_preferences')
      .insert({
        user_id: userId,
        actual_currency: currencyCode,
        previous_currency: previousCurrency,
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting currency preference:', insertError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in testUpdateCurrency:', err);
    return false;
  }
};