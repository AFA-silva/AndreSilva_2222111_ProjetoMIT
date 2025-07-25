import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Platform,
  AppState
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Device from 'expo-device';
import styles from '../../Styles/Settings/SecurityPageStyle';
import { Ionicons } from '@expo/vector-icons';
import Alert from '../../Utility/Alerts';
import { supabase } from '../../../Supabase';
import { isEmailValid } from '../../Utility/Validations';

const SecurityPage = () => {
  // Modal states
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [isEmailModalVisible, setEmailModalVisible] = useState(false);
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [devicesTabActive, setDevicesTabActive] = useState('authorized'); // 'authorized' or 'blocked'
  
  // Form states
  const [alerts, setAlerts] = useState([]);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [userSession, setUserSession] = useState(null);
  
  // Device info states
  const [deviceInfo, setDeviceInfo] = useState({
    platform: Platform.OS,
    version: Platform.Version,
    screenWidth: 0,
    screenHeight: 0,
    deviceName: 'Unknown',
    deviceModel: 'Unknown',
    manufacturer: 'Unknown',
    brand: 'Unknown',
    totalMemory: 'Unknown',
    osVersion: 'Unknown',
    deviceType: 'Unknown'
  });
  const [userDevices, setUserDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  
  // Input focus states
  const [focusedInput, setFocusedInput] = useState(null);
  // Password visibility states
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  // Loading state for password change
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;
  const securityStatusAnim = useRef(new Animated.Value(0)).current;
  const deviceSectionAnim = useRef(new Animated.Value(0)).current;
  const actionButtonsAnim = useRef(new Animated.Value(0)).current;

  // Load device information
  useEffect(() => {
    const loadDeviceInfo = async () => {
      try {
        const { width, height } = require('react-native').Dimensions.get('window');
        
        // Get detailed device information using expo-device
        const deviceName = Device.deviceName || 'Unknown Device';
        const deviceModel = Device.modelName || 'Unknown Model';
        const manufacturer = Device.manufacturer || 'Unknown Manufacturer';
        const brand = Device.brand || 'Unknown Brand';
        const totalMemory = Device.totalMemory ? `${Math.round(Device.totalMemory / (1024 * 1024 * 1024))} GB` : 'Unknown';
        const osVersion = Device.osVersion || 'Unknown';
        const deviceType = Device.deviceType || 'Unknown';
        
        setDeviceInfo(prev => ({
          ...prev,
          screenWidth: width,
          screenHeight: height,
          deviceName,
          deviceModel,
          manufacturer,
          brand,
          totalMemory,
          osVersion,
          deviceType
        }));
      } catch (error) {
        console.error('Error loading device info:', error);
      }
    };
    
    loadDeviceInfo();
  }, []);

  // Animation on component mount
  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver,
      }),
      Animated.parallel([
        Animated.timing(headerSlideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver,
        }),
        Animated.timing(securityStatusAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver,
        }),
      ]),
      Animated.stagger(150, [
        Animated.timing(deviceSectionAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver,
        }),
        Animated.timing(actionButtonsAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver,
        })
      ])
    ]).start();
  }, []);

  // Email validation function - same as MainMenuPage
  const userEmailValidation = async () => {
    try {
      // First check if we have a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user) {
        // Don't show error - this is expected during email refresh
        return;
      }

      // Then fetch current user directly from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        // Don't show alert - this is expected during email changes
        return;
      }

      const authEmail = user.email;
      const userId = user.id;
      
      // Get database email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
        
      if (userError) {
        console.error('Error fetching database email:', userError);
        return;
      }

      const databaseEmail = userData.email;
      
      // Sync database with the current auth email
      if (authEmail !== databaseEmail) {
        const { data: updateData, error: updateError } = await supabase
          .from('users')
          .update({ email: authEmail })
          .eq('id', userId)
          .select();
          
        if (updateError) {
          console.error('Error updating database email:', updateError);
        } else {
          // Update the UI with the new email
          setOldEmail(authEmail);
        }
      } else {
        // Still update UI to ensure it shows the correct email
        setOldEmail(authEmail);
      }
    } catch (error) {
      console.error('Error in email validation:', error);
    }
  };

  // Function to refresh current email from database
  const refreshCurrentEmail = async (userId) => {
    try {
      console.log('Refreshing email for user ID:', userId);
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
        
      if (!error && userData?.email) {
        console.log('Email found in database:', userData.email);
        console.log('Current oldEmail state:', oldEmail);
        
        if (userData.email !== oldEmail) {
          console.log('Email changed! Updating UI from', oldEmail, 'to', userData.email);
          setOldEmail(userData.email);
        } else {
          console.log('Email unchanged in database');
        }
      } else {
        console.error('Error fetching current email from database:', error);
      }
    } catch (error) {
      console.error('Error refreshing current email:', error);
    }
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          // Don't show alert - this is expected during email changes
          return;
        }
        if (data?.session) {
          console.log('Session found successfully');
          setUserSession(data.session);
          
          // Run email validation first (same as MainMenuPage)
          await userEmailValidation();
          
          // Register current device access only once per session
          const lastRegistration = sessionStorage?.getItem('lastDeviceRegistration');
          const now = Date.now();
          if (!lastRegistration || (now - parseInt(lastRegistration)) > 300000) { // 5 minutes
            console.log('Registering device access on session load...');
            await registerDeviceAccess();
            if (typeof Storage !== 'undefined') {
              sessionStorage?.setItem('lastDeviceRegistration', now.toString());
            }
          }
        } else {
          // Don't show alert - this is expected during email changes
        }
      } catch (error) {
        // Don't show alert - this is expected during email changes
      }
    };
    
    // Add a small delay to ensure auth state is properly initialized
    setTimeout(fetchSession, 100);
  }, []);

  // Refresh email whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('SecurityPage focused - checking authentication and running email validation...');
      const handleFocus = async () => {
        const isAuthenticated = await checkAuthenticationStatus(0, true); // Silent check for email refresh
        if (isAuthenticated) {
          await userEmailValidation();
          // Only register device if it hasn't been registered recently
          const lastRegistration = sessionStorage?.getItem('lastDeviceRegistration');
          const now = Date.now();
          if (!lastRegistration || (now - parseInt(lastRegistration)) > 300000) { // 5 minutes
            console.log('Registering device access on focus...');
            await registerDeviceAccess();
            if (typeof Storage !== 'undefined') {
              sessionStorage?.setItem('lastDeviceRegistration', now.toString());
            }
          }
        }
      };
      handleFocus();
    }, [])
  );

  // Add AppState listener to refresh email when app becomes active
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App became active - running email validation in SecurityPage...');
        await userEmailValidation();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
    };
  }, []);

  // Add auth state listener to catch email confirmations
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed in SecurityPage:', event, session?.user?.email);
      
      if (event === 'USER_UPDATED' && session) {
        console.log('User updated - running email validation...');
        // Also update the userSession state to ensure consistency
        setUserSession(session);
        await userEmailValidation();
      } else if (event === 'SIGNED_IN' && session) {
        console.log('User signed in - running email validation in SecurityPage...');
        await userEmailValidation();
      }
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [userSession]);



  const showAlert = (message, type) => {
    const alertId = Date.now();
    setAlerts([...alerts, { id: alertId, message, type }]);
    setTimeout(() => removeAlert(alertId), 5000);
  };

  const removeAlert = (id) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  // Helper function to check authentication status with retries (silent for email refresh)
  const checkAuthenticationStatus = async (retryCount = 0, silent = false) => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        if (!silent) {
          showAlert('Authentication error. Please try again.', 'error');
        }
        return false;
      }
      
      if (!session || !session.user) {
        // If no session and we haven't retried much, wait and try again
        if (retryCount < 3) {
          setTimeout(() => {
            checkAuthenticationStatus(retryCount + 1, true);
          }, 1000);
          return false;
        }
        
        return false;
      }
      
      return true;
    } catch (error) {
      if (!silent) {
        showAlert('Authentication error. Please try again.', 'error');
      }
      return false;
    }
  };

  // Fetch the real public IP address using a public API
  const getPublicIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error fetching public IP:', error);
      return null;
    }
  };

  // Fetch the city from the public IP using ipinfo.io
  const getCityFromIP = async (ip) => {
    try {
      if (!ip) return 'Unknown';
      const response = await fetch(`https://api.ipinfo.io/${ip}?token=YOUR_TOKEN`);
      const data = await response.json();
      if (data.country && data.country !== '') return data.country;
      return 'Unknown';
    } catch (error) {
      console.error('Error fetching country from IP (ipinfo.io):', error);
      return 'Unknown';
    }
  };

  // Device management functions
  // Device registration happens on SecurityPage mount and session fetch.
  // It only registers once per device (per user, model, name). If the device exists, only last_access is updated.
  const registerDeviceAccess = async () => {
    try {
      if (!userSession || !userSession.user) {
        console.log('No valid user session for device registration');
        return;
      }
      
      console.log('Starting device registration...');
      
      // Get detailed device information using expo-device with fallbacks
      const deviceName = Device.deviceName || `${Platform.OS} Device`;
      const deviceModel = Device.modelName || Platform.OS;
      const modelCode = Device.modelId || '';
      const manufacturer = Device.manufacturer || 'Unknown';
      const brand = Device.brand || Platform.OS;
      const osVersion = Device.osVersion || Platform.Version;
      
      console.log('Raw device info:', {
        deviceName,
        deviceModel,
        modelCode,
        manufacturer,
        brand,
        osVersion
      });
      
      // Create a more descriptive device model string with fallbacks
      let detailedModel = '';
      if (brand && deviceModel && modelCode && manufacturer) {
        detailedModel = `${brand} ${deviceModel} (${modelCode})`;
      } else if (brand && deviceModel) {
        detailedModel = `${brand} ${deviceModel}`;
      } else if (deviceModel) {
        detailedModel = deviceModel;
      } else {
        detailedModel = `${Platform.OS} Device`;
      }
      
      console.log('Generated detailed model:', detailedModel);
      
      // Fetch the real public IP address
      let realIP = null;
      try {
        realIP = await getPublicIP();
        console.log('Fetched IP:', realIP);
      } catch (ipError) {
        console.log('Failed to fetch IP:', ipError);
      }
      
      // Fetch the city from the IP
      let city = 'Unknown';
      try {
        if (realIP) {
          city = await getCityFromIP(realIP);
        }
        console.log('Fetched location:', city);
      } catch (cityError) {
        console.log('Failed to fetch location:', cityError);
      }
      
      // Build deviceData with required fields and fallbacks
      const deviceData = {
        user_id: userSession.user.id,
        name: deviceName,
        model: detailedModel,
        authorized: true,
        last_access: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      if (realIP) deviceData.ip_address = realIP;
      if (city && city !== 'Unknown') deviceData.location = city;
      
      console.log('Device data to register:', deviceData);
      
      // Check if device already exists - be more specific to avoid duplicates
      const { data: existingDevices, error: checkError } = await supabase
        .from('device_info')
        .select('*')
        .eq('user_id', userSession.user.id)
        .eq('name', deviceName)
        .eq('model', detailedModel);

      if (checkError) {
        console.error('Error checking existing device:', checkError);
        return; // Don't continue if we can't check for duplicates
      }

      console.log('Existing devices found:', existingDevices);

      if (existingDevices && existingDevices.length > 0) {
        // Update last access for the existing device
        const deviceToUpdate = existingDevices[0];
        console.log('Updating existing device:', deviceToUpdate.id);
        
        const { error: updateError } = await supabase
          .from('device_info')
          .update({ 
            last_access: deviceData.last_access,
            ip_address: deviceData.ip_address || deviceToUpdate.ip_address,
            location: deviceData.location || deviceToUpdate.location
          })
          .eq('id', deviceToUpdate.id);
          
        if (updateError) {
          console.error('Error updating device:', updateError);
        } else {
          console.log('Device updated successfully - no new device created');
        }
      } else {
        // Only insert if no device exists with same user_id + name + model
        console.log('No existing device found, inserting new device...');
        const { data: insertData, error: insertError } = await supabase
          .from('device_info')
          .insert([deviceData])
          .select();
          
        if (insertError) {
          console.error('Error inserting device:', insertError);
          // Check if it's a duplicate key error
          if (insertError.code === '23505') {
            console.log('Device already exists (duplicate key), skipping insertion');
          }
        } else {
          console.log('New device inserted successfully:', insertData);
        }
      }
    } catch (error) {
      console.error('Error registering device access:', error);
    }
  };

  const fetchUserDevices = async () => {
    try {
      if (!userSession || !userSession.user) {
        console.log('No user session available for fetching devices');
        setUserDevices([]);
        return;
      }
      
      const currentUserId = userSession.user.id;
      console.log('Fetching ALL devices for user ID:', currentUserId);
      setLoadingDevices(true);
      
      // Fetch ALL device_info records that match the current user_id
      const { data: deviceData, error: fetchError } = await supabase
        .from('device_info')
        .select(`
          id,
          user_id,
          name,
          model,
          ip_address,
          location,
          authorized,
          last_access,
          created_at
        `)
        .eq('user_id', currentUserId)
        .order('last_access', { ascending: false });

      if (fetchError) {
        console.error('Error fetching devices:', fetchError);
        showAlert(`Failed to load device information: ${fetchError.message}`, 'error');
        setUserDevices([]);
        return;
      }

      console.log('Raw device data from database:', deviceData);
      console.log('Number of devices found:', deviceData ? deviceData.length : 0);
      
      if (deviceData && deviceData.length > 0) {
        // Process and set the devices
        console.log('Processing device data...');
        const processedDevices = deviceData.map((device, index) => {
          console.log(`Device ${index + 1}:`, {
            id: device.id,
            name: device.name,
            model: device.model,
            authorized: device.authorized,
            last_access: device.last_access
          });
          return {
            id: device.id,
            name: device.name || 'Unknown Device',
            model: device.model || 'Unknown Model',
            ip_address: device.ip_address || 'No IP Address',
            location: device.location || 'Unknown Location',
            authorized: device.authorized,
            last_access: device.last_access,
            created_at: device.created_at,
            isCurrentDevice: device.name === Device.deviceName && device.model === Device.modelName
          };
        });
        
        setUserDevices(processedDevices);
        console.log('Devices successfully loaded into state');
      } else {
        console.log('No devices found in database for this user');
        setUserDevices([]);
      }
      
    } catch (error) {
      console.error('Exception while fetching user devices:', error);
      showAlert('An unexpected error occurred while loading devices', 'error');
      setUserDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  const toggleDeviceAuthorization = async (deviceId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('device_info')
        .update({ authorized: !currentStatus })
        .eq('id', deviceId);

      if (error) {
        console.error('Error toggling device authorization:', error);
        showAlert('Failed to update device authorization', 'error');
        return;
      }

      showAlert(`Device ${!currentStatus ? 'authorized' : 'blocked'} successfully`, 'success');
      await fetchUserDevices(); // Refresh list
    } catch (error) {
      console.error('Error toggling device authorization:', error);
      showAlert('An error occurred while updating device', 'error');
    }
  };

  const deleteDevice = async (deviceId) => {
    try {
      const { error } = await supabase
        .from('device_info')
        .delete()
        .eq('id', deviceId);

      if (error) {
        console.error('Error deleting device:', error);
        showAlert('Failed to delete device', 'error');
        return;
      }

      showAlert('Device deleted successfully', 'success');
      await fetchUserDevices(); // Refresh list
    } catch (error) {
      console.error('Error deleting device:', error);
      showAlert('An error occurred while deleting device', 'error');
    }
  };

  const handlePasswordChange = async () => {
    console.log('🔐 Starting password change process...');
    
    if (isChangingPassword) {
      console.log('Password change already in progress, ignoring...');
      return;
    }
    
    if (!userSession) {
      console.log('No user session found');
      showAlert('No active session. Please log in again.', 'error');
      return;
    }
    
    if (oldPassword.length < 6) {
      console.log('Old password too short');
      showAlert('Old password must be at least 6 characters long.', 'error');
      return;
    }
    
    if (newPassword.length < 6) {
      console.log('New password too short');
      showAlert('New password must be at least 6 characters long.', 'error');
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      console.log('Passwords do not match');
      showAlert('New password and confirmation do not match.', 'error');
      return;
    }
    
    setIsChangingPassword(true);
    console.log('Setting loading state...');
    
    try {
      console.log('Updating password in database...');
      console.log('User email:', userSession.user.email);
      console.log('User ID:', userSession.user.id);
      
      // Update password directly in the users table
      const dbResult = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', userSession.user.id);
        
      console.log('Database result received:', dbResult);
      console.log('Database data:', dbResult.data);
      console.log('Database error:', dbResult.error);
        
      if (dbResult.error) {
        console.error('Database update error:', dbResult.error);
        showAlert(`Failed to update password in database: ${dbResult.error.message}`, 'error');
        setIsChangingPassword(false);
        return;
      }
      
      console.log('Database password updated successfully');
      
      // Success - show alert and close modal
      console.log('Password change completed successfully');
      showAlert('Password updated successfully', 'success');
      
      // Clear all password fields and visibility states
      console.log('Clearing form fields...');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
      
      // Close the modal
      console.log('Closing modal...');
      setPasswordModalVisible(false);
      
    } catch (error) {
      console.error('Unexpected error in handlePasswordChange:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      showAlert('An unexpected error occurred. Please try again.', 'error');
    } finally {
      console.log('Clearing loading state...');
      setIsChangingPassword(false);
    }
  };

  const handleEmailChange = async () => {
    if (!userSession) {
      showAlert('No active session. Please log in again.', 'error');
      return;
    }
    if (!isEmailValid(newEmail)) {
      showAlert('Invalid email format. Please enter a valid email.', 'error');
      return;
    }
    if (newEmail !== confirmNewEmail) {
      showAlert('New email and confirmation do not match.', 'error');
      return;
    }
    try {
      // Update email in Supabase Auth only - don't update database yet
      const { error: authError } = await supabase.auth.updateUser({
        email: newEmail,
      });
      if (authError) {
        showAlert(`Failed to update the email: ${authError.message}`, 'error');
        return;
      }

      console.log('Email update request sent successfully');
      
      // Show success alert that tells user to check their email
      showAlert('Please check your new email inbox and click the confirmation link to complete the change.', 'info');
      
      // Clear email fields immediately
      setNewEmail('');
      setConfirmNewEmail('');
      
      // Close modal immediately after showing alert
      console.log('Closing email modal immediately...');
      setEmailModalVisible(false);
      
    } catch (error) {
      console.error('Error in handleEmailChange:', error);
      showAlert('An unexpected error occurred. Please try again.', 'error');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          message={alert.message}
          type={alert.type}
          onClose={() => removeAlert(alert.id)}
        />
      ))}
      
      <View style={styles.contentContainer}>
        {/* Decorative elements */}
        <View style={styles.gradientHeader} />
        <View style={styles.decorationCircle} />
        <View style={styles.decorationDot} />
      
        {/* Beautiful Modern Header */}
        <Animated.View 
          style={[
            { 
              opacity: fadeAnim,
              transform: [
                { translateY: headerSlideAnim },
                { scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1]
                })}
              ]
            }
          ]}
        >
          <LinearGradient
            colors={['#FF6B35', '#F79B35', '#FFD662']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modernHeaderContainer}
          >
            {/* Floating decorative elements */}
            <View style={styles.floatingCircle1} />
            <View style={styles.floatingCircle2} />
            <View style={styles.floatingCircle3} />
            <View style={styles.geometricShape} />
            
            <View style={styles.headerContent}>
              {/* Shield with glowing effect */}
                             <View style={styles.shieldContainer}>
                 <View style={styles.shieldGlow} />
                 <View style={styles.shieldBackground}>
                   <Ionicons name="shield-checkmark" size={44} color="#FF6B35" />
                 </View>
               </View>
              
                             <View style={styles.textSection}>
                 <Text style={styles.modernTitle}>Security Center</Text>
                 <View style={styles.modernUnderline} />
               </View>
            </View>
          </LinearGradient>
        </Animated.View>
        
        {/* Enhanced Security Status Cards */}
        <Animated.View 
          style={[
            styles.securityCardsContainer,
            {
              opacity: securityStatusAnim,
              transform: [{ 
                translateY: securityStatusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                }) 
              }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.securityCard}
            onPress={() => setEmailModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.securityCardHeader}>
              <View style={styles.securityIconContainer}>
                <Ionicons name="mail-outline" size={24} color="#FF9800" />
              </View>
              <Text style={styles.securityCardTitle}>Email Security</Text>
              <Ionicons name="chevron-forward" size={20} color="#FF9800" />
            </View>
            <View style={styles.statusIndicator}>
              <Ionicons name="checkmark-circle" size={20} color="#00B894" />
              <Text style={styles.statusText}>Current: {oldEmail}</Text>
            </View>
            <Text style={styles.securityCardDescription}>
              Tap to change your email address
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.securityCard}
            onPress={() => setPasswordModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.securityCardHeader}>
              <View style={styles.securityIconContainer}>
                <Ionicons name="key-outline" size={24} color="#FF9800" />
              </View>
              <Text style={styles.securityCardTitle}>Password Security</Text>
              <Ionicons name="chevron-forward" size={20} color="#FF9800" />
            </View>
            <View style={styles.statusIndicator}>
              <Ionicons name="shield-checkmark" size={20} color="#00B894" />
              <Text style={styles.statusText}>Strong password configured</Text>
            </View>
            <Text style={styles.securityCardDescription}>
              Tap to update your password
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.divider} />
        
        {/* Enhanced Action Buttons */}
        <Animated.View 
          style={[
            styles.actionButtonsContainer,
            {
              opacity: actionButtonsAnim,
              transform: [{ 
                translateY: actionButtonsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                }) 
              }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.deviceManagementButton}
            onPress={() => {
              setShowDevicesModal(true);
              fetchUserDevices();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.deviceManagementContent}>
              <View style={styles.deviceManagementIcon}>
                <Ionicons name="phone-portrait" size={22} color="#FF9800" />
              </View>
              <View style={styles.deviceManagementTextContainer}>
                <Text style={styles.deviceManagementText}>Manage Devices</Text>
                <Text style={styles.deviceManagementSubtext}>View and control device access</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FF9800" />
            </View>
          </TouchableOpacity>

          {/* Device Information Section */}
          <Animated.View 
            style={[
              styles.deviceSection,
              {
                opacity: deviceSectionAnim,
                transform: [{ 
                  translateY: deviceSectionAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0]
                  }) 
                }]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.deviceInfoCard} 
              onPress={() => setShowDeviceInfo(!showDeviceInfo)}
              activeOpacity={0.7}
            >
              <View style={styles.deviceCardHeader}>
                <View style={styles.deviceIconContainer}>
                  <Ionicons name="phone-portrait-outline" size={24} color="#FF9800" />
                </View>
                <View style={styles.deviceInfoTextContainer}>
                  <Text style={styles.deviceCardTitle}>Device Information</Text>
                  <Text style={styles.deviceCardSubtitle}>View current device details</Text>
                </View>
                <Ionicons 
                  name={showDeviceInfo ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#FF9800" 
                />
              </View>
              
              {showDeviceInfo && (
                <View style={[styles.deviceDetails, { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginTop: 10, shadowColor: '#FF9800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }]}> 
                  <View style={{ alignItems: 'center', marginBottom: 18 }}>
                    <Ionicons name="phone-portrait-outline" size={36} color="#FF9800" style={{ marginBottom: 6 }} />
                    <Text style={{ fontWeight: '700', fontSize: 18, color: '#FF9800', marginBottom: 2 }}>Current Device</Text>
                  </View>
                  <View style={{ borderTopWidth: 1, borderTopColor: '#FFE0B2', paddingTop: 10 }}>
                    <View style={[styles.deviceDetailRow, { marginBottom: 12 }]}> 
                      <Text style={[styles.deviceDetailLabel, { color: '#C2410C' }]}>Device Name</Text>
                      <Text style={styles.deviceDetailValue}>{deviceInfo.deviceName}</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: '#FFE0B2', marginVertical: 2 }} />
                    <View style={[styles.deviceDetailRow, { marginBottom: 12, marginTop: 8 }]}> 
                      <Text style={[styles.deviceDetailLabel, { color: '#C2410C' }]}>Model</Text>
                      <Text style={styles.deviceDetailValue}>{deviceInfo.deviceModel}</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: '#FFE0B2', marginVertical: 2 }} />
                    <View style={[styles.deviceDetailRow, { marginBottom: 12, marginTop: 8 }]}> 
                      <Text style={[styles.deviceDetailLabel, { color: '#C2410C' }]}>Manufacturer</Text>
                      <Text style={styles.deviceDetailValue}>{deviceInfo.manufacturer}</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: '#FFE0B2', marginVertical: 2 }} />
                    <View style={[styles.deviceDetailRow, { marginTop: 8 }]}> 
                      <Text style={[styles.deviceDetailLabel, { color: '#C2410C' }]}>Platform</Text>
                      <Text style={styles.deviceDetailValue}>{deviceInfo.platform}</Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Security Tips Card */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <View style={styles.tipsIconContainer}>
                <Ionicons name="bulb" size={20} color="#FF9800" />
              </View>
              <Text style={styles.tipsTitle}>Security Tips</Text>
            </View>
            <Text style={styles.tipText}>
              • Use strong passwords with mixed characters{'\n'}
              • Enable two-factor authentication when possible{'\n'}
              • Never share your credentials with anyone{'\n'}
              • Update passwords regularly for better security
            </Text>
          </View>
        </Animated.View>
      </View>
      
      {/* Devices Management Modal */}
      <Modal visible={showDevicesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.devicesModalContainer}>
            <View style={styles.devicesModalHeader}>
              <Text style={styles.devicesModalTitle}>Device Management</Text>
              <TouchableOpacity 
                style={styles.closeIcon} 
                onPress={() => setShowDevicesModal(false)}
              >
                <Ionicons name="close" size={24} color="#2D3436" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  devicesTabActive === 'authorized' && styles.activeTab
                ]}
                onPress={() => setDevicesTabActive('authorized')}
              >
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color={devicesTabActive === 'authorized' ? '#FFFFFF' : '#00B894'} 
                />
                <Text style={[
                  styles.tabText,
                  devicesTabActive === 'authorized' && styles.activeTabText
                ]}>
                  Authorized
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  devicesTabActive === 'blocked' && styles.activeTab
                ]}
                onPress={() => setDevicesTabActive('blocked')}
              >
                <Ionicons 
                  name="ban" 
                  size={20} 
                  color={devicesTabActive === 'blocked' ? '#FFFFFF' : '#F44336'} 
                />
                <Text style={[
                  styles.tabText,
                  devicesTabActive === 'blocked' && styles.activeTabText
                ]}>
                  Blocked
                </Text>
              </TouchableOpacity>
            </View>

            {/* Devices List */}
            <ScrollView style={styles.devicesListContainer}>
              {loadingDevices ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading devices...</Text>
                </View>
                              ) : (
                <>
                  {userDevices
                    .filter(device => {
                      return devicesTabActive === 'authorized' ? device.authorized : !device.authorized;
                    })
                    .map((device, index) => {
                      return (
                        <View key={device.id || index} style={styles.deviceItem}>
                          {/* Header Section - Icon, Name, and Status Badge */}
                          <View style={styles.deviceHeader}>
                            <View style={styles.deviceIcon}>
                              <Ionicons 
                                name="phone-portrait" 
                                size={26} 
                                color="#FF9800" 
                              />
                            </View>
                            
                            <View style={styles.deviceTitleSection}>
                              <Text 
                                style={styles.deviceName}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {device.name || 'Unknown Device'}
                              </Text>
                              
                              <Text style={styles.deviceModel}>
                                {device.model || 'Unknown Model'}
                              </Text>
                            </View>
                          </View>

                          {/* Details Section */}
                          <View style={styles.deviceDetailsSection}>
                            <View style={styles.deviceDetailRow}>
                              <Ionicons 
                                name="location-outline" 
                                size={16} 
                                color="#718096" 
                                style={styles.deviceDetailIcon} 
                              />
                              <Text style={styles.deviceDetailText}>
                                {device.location || 'Unknown Location'} • {device.ip_address || 'No IP Address'}
                              </Text>
                            </View>
                            
                            <View style={styles.deviceDetailRow}>
                              <Ionicons 
                                name="time-outline" 
                                size={16} 
                                color="#718096" 
                                style={styles.deviceDetailIcon} 
                              />
                              <Text style={styles.deviceDetailText}>
                                Last access: {device.last_access 
                                  ? `${new Date(device.last_access).toLocaleDateString()} at ${new Date(device.last_access).toLocaleTimeString()}`
                                  : 'Never accessed'
                                }
                              </Text>
                            </View>
                          </View>

                          {/* Action Section */}
                          <View style={styles.deviceActionSection}>
                            <TouchableOpacity
                              style={[
                                styles.actionButton,
                                device.authorized ? styles.blockDeviceButton : styles.authorizeButton
                              ]}
                              onPress={() => {
                                toggleDeviceAuthorization(device.id, device.authorized);
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons 
                                name={device.authorized ? 'ban' : 'checkmark-circle'} 
                                size={18} 
                                color="#FFFFFF" 
                              />
                              <Text style={styles.actionButtonText}>
                                {device.authorized ? 'Block Device' : 'Authorize Device'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                </>
              )}

              {!loadingDevices && userDevices.filter(device => 
                devicesTabActive === 'authorized' ? device.authorized : !device.authorized
              ).length === 0 && (
                <View style={styles.emptyDevicesContainer}>
                  <Ionicons 
                    name={devicesTabActive === 'authorized' ? 'phone-portrait' : 'ban'} 
                    size={48} 
                    color="#CBD5E0" 
                  />
                  <Text style={styles.emptyDevicesText}>
                    No {devicesTabActive} devices found
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal visible={isPasswordModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalHeader}>Change Password</Text>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={{ position: 'relative', width: '100%' }}>
                  <TextInput
                    style={[
                      styles.input,
                      focusedInput === 'oldPassword' && styles.focusedInput
                    ]}
                    placeholder="Enter your current password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showOldPassword}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    onFocus={() => setFocusedInput('oldPassword')}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity
                    style={{ position: 'absolute', right: 16, top: 18 }}
                    onPress={() => setShowOldPassword(v => !v)}
                  >
                    <Ionicons name={showOldPassword ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={{ position: 'relative', width: '100%' }}>
                  <TextInput
                    style={[
                      styles.input,
                      focusedInput === 'newPassword' && styles.focusedInput
                    ]}
                    placeholder="Enter your new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    onFocus={() => setFocusedInput('newPassword')}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity
                    style={{ position: 'absolute', right: 16, top: 18 }}
                    onPress={() => setShowNewPassword(v => !v)}
                  >
                    <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputHelpText}>
                  Password must be at least 6 characters long
                </Text>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={{ position: 'relative', width: '100%' }}>
                  <TextInput
                    style={[
                      styles.input,
                      focusedInput === 'confirmNewPassword' && styles.focusedInput
                    ]}
                    placeholder="Confirm your new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showConfirmNewPassword}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    onFocus={() => setFocusedInput('confirmNewPassword')}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity
                    style={{ position: 'absolute', right: 16, top: 18 }}
                    onPress={() => setShowConfirmNewPassword(v => !v)}
                  >
                    <Ionicons name={showConfirmNewPassword ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.submitButton, isChangingPassword && { opacity: 0.6 }]} 
                onPress={handlePasswordChange} 
                activeOpacity={0.8}
                disabled={isChangingPassword}
              >
                <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" style={styles.submitIcon} />
                <Text style={styles.submitButtonText}>
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.goBackButton}
                onPress={() => setPasswordModalVisible(false)}
                activeOpacity={0.7}
                disabled={isChangingPassword}
              >
                <Ionicons name="close-circle-outline" size={18} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={styles.goBackButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Email Modal */}
      <Modal visible={isEmailModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalHeader}>Change Email</Text>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.currentEmailContainer}>
                <Text style={styles.currentEmailLabel}>Current Email:</Text>
                <Text style={styles.currentEmailValue}>{oldEmail}</Text>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedInput === 'newEmail' && styles.focusedInput
                  ]}
                  placeholder="Enter your new email address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  onFocus={() => setFocusedInput('newEmail')}
                  onBlur={() => setFocusedInput(null)}
                />
                <Text style={styles.inputHelpText}>
                  We'll send a verification link to this email
                </Text>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm New Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedInput === 'confirmNewEmail' && styles.focusedInput
                  ]}
                  placeholder="Confirm your new email address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  value={confirmNewEmail}
                  onChangeText={setConfirmNewEmail}
                  onFocus={() => setFocusedInput('confirmNewEmail')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.submitButton} onPress={handleEmailChange} activeOpacity={0.8}>
                <Ionicons name="mail" size={18} color="#FFFFFF" style={styles.submitIcon} />
                <Text style={styles.submitButtonText}>Update Email</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.goBackButton}
                onPress={() => setEmailModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={18} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={styles.goBackButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default SecurityPage;