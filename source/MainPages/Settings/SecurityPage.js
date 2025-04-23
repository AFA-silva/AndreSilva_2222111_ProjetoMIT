import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import styles from '../../Styles/Settings/SecurityPageStyle';
import { Ionicons } from '@expo/vector-icons';
import Alert from '../../Utility/Alerts';
import { supabase } from '../../../Supabase';
import { updateUser } from '../../Utility/MainQueries';

const SecurityPage = () => {
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [userSession, setUserSession] = useState(null);

  // Fetch session data when the component loads
  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error fetching session:', error.message);
        showAlert('Failed to fetch session. Please log in again.', 'error');
        return;
      }

      if (data?.session) {
        setUserSession(data.session);
      } else {
        showAlert('No active session found. Please log in again.', 'error');
      }
    };

    fetchSession();
  }, []);

  // Function to show alerts
  const showAlert = (message, type) => {
    const alertId = Date.now();
    setAlerts([...alerts, { id: alertId, message, type }]);
    setTimeout(() => removeAlert(alertId), 3000);
  };

  // Function to remove alerts
  const removeAlert = (id) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  // Function to handle password change
  const handlePasswordChange = async () => {
    if (!userSession) {
      showAlert('No active session. Please log in again.', 'error');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showAlert('New password and confirmation do not match.', 'error');
      return;
    }

    try {
      // Verify the old password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userSession.user.email,
        password: oldPassword,
      });

      if (signInError) {
        console.error('Error verifying old password:', signInError.message);
        showAlert('Old password is incorrect.', 'error');
        return;
      }

      console.log('Old password verified successfully:', signInData);

      // Update password in Supabase Auth
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {
        console.error('Error updating password in Supabase Auth:', updateError.message);
        showAlert('Failed to update the password. Please try again.', 'error');
        return;
      }

      console.log('Password updated successfully in Supabase Auth:', updateData);

      // Update password in the `users` table
      const { data: userUpdateData, error: userUpdateError } = await updateUser(userSession.user.id, {
        password: newPassword, // The password will be hashed in MainQueries.js
      });

      if (userUpdateError) {
        console.error('Error updating user table:', userUpdateError.message);
        showAlert('Failed to update user info in the database. Please try again.', 'error');
        return;
      }

      console.log('User table updated successfully:', userUpdateData);

      showAlert('Password updated successfully.', 'success');
      setPasswordModalVisible(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      showAlert('An unexpected error occurred. Please try again.', 'error');
    }
  };

  return (
    <View style={styles.container}>
      {/* Alerts */}
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          message={alert.message}
          type={alert.type}
          onClose={() => removeAlert(alert.id)}
        />
      ))}

      {/* Icon */}
      <Ionicons name="shield-outline" size={80} color="#F9A825" style={styles.icon} />

      <Text style={styles.header}>Security Settings</Text>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.passwordButton}
        onPress={() => setPasswordModalVisible(true)}
      >
        <Text style={styles.actionButtonText}>Change Password</Text>
      </TouchableOpacity>

      {/* Password Modal */}
      <Modal
        visible={isPasswordModalVisible}
        transparent={true}
        animationType="slide"
      >
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
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handlePasswordChange}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalGoBackButton}
              onPress={() => setPasswordModalVisible(false)}
            >
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SecurityPage;