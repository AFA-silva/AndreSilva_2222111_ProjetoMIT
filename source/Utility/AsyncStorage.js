import AsyncStorage from '@react-native-async-storage/async-storage';

// Save data to AsyncStorage
export const saveUserToStorage = async (user) => {
  try {
    await AsyncStorage.setItem('user', JSON.stringify(user));
    console.log('User saved to storage');
  } catch (error) {
    console.error('Error saving user to storage:', error);
  }
};

// Retrieve data from AsyncStorage
export const getUserFromStorage = async () => {
  try {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error retrieving user from storage:', error);
    return null;
  }
};

// Clear user data from AsyncStorage
export const clearUserFromStorage = async () => {
  try {
    await AsyncStorage.removeItem('user');
    console.log('User removed from storage');
  } catch (error) {
    console.error('Error clearing user from storage:', error);
  }
};