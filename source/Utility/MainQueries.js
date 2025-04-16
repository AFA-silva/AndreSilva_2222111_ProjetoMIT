import { supabase } from '../../Supabase';
import { saveUserToStorage } from './AsyncStorage';

// Fetch user data by email and save it to AsyncStorage
export const getUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;

    // Save the data to AsyncStorage
    await saveUserToStorage(data);
    console.log('User fetched and saved to AsyncStorage');
    return data;
  } catch (err) {
    console.error('Error fetching user data:', err);
    return null;
  }
};

// Update user data in database and update AsyncStorage
export const updateUserByEmail = async (email, updates) => {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('email', email);

    if (error) throw error;

    console.log('User updated in database');
    return true;
  } catch (err) {
    console.error('Error updating user data:', err);
    return false;
  }
};

// Clear user data from AsyncStorage
export const clearUserData = async (email) => {
  try {
    await AsyncStorage.removeItem(`user:${email}`);
    console.log('User data cleared from AsyncStorage');
  } catch (err) {
    console.error('Error clearing user data from AsyncStorage:', err);
  }
};