import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For icons
import styles from '../Styles/MainPageStyles/SettingsPageStyle';
import Header from '../Utility/Header';

const SettingsPage = ({ navigation }) => {
  return (
    <View style={styles.mainContainer}>
      <Header title="Settings" />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionHeader}>Account</Text>

        {/* Profile Section */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ProfilePage')} // Navigate to ProfilePage
        >
          <View style={styles.menuRow}>
            <View style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="person-circle-outline" size={24} color="#FF9800" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>Profile</Text>
              <Text style={styles.menuItemSubtitle}>Manage your account and personal information</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#CBD5E0" />
          </View>
        </TouchableOpacity>

        {/* Security Section */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('SecurityPage')} // Navigate to Security
        >
          <View style={styles.menuRow}>
            <View style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="lock-closed-outline" size={24} color="#FF9800" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>Security</Text>
              <Text style={styles.menuItemSubtitle}>Update your email, password and security settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#CBD5E0" />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Preferences</Text>

        {/* Notifications Section */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('NotificationsPage')}
        >
          <View style={styles.menuRow}>
            <View style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="notifications-outline" size={24} color="#FF9800" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>Notifications</Text>
              <Text style={styles.menuItemSubtitle}>Configure your notification preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#CBD5E0" />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Support</Text>

        {/* Help and Support Section */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('SupportPage')} // Navigate to SupportPage
        >
          <View style={styles.menuRow}>
            <View style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="help-circle-outline" size={24} color="#FF9800" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>Help and Support</Text>
              <Text style={styles.menuItemSubtitle}>Get help and contact support</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#CBD5E0" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default SettingsPage;