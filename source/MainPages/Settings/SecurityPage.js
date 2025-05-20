import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Platform
} from 'react-native';
import styles from '../../Styles/Settings/SecurityPageStyle';
import { Ionicons } from '@expo/vector-icons';
import Alert from '../../Utility/Alerts';
import { supabase } from '../../../Supabase';
import { isEmailValid } from '../../Utility/Validations';

const SecurityPage = () => {
  // Modal states
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [isEmailModalVisible, setEmailModalVisible] = useState(false);
  
  // Form states
  const [alerts, setAlerts] = useState([]);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [userSession, setUserSession] = useState(null);
  
  // Input focus states
  const [focusedInput, setFocusedInput] = useState(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tipsSectionAnim = useRef(new Animated.Value(0)).current;
  const securityStatusAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  // Animation on component mount
  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    
    Animated.stagger(200, [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver,
      }),
      Animated.timing(securityStatusAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver,
      }),
      Animated.timing(tipsSectionAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver,
      }),
      Animated.timing(buttonsAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver,
      })
    ]).start();
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        showAlert('Failed to fetch session. Please log in again.', 'error');
        return;
      }
      if (data?.session) {
        setUserSession(data.session);
        setOldEmail(data.session.user.email);
      } else {
        showAlert('No active session found. Please log in again.', 'error');
      }
    };
    fetchSession();
  }, []);

  // Add a new useEffect to listen for auth state changes
  useEffect(() => {
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // If the user changes their email and verifies it, this event will fire
      if (event === 'USER_UPDATED' && session) {
        // Check if email has changed compared to our stored oldEmail
        if (session.user.email !== oldEmail && session.user.email_confirmed_at) {
          try {
            // Now update the email in database since auth email was confirmed
            const { error: dbError } = await supabase
              .from('users')
              .update({ email: session.user.email })
              .eq('id', session.user.id);
              
            if (dbError) {
              console.error('Failed to update email in database:', dbError);
            } else {
              // Update local session data
              setUserSession(session);
              setOldEmail(session.user.email);
              showAlert('Email has been successfully updated!', 'success');
            }
          } catch (error) {
            console.error('Error syncing email with database:', error);
          }
        }
      }
    });

    // Clean up listener on component unmount
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [oldEmail]);

  const showAlert = (message, type) => {
    const alertId = Date.now();
    setAlerts([...alerts, { id: alertId, message, type }]);
    setTimeout(() => removeAlert(alertId), 3000);
  };

  const removeAlert = (id) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  const handlePasswordChange = async () => {
    if (!userSession) {
      showAlert('No active session. Please log in again.', 'error');
      return;
    }
    if (oldPassword.length < 6) {
      showAlert('Old password must be at least 6 characters long.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('New password must be at least 6 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showAlert('New password and confirmation do not match.', 'error');
      return;
    }
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userSession.user.email,
        password: oldPassword,
      });
      if (signInError) {
        showAlert('Old password is incorrect.', 'error');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        showAlert(`Failed to update password: ${updateError.message}`, 'error');
        return;
      }
      // Update password in the database
      await supabase.from('users').update({ password: newPassword }).eq('id', userSession.user.id);
      showAlert('Password updated successfully.', 'success');
      setPasswordModalVisible(false);
      // Clear password fields
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      showAlert('An unexpected error occurred. Please try again.', 'error');
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

      // Don't update the database at this point - remove the immediate database update
      
      // Show success alert that tells user to check their email
      showAlert('Please check your new email inbox and click the confirmation link to complete the change.', 'info');
      setEmailModalVisible(false);
      // Clear email fields
      setNewEmail('');
      setConfirmNewEmail('');
    } catch (error) {
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
      
        {/* Header section with icon */}
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ scale: fadeAnim }],
            alignItems: 'center'
          }}
        >
          <View style={styles.iconBackground}>
            <Ionicons name="shield-outline" size={80} color="#F9A825" style={styles.icon} />
          </View>
          <Text style={styles.header}>Security Settings</Text>
        </Animated.View>
        
        {/* Security Status Section */}
        <Animated.View 
          style={[
            styles.securityStatusContainer,
            {
              opacity: securityStatusAnim,
              transform: [{ 
                translateY: securityStatusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                }) 
              }]
            }
          ]}
        >
          <Text style={styles.securityStatusTitle}>Account Security Status</Text>
          <View style={styles.securityStatusRow}>
            <Ionicons name="checkmark-circle" size={22} color="#00B894" />
            <Text style={styles.securityStatusText}>
              Email: <Text style={styles.securityStatusStrong}>Verified</Text>
            </Text>
          </View>
          <View style={styles.securityStatusRow}>
            <Ionicons name="shield-checkmark" size={22} color="#F9A825" />
            <Text style={styles.securityStatusText}>
              Password: Last changed {userSession ? new Date(userSession.created_at).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <Text style={styles.securityAdvice}>
            We recommend changing your password regularly and using unique passwords for different accounts.
          </Text>
        </Animated.View>

        {/* Tips and Help Section */}
        <Animated.View 
          style={[
            styles.tipsSection,
            {
              opacity: tipsSectionAnim,
              transform: [{ 
                translateY: tipsSectionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                }) 
              }]
            }
          ]}
        >
          <View style={styles.tipContainer}>
            <Ionicons name="information-circle" size={18} color="#F9A825" style={styles.tipIcon} />
            <Text style={styles.tipText}>
              Use a strong password with a combination of letters, numbers, and special characters.
            </Text>
          </View>
          
          <View style={styles.tipContainer}>
            <Ionicons name="information-circle" size={18} color="#F9A825" style={styles.tipIcon} />
            <Text style={styles.tipText}>
              Regularly update your password to enhance your account security.
            </Text>
          </View>
          
          <View style={styles.tipContainer}>
            <Ionicons name="information-circle" size={18} color="#F9A825" style={styles.tipIcon} />
            <Text style={styles.tipText}>
              Never share your password with anyone, including customer support.
            </Text>
          </View>
        </Animated.View>
        
        <View style={styles.divider} />
        
        {/* Action Buttons */}
        <Animated.View 
          style={[
            styles.actionButtonsContainer,
            {
              opacity: buttonsAnim,
              transform: [{ 
                translateY: buttonsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                }) 
              }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setPasswordModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.buttonIcon}>
              <Ionicons name="key-outline" size={18} color="#F9A825" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionButtonText}>Change Password</Text>
              <Text style={styles.actionButtonDescription}>Update your account password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setEmailModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.buttonIcon}>
              <Ionicons name="mail-outline" size={18} color="#F9A825" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionButtonText}>Change Email</Text>
              <Text style={styles.actionButtonDescription}>Update your account email address</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
          </TouchableOpacity>
        </Animated.View>
      </View>
      
      {/* Password Modal */}
      <Modal visible={isPasswordModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalHeader}>Change Password</Text>
              <TouchableOpacity 
                style={styles.closeIcon} 
                onPress={() => setPasswordModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#2D3436" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'oldPassword' && styles.focusedInput
                ]}
                placeholder="Enter your current password"
                placeholderTextColor="#A0AEC0"
                secureTextEntry
                value={oldPassword}
                onChangeText={setOldPassword}
                onFocus={() => setFocusedInput('oldPassword')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'newPassword' && styles.focusedInput
                ]}
                placeholder="Enter your new password"
                placeholderTextColor="#A0AEC0"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                onFocus={() => setFocusedInput('newPassword')}
                onBlur={() => setFocusedInput(null)}
              />
              <Text style={styles.inputHelpText}>
                Password must be at least 6 characters long
              </Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'confirmNewPassword' && styles.focusedInput
                ]}
                placeholder="Confirm your new password"
                placeholderTextColor="#A0AEC0"
                secureTextEntry
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                onFocus={() => setFocusedInput('confirmNewPassword')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            
            <TouchableOpacity style={styles.submitButton} onPress={handlePasswordChange} activeOpacity={0.8}>
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" style={styles.submitIcon} />
              <Text style={styles.submitButtonText}>Update Password</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.goBackButton}
              onPress={() => setPasswordModalVisible(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={20} color="#4A5568" style={{ marginRight: 8 }} />
              <Text style={styles.goBackButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Email Modal */}
      <Modal visible={isEmailModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalHeader}>Change Email</Text>
              <TouchableOpacity 
                style={styles.closeIcon} 
                onPress={() => setEmailModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#2D3436" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.currentEmailText}>Current Email: {oldEmail}</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Email</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'newEmail' && styles.focusedInput
                ]}
                placeholder="Enter your new email address"
                placeholderTextColor="#A0AEC0"
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
                placeholderTextColor="#A0AEC0"
                keyboardType="email-address"
                value={confirmNewEmail}
                onChangeText={setConfirmNewEmail}
                onFocus={() => setFocusedInput('confirmNewEmail')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            
            <TouchableOpacity style={styles.submitButton} onPress={handleEmailChange} activeOpacity={0.8}>
              <Ionicons name="mail" size={20} color="#FFFFFF" style={styles.submitIcon} />
              <Text style={styles.submitButtonText}>Update Email</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.goBackButton}
              onPress={() => setEmailModalVisible(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={20} color="#4A5568" style={{ marginRight: 8 }} />
              <Text style={styles.goBackButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default SecurityPage;