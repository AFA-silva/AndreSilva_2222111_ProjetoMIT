import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import styles from '../../Styles/Settings/SecurityPageStyle';
import { Ionicons } from '@expo/vector-icons';
import Alert from '../../Utility/Alerts';

const SecurityPage = () => {
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [isEmailModalVisible, setEmailModalVisible] = useState(false);

  const [alerts, setAlerts] = useState([]);

  const showAlert = (message, type) => {
    setAlerts([...alerts, { id: Date.now(), message, type }]);
  };

  const removeAlert = (id) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  const handlePasswordChange = () => {
    showAlert('Password change functionality will be implemented.', 'info');
    setPasswordModalVisible(false);
  };

  const handleEmailChange = () => {
    showAlert('Email change functionality will be implemented.', 'info');
    setEmailModalVisible(false);
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
        style={styles.passwordButton} // Orange button
        onPress={() => setPasswordModalVisible(true)}
      >
        <Text style={styles.actionButtonText}>Change Password</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.emailButton} // Yellow button
        onPress={() => setEmailModalVisible(true)}
      >
        <Text style={styles.actionButtonText}>Change Email</Text>
      </TouchableOpacity>

      {/* Security Features Section */}
      <ScrollView style={styles.featuresSection}>
        <Text style={styles.featuresHeader}>Security Features</Text>
        <Text style={styles.feature}>• Password Strength Indicator</Text>
        <Text style={styles.feature}>• Two-Factor Authentication (Coming Soon)</Text>
        <Text style={styles.feature}>• Login Activity Log</Text>
        <Text style={styles.feature}>• IP Whitelisting</Text>
        <Text style={styles.feature}>• Session Timeout Alerts</Text>
      </ScrollView>

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
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handlePasswordChange}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalGoBackButton} // Updated "Go Back" button color
              onPress={() => setPasswordModalVisible(false)}
            >
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Email Modal */}
      <Modal
        visible={isEmailModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>Change Email</Text>
            <TextInput style={styles.input} placeholder="Old Email" />
            <TextInput style={styles.input} placeholder="New Email" />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleEmailChange}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalGoBackButton} // Updated "Go Back" button color
              onPress={() => setEmailModalVisible(false)}
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