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
        
        console.log('📱 Device Info Loaded:', {
          deviceName,
          deviceModel,
          manufacturer,
          brand,
          totalMemory,
          osVersion,
          deviceType,
          screenSize: `${width}x${height}`
        });
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
      // Fetch current user directly from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('[SecurityPage-EmailValidation] Failed to get current auth user', authError);
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
        console.error('[SecurityPage-EmailValidation] Failed to fetch database email', userError);
        return;
      }

      const databaseEmail = userData.email;
      
      console.log('[SecurityPage-EmailValidation] === EMAIL VALIDATION ===');
      console.log('[SecurityPage-EmailValidation] Auth email (direct):', authEmail);
      console.log('[SecurityPage-EmailValidation] Database email:', databaseEmail);
      console.log('[SecurityPage-EmailValidation] User ID:', userId);
      
      // Sync database with the current auth email
      if (authEmail !== databaseEmail) {
        console.log('[SecurityPage-EmailValidation] Emails differ. Updating database to match auth email');
        console.log('[SecurityPage-EmailValidation] From:', databaseEmail, '→ To:', authEmail);
        
        const { data: updateData, error: updateError } = await supabase
          .from('users')
          .update({ email: authEmail })
          .eq('id', userId)
          .select();
          
        if (updateError) {
          console.error('[SecurityPage-EmailValidation] Failed to update database email', updateError);
        } else {
          console.log('[SecurityPage-EmailValidation] Database email updated successfully!');
          console.log('[SecurityPage-EmailValidation] Updated data:', updateData);
          
          // Update the UI with the new email
          setOldEmail(authEmail);
        }
      } else {
        console.log('[SecurityPage-EmailValidation] Auth and database emails match - no update needed');
        // Still update UI to ensure it shows the correct email
        setOldEmail(authEmail);
      }
    } catch (error) {
      console.error('[SecurityPage-EmailValidation] Error in email validation', error);
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
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        showAlert('Failed to fetch session. Please log in again.', 'error');
        return;
      }
      if (data?.session) {
        setUserSession(data.session);
        
        // Run email validation first (same as MainMenuPage)
        await userEmailValidation();
        
        // Register current device access
        await registerDeviceAccess();
      } else {
        showAlert('No active session found. Please log in again.', 'error');
      }
    };
    fetchSession();
  }, []);

  // Refresh email whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('SecurityPage focused - running email validation...');
      userEmailValidation();
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

  // Device management functions
  // Device registration happens on SecurityPage mount and session fetch.
  // It only registers once per device (per user, model, name). If the device exists, only last_access is updated.
  const registerDeviceAccess = async () => {
    try {
      if (!userSession) return;
      
      // Get detailed device information using expo-device
      const deviceName = Device.deviceName || 'Unknown Device';
      const deviceModel = Device.modelName || 'Unknown Model';
      const manufacturer = Device.manufacturer || 'Unknown Manufacturer';
      const brand = Device.brand || 'Unknown Brand';
      const osVersion = Device.osVersion || 'Unknown';
      
      // Create a more descriptive device model string
      const detailedModel = `${brand} ${deviceModel} (${manufacturer})`;
      
      const deviceData = {
        user_id: userSession.user.id,
        model: detailedModel,
        name: deviceName,
        ip_address: '192.168.1.1', // Better placeholder IP
        location: 'Current Location', // Better placeholder
        authorized: true,
        last_access: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      // Check if device already exists (should already be registered from MainPage)
      const { data: existingDevice, error: checkError } = await supabase
        .from('device_info')
        .select('*')
        .eq('user_id', userSession.user.id)
        .eq('model', detailedModel)
        .eq('name', deviceName)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing device:', checkError);
        return;
      }

      if (existingDevice) {
        // Update last access
        await supabase
          .from('device_info')
          .update({ last_access: deviceData.last_access })
          .eq('id', existingDevice.id);
      } else {
        // Insert new device (with created_at)
        await supabase
          .from('device_info')
          .insert([deviceData]);
      }
    } catch (error) {
      console.error('Error registering device access:', error);
    }
  };

  const fetchUserDevices = async () => {
    try {
      if (!userSession) return;
      
      setLoadingDevices(true);
      const { data, error } = await supabase
        .from('device_info')
        .select('*')
        .eq('user_id', userSession.user.id)
        .order('last_access', { ascending: false });

      if (error) {
        console.error('Error fetching devices:', error);
        showAlert('Failed to load device information', 'error');
        return;
      }

      console.log('Fetched devices:', data);
      setUserDevices(data || []);
    } catch (error) {
      console.error('Error fetching user devices:', error);
      showAlert('An error occurred while loading devices', 'error');
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
        console.error('Error updating device authorization:', error);
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
      console.log('⏳ Password change already in progress, ignoring...');
      return;
    }
    
    if (!userSession) {
      console.log('❌ No user session found');
      showAlert('No active session. Please log in again.', 'error');
      return;
    }
    
    if (oldPassword.length < 6) {
      console.log('❌ Old password too short');
      showAlert('Old password must be at least 6 characters long.', 'error');
      return;
    }
    
    if (newPassword.length < 6) {
      console.log('❌ New password too short');
      showAlert('New password must be at least 6 characters long.', 'error');
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      console.log('❌ Passwords do not match');
      showAlert('New password and confirmation do not match.', 'error');
      return;
    }
    
    setIsChangingPassword(true);
    console.log('⏳ Setting loading state...');
    
    try {
      console.log('🔄 Updating password in database...');
      console.log('📧 User email:', userSession.user.email);
      console.log('🆔 User ID:', userSession.user.id);
      
      // Update password directly in the users table
      const dbResult = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', userSession.user.id);
        
      console.log('📤 Database result received:', dbResult);
      console.log('📤 Database data:', dbResult.data);
      console.log('📤 Database error:', dbResult.error);
        
      if (dbResult.error) {
        console.error('❌ Database update error:', dbResult.error);
        showAlert(`Failed to update password in database: ${dbResult.error.message}`, 'error');
        setIsChangingPassword(false);
        return;
      }
      
      console.log('✅ Database password updated successfully');
      
      // Success - show alert and close modal
      console.log('🎉 Password change completed successfully');
      showAlert('Password updated successfully', 'success');
      
      // Clear all password fields and visibility states
      console.log('🧹 Clearing form fields...');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
      
      // Close the modal
      console.log('🚪 Closing modal...');
      setPasswordModalVisible(false);
      
    } catch (error) {
      console.error('❌ Unexpected error in handlePasswordChange:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      showAlert('An unexpected error occurred. Please try again.', 'error');
    } finally {
      console.log('🏁 Clearing loading state...');
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
                <View style={styles.deviceDetails}>
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.deviceDetailLabel}>Device Name:</Text>
                    <Text style={styles.deviceDetailValue}>{deviceInfo.deviceName}</Text>
                  </View>
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.deviceDetailLabel}>Model:</Text>
                    <Text style={styles.deviceDetailValue}>{deviceInfo.deviceModel}</Text>
                  </View>
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.deviceDetailLabel}>Manufacturer:</Text>
                    <Text style={styles.deviceDetailValue}>{deviceInfo.manufacturer}</Text>
                  </View>
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.deviceDetailLabel}>Brand:</Text>
                    <Text style={styles.deviceDetailValue}>{deviceInfo.brand}</Text>
                  </View>
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.deviceDetailLabel}>Platform:</Text>
                    <Text style={styles.deviceDetailValue}>{deviceInfo.platform}</Text>
                  </View>
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.deviceDetailLabel}>OS Version:</Text>
                    <Text style={styles.deviceDetailValue}>{deviceInfo.osVersion}</Text>
                  </View>
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.deviceDetailLabel}>Device Type:</Text>
                    <Text style={styles.deviceDetailValue}>{deviceInfo.deviceType}</Text>
                  </View>
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.deviceDetailLabel}>Memory:</Text>
                    <Text style={styles.deviceDetailValue}>{deviceInfo.totalMemory}</Text>
                  </View>
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.deviceDetailLabel}>Screen Size:</Text>
                    <Text style={styles.deviceDetailValue}>
                      {Math.round(deviceInfo.screenWidth)}x{Math.round(deviceInfo.screenHeight)}
                    </Text>
                  </View>
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.deviceDetailLabel}>Last Access:</Text>
                    <Text style={styles.deviceDetailValue}>
                      {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                    </Text>
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
                userDevices
                  .filter(device => 
                    devicesTabActive === 'authorized' ? device.authorized : !device.authorized
                  )
                  .map((device, index) => (
                                           <View key={device.id} style={styles.deviceItem}>
                         <View style={styles.deviceIcon}>
                           <Ionicons 
                             name={
                               device.model.toLowerCase().includes('ios') 
                                 ? 'phone-portrait' 
                                 : device.model.toLowerCase().includes('web')
                                   ? 'desktop'
                                   : device.name.toLowerCase().includes('tablet')
                                     ? 'tablet-portrait'
                                     : 'phone-portrait'
                             } 
                             size={24} 
                             color="#FF9800" 
                           />
                         </View>
                      
                      <View style={styles.deviceDetails}>
                        <Text style={styles.deviceName}>{device.name}</Text>
                        <Text style={styles.deviceModel}>{device.model}</Text>
                        <Text style={styles.deviceLocation}>
                          {device.location} • {device.ip_address}
                        </Text>
                        <Text style={styles.deviceLastAccess}>
                          Last access: {new Date(device.last_access).toLocaleDateString()} at{' '}
                          {new Date(device.last_access).toLocaleTimeString()}
                        </Text>
                      </View>

                      <View style={styles.deviceActions}>
                        <TouchableOpacity
                          style={[
                            styles.deviceActionButton,
                            { backgroundColor: device.authorized ? '#F44336' : '#00B894' }
                          ]}
                          onPress={() => toggleDeviceAuthorization(device.id, device.authorized)}
                        >
                          <Ionicons 
                            name={device.authorized ? 'ban' : 'checkmark'} 
                            size={18} 
                            color="#FFFFFF" 
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.deviceActionButton, { backgroundColor: '#718096' }]}
                          onPress={() => deleteDevice(device.id)}
                        >
                          <Ionicons name="trash" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
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