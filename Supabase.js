import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://rgxxbmvhuxwliqwzvwoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneHhibXZodXh3bGlxd3p2d29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MjI3MzIsImV4cCI6MjA1NTk5ODczMn0.smO2ZGSANUI1d8pRpT4CimP3jqHIo4zqJ3SgMl_qQxk';

// Configure Supabase client with conditional session persistence
const supabaseConfig = {
  auth: {
    storage: Platform.OS !== 'web' ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    // Set shorter default session timeout
    sessionRefreshMargin: 60, // Refresh 60 seconds before expiry
  },
  // Global fetch options
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfig);

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
    
    return !!session?.user;
  } catch (error) {
    console.error('Exception checking authentication:', error);
    return false;
  }
};

// Helper function to clear all authentication data
export const clearAuthData = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

// Helper function to force logout (clears everything including remember me)
export const forceLogout = async () => {
  try {
    await supabase.auth.signOut();
    
    if (Platform.OS !== 'web') {
      await AsyncStorage.removeItem('remembered_email');
      await AsyncStorage.removeItem('remember_me');
    }
  } catch (error) {
    console.error('Error during forced logout:', error);
  }
};