import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal } from 'react-native';
import styles from '../../Styles/Settings/SecurityPageStyle';
import { supabase } from '../../../Supabase';

const SecurityPage = () => {
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [isEmailModalVisible, setEmailModalVisible] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const handlePasswordChange = async () => {
    // Add functionality here
    alert('Password change functionality will be implemented.');
    setPasswordModalVisible(false);
  };

  const handleEmailChange = async () => {
    // Add functionality here
    alert('Email change functionality will be implemented.');
    setEmailModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Security Settings</Text>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setPasswordModalVisible(true)}>
        <Text style={styles.actionButtonText}>Change Password</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setEmailModalVisible(true)}>
        <Text style={styles.actionButtonText}>Change Email</Text>
      </TouchableOpacity>

      {/* Password Modal */}
      <Modal
        visible={isPasswordModalVisible}
        transparent={true}
        animationType="slide">
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
              onPress={handlePasswordChange}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.goBackButton}
              onPress={() => setPasswordModalVisible(false)}>
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Email Modal */}
      <Modal
        visible={isEmailModalVisible}
        transparent={true}
        animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>Change Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Old Email"
              value={oldEmail}
              onChangeText={setOldEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="New Email"
              value={newEmail}
              onChangeText={setNewEmail}
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleEmailChange}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.goBackButton}
              onPress={() => setEmailModalVisible(false)}>
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SecurityPage; 