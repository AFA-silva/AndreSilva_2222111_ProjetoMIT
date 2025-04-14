import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For icons
import styles from '../Styles/MainPageStyles/SettingsPageStyle';

const SettingsPage = ({ navigation }) => {
  const handleLogout = () => {
    navigation.navigate('Login'); // Navigate to the login page
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Settings</Text>

      {/* Profile Section */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('ProfilePage')} // Navigate to ProfilePage
      >
        <View style={styles.menuRow}>
          <Ionicons name="person-circle-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Profile</Text>
            <Text style={styles.menuItemSubtitle}>Manage your account and personal information</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Security Section */}
      <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => navigation.navigate('SecurityPage')} // Navigate to Security
      >
        <View style={styles.menuRow}>
          <Ionicons name="lock-closed-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Security</Text>
            <Text style={styles.menuItemSubtitle}>Update your email, password and other Security setting</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Notifications Section */}
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuRow}>
          <Ionicons name="notifications-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Work In Progress. WIP...</Text>
            <Text style={styles.menuItemSubtitle}>Work In Progress. WIP...</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Help and Support Section */}
      <TouchableOpacity 
      style={styles.menuItem}
      onPress={() => navigation.navigate('SupportPage')} // Navigate to ProfilePage
      >
        <View style={styles.menuRow}>
          <Ionicons name="help-circle-outline" size={24} color="#FF9800" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemTitle}>Help and Support</Text>
            <Text style={styles.menuItemSubtitle}>Ask questions and help</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SettingsPage;