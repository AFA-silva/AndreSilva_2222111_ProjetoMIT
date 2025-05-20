import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import styles from '../../Styles/Settings/SecurityPageStyle';
import { Ionicons } from '@expo/vector-icons';
import Alert from '../../Utility/Alerts';
import { supabase } from '../../../Supabase';
import { isEmailValid } from '../../Utility/Validations';

const SecurityPage = () => {
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [isEmailModalVisible, setEmailModalVisible] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [userSession, setUserSession] = useState(null);

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
      <Ionicons name="shield-outline" size={80} color="#F9A825" style={styles.icon} />
      <Text style={styles.header}>Security Settings</Text>

      {/* Tips and Help Section */}
      <View style={styles.tipsSection}>
        <Text style={styles.tipText}>
          <Ionicons name="information-circle" size={18} color="#F9A825" /> Use a strong password with a combination of letters, numbers, and special characters.
        </Text>
        <Text style={styles.tipText}>
          <Ionicons name="information-circle" size={18} color="#F9A825" /> Regularly update your password to enhance your account security.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setPasswordModalVisible(true)}
      >
        <View style={styles.buttonIcon}>
          <Ionicons name="key-outline" size={18} color="#F9A825" />
        </View>
        <Text style={styles.actionButtonText}>Change Password</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setEmailModalVisible(true)}
      >
        <View style={styles.buttonIcon}>
          <Ionicons name="mail-outline" size={18} color="#F9A825" />
        </View>
        <Text style={styles.actionButtonText}>Change Email</Text>
      </TouchableOpacity>
      
      {/* Password Modal */}
      <Modal visible={isPasswordModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>Change Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Old Password"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              secureTextEntry
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
            />
            <TouchableOpacity style={styles.submitButton} onPress={handlePasswordChange}>
              <Text style={styles.submitButtonText}>Update Password</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.goBackButton}
              onPress={() => setPasswordModalVisible(false)}
            >
              <Text style={styles.goBackButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Email Modal */}
      <Modal visible={isEmailModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>Change Email</Text>
            <Text style={styles.currentEmailText}>Current Email: {oldEmail}</Text>
            <TextInput
              style={styles.input}
              placeholder="New Email"
              keyboardType="email-address"
              value={newEmail}
              onChangeText={setNewEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Email"
              keyboardType="email-address"
              value={confirmNewEmail}
              onChangeText={setConfirmNewEmail}
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleEmailChange}>
              <Text style={styles.submitButtonText}>Update Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.goBackButton}
              onPress={() => setEmailModalVisible(false)}
            >
              <Text style={styles.goBackButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default SecurityPage;