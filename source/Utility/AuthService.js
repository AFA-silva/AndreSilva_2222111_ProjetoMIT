import { supabase, isAuthenticated, clearAuthData } from '../../Supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';

class AuthService {
  constructor() {
    this.authStateListeners = [];
    this.currentUser = null;
    this.isInitialized = false;
    this.appStateSubscription = null;
  }

  // Initialize the auth service
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Set up auth state change listener
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        this.currentUser = session?.user || null;
        
        // Notify all listeners
        this.authStateListeners.forEach(listener => {
          listener(event, session);
        });

        // Handle specific auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('User signed in successfully');
            this.setupSessionManagement();
            break;
          case 'SIGNED_OUT':
            console.log('User signed out');
            this.clearRememberedCredentials(false); // Don't clear remember me preference on normal logout
            break;
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed automatically');
            break;
          case 'USER_UPDATED':
            console.log('User data updated');
            break;
        }
      });

      // Set up app state change listener for background/foreground detection
      this.setupAppStateListener();

      // Check for existing session with remember me validation
      await this.validateExistingSession();

      this.isInitialized = true;
      console.log('AuthService initialized successfully');
    } catch (error) {
      console.error('Error initializing AuthService:', error);
    }
  }

  // Setup app state listener to handle background/foreground
  setupAppStateListener() {
    if (Platform.OS !== 'web') {
      this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
        console.log('App state changed to:', nextAppState);
        
        if (nextAppState === 'background') {
          await this.handleAppBackground();
        } else if (nextAppState === 'active') {
          await this.handleAppForeground();
        }
      });
    }
  }

  // Handle app going to background
  async handleAppBackground() {
    try {
      const { rememberMe } = await this.getRememberedCredentials();
      
      if (!rememberMe && this.currentUser) {
        console.log('App going to background without Remember Me - signing out');
        await this.signOut();
      }
    } catch (error) {
      console.error('Error handling app background:', error);
    }
  }

  // Handle app coming to foreground
  async handleAppForeground() {
    try {
      // Validate session when app comes back to foreground
      await this.validateExistingSession();
    } catch (error) {
      console.error('Error handling app foreground:', error);
    }
  }

  // Setup session management based on remember me preference
  async setupSessionManagement() {
    try {
      const { rememberMe } = await this.getRememberedCredentials();
      
      if (!rememberMe) {
        // If remember me is not enabled, set up a shorter session timeout
        console.log('Remember Me not enabled - setting up session timeout');
        
        // Set session to expire in 15 minutes instead of default
        setTimeout(async () => {
          const isStillActive = await this.checkAuthStatus();
          if (isStillActive) {
            const { rememberMe: currentRememberMe } = await this.getRememberedCredentials();
            if (!currentRememberMe) {
              console.log('Session timeout reached without Remember Me - signing out');
              await this.signOut();
            }
          }
        }, 15 * 60 * 1000); // 15 minutes
      }
    } catch (error) {
      console.error('Error setting up session management:', error);
    }
  }

  // Validate existing session against remember me preference
  async validateExistingSession() {
    try {
      const isAuth = await isAuthenticated();
      
      if (isAuth) {
        const { rememberMe } = await this.getRememberedCredentials();
        
        if (!rememberMe) {
          console.log('Active session found but Remember Me not enabled - signing out');
          await this.signOut();
          return false;
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          this.currentUser = user;
          console.log('Valid session with Remember Me enabled');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error validating existing session:', error);
      return false;
    }
  }

  // Add auth state listener
  addAuthStateListener(listener) {
    this.authStateListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(l => l !== listener);
    };
  }

  // Check if user is currently authenticated
  async checkAuthStatus() {
    try {
      return await isAuthenticated();
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Sign in with email and password
  async signIn(email, password, rememberMe = false) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Handle remember me functionality
      if (rememberMe && Platform.OS !== 'web') {
        await this.saveRememberedCredentials(email);
      } else {
        await this.clearRememberedCredentials(true); // Clear remember me preference
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign out
  async signOut() {
    try {
      await clearAuthData();
      this.currentUser = null;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // Save remembered credentials (only email for security)
  async saveRememberedCredentials(email) {
    if (Platform.OS !== 'web') {
      try {
        await AsyncStorage.setItem('remembered_email', email);
        await AsyncStorage.setItem('remember_me', 'true');
        console.log('Credentials remembered');
      } catch (error) {
        console.error('Error saving remembered credentials:', error);
      }
    }
  }

  // Clear remembered credentials
  async clearRememberedCredentials(clearRememberMe = true) {
    if (Platform.OS !== 'web') {
      try {
        if (clearRememberMe) {
          await AsyncStorage.removeItem('remembered_email');
          await AsyncStorage.removeItem('remember_me');
          console.log('Remembered credentials and preference cleared');
        } else {
          // Only clear email but keep remember me preference
          await AsyncStorage.removeItem('remembered_email');
          console.log('Remembered email cleared');
        }
      } catch (error) {
        console.error('Error clearing remembered credentials:', error);
      }
    }
  }

  // Get remembered credentials
  async getRememberedCredentials() {
    if (Platform.OS !== 'web') {
      try {
        const email = await AsyncStorage.getItem('remembered_email');
        const rememberMe = await AsyncStorage.getItem('remember_me');
        
        return {
          email: email || '',
          rememberMe: rememberMe === 'true'
        };
      } catch (error) {
        console.error('Error getting remembered credentials:', error);
        return { email: '', rememberMe: false };
      }
    }
    
    return { email: '', rememberMe: false };
  }

  // Check for auto-login capability
  async shouldAutoLogin() {
    try {
      // First check if remember me is enabled
      const { rememberMe } = await this.getRememberedCredentials();
      
      if (!rememberMe) {
        console.log('Remember Me not enabled - no auto-login');
        return { shouldLogin: false, reason: 'remember_me_disabled' };
      }

      // If remember me is enabled, check if user has an active session
      const isAuth = await this.checkAuthStatus();
      if (isAuth) {
        console.log('Remember Me enabled and active session found');
        return { shouldLogin: true, reason: 'active_session_with_remember_me' };
      }

      console.log('Remember Me enabled but no active session');
      return { shouldLogin: false, reason: 'remember_me_no_session' };
    } catch (error) {
      console.error('Error checking auto-login:', error);
      return { shouldLogin: false, reason: 'error' };
    }
  }

  // Cleanup method
  cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.authStateListeners = [];
    this.isInitialized = false;
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService; 