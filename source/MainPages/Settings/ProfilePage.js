import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Animated,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import styles from '../../Styles/Settings/ProfilePageStyle';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../Supabase';
import { isEmailValid, isPhoneValid, isFieldNotEmpty } from '../../Utility/Validations';
import Alert from '../../Utility/Alerts';
import Header from '../../Utility/Header';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { fetchCountries } from '../../Utility/FetchCountries';
import { useFocusEffect } from '@react-navigation/native';
import StatisticsUpdater from '../../Utility/StatisticsUpdater';

const ProfilePage = ({ navigation }) => {
  // User data states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    region: '',
    birthdate: '',
  });

  // Statistics states
  const [statistics, setStatistics] = useState({
    account_age: 0,
    goals_created: 0,
    expenses_created: 0,
    income_created: 0,
  });
  
  // UI states
  const [profileImage, setProfileImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Alert state
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Date utility functions
  const dateUtils = {
    formatToDisplay: (date) => {
      if (!date) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    },
    
    formatForDB: (dateString) => {
      if (!dateString || dateString.trim() === '') return '';
      
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const matches = dateString.match(regex);
      
      if (!matches) return '';
      
      const day = matches[1];
      const month = matches[2];
      const year = matches[3];
      
      return `${year}-${month}-${day}`;
    },
    
    isValidFormat: (dateString) => {
      if (!dateString || dateString.trim() === '') return true;
      
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const matches = dateString.match(regex);
      
      if (!matches) return false;
      
      const day = parseInt(matches[1], 10);
      const month = parseInt(matches[2], 10);
      const year = parseInt(matches[3], 10);
      
      if (day < 1 || day > 31) return false;
      if (month < 1 || month > 12) return false;
      if (year < 1900 || year > new Date().getFullYear()) return false;
      
      return true;
    }
  };

  // Country search function
  const handleCountrySearch = (query) => {
    setSearchQuery(query);
    setFilteredCountries(
      countries.filter((country) =>
        country.name.toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  // Load user data when component mounts
  useEffect(() => {
    getCurrentUser();
    loadCountries();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start();
  }, []);

  // Refresh statistics when page is focused
  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        refreshStatistics();
      }
    }, [userId])
  );

  // Load countries data
  const loadCountries = async () => {
    try {
      const countriesData = await fetchCountries();
      setCountries(countriesData);
      setFilteredCountries(countriesData);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  // Refresh statistics from database
  const refreshStatistics = async () => {
    try {
      const stats = await StatisticsUpdater.getUserStatistics(userId);
      if (stats) {
        setStatistics(stats);
        console.log('Statistics refreshed:', stats);
      }
    } catch (error) {
      console.error('Error refreshing statistics:', error);
    }
  };

  // Auto-hide alert after 3 seconds
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Get current user
  const getCurrentUser = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('User not found');
      
      setUserId(user.id);
      await fetchUserData(user.id);
      
    } catch (error) {
      console.error('Error getting current user:', error);
      setError(error.message);
      setAlertMessage('Could not load profile data');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user data
  const fetchUserData = async (userId) => {
    try {
      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, email, phone, region')
        .eq('id', userId)
        .single();
      
      if (userError) throw userError;
      
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('user_profile')
        .select('birthdate, image, account_age, goals_created, expenses_created, income_created')
        .eq('user_id', userId)
        .single();
      
      // Load statistics using StatisticsUpdater
      const stats = await StatisticsUpdater.getUserStatistics(userId);
      if (stats) {
        setStatistics(stats);
      }

      // If no profile exists, create default
      if (profileError && profileError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('user_profile')
          .insert([{ user_id: userId }]);
          
        if (insertError) throw insertError;
      }
      
      // Format birthdate for display
      let formattedBirthdate = '';
      if (profileData?.birthdate) {
        formattedBirthdate = dateUtils.formatToDisplay(new Date(profileData.birthdate));
      }
      
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        region: userData.region || '',
        birthdate: formattedBirthdate,
      });
      
      if (profileData?.image) {
        setProfileImage(profileData.image);
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  };

  // Function to select profile image
  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setAlertMessage('Permission to access gallery is required!');
          setAlertType('error');
          setShowAlert(true);
          return;
        }
      }
      
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (Platform.OS === 'web') {
          setProfileImage(result.assets[0].uri);
        } else if (result.assets[0].base64) {
          setProfileImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        } else {
          setProfileImage(result.assets[0].uri);
        }
        
        setAlertMessage('Profile photo updated!');
        setAlertType('success');
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setAlertMessage('Failed to select image. Please try again.');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle date selection
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setFormData({
        ...formData,
        birthdate: dateUtils.formatToDisplay(selectedDate)
      });
    }
  };

  // Handle region picker modal open
  const openRegionPicker = () => {
    setSearchQuery('');
    setFilteredCountries(countries);
    setShowRegionPicker(true);
  };

  // Handle country selection
  const selectCountry = (country) => {
    setFormData({...formData, region: country.name});
    setShowRegionPicker(false);
    setSearchQuery('');
  };

  // Handle clear region selection
  const clearRegionSelection = () => {
    setFormData({...formData, region: ''});
    setShowRegionPicker(false);
    setSearchQuery('');
  };

  const validateForm = () => {
    if (!isFieldNotEmpty(formData.name)) {
      setAlertMessage('Name cannot be empty');
      setAlertType('error');
      setShowAlert(true);
      return false;
    }
    
    if (!isEmailValid(formData.email)) {
      setAlertMessage('Invalid email');
      setAlertType('error');
      setShowAlert(true);
      return false;
    }
    
    // Phone validation if provided
    if (formData.phone && !isPhoneValid(formData.phone)) {
      setAlertMessage('Phone must have 9 digits');
      setAlertType('error');
      setShowAlert(true);
      return false;
    }
    
    // Birthdate validation
    if (formData.birthdate && !dateUtils.isValidFormat(formData.birthdate)) {
      setAlertMessage('Date of birth must be in DD/MM/YYYY format');
      setAlertType('error');
      setShowAlert(true);
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    
    try {
      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone,
          region: formData.region,
        })
        .eq('id', userId);
      
      if (userError) throw userError;
      
      // Update user_profile table
      const { error: profileError } = await supabase
        .from('user_profile')
        .update({
          birthdate: dateUtils.formatForDB(formData.birthdate),
          image: profileImage
        })
        .eq('user_id', userId);
      
      if (profileError) throw profileError;
      
      setAlertMessage('Profile updated successfully!');
      setAlertType('success');
      setShowAlert(true);
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setAlertMessage(`Error: ${error.message || 'Failed to save changes'}`);
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const { clearAuthData } = require('../../../Supabase');
      await clearAuthData();
      
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error signing out:', error);
      setAlertMessage('Failed to sign out. Please try again.');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <Text style={styles.errorTitle}>Error loading profile</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={getCurrentUser}
        >
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Update statistics function
  const updateStatistics = async (type, increment = 1) => {
    try {
      if (!userId) return;

      const { data, error } = await supabase
        .from('user_profile')
        .update({
          [`${type}_created`]: statistics[`${type}_created`] + increment
        })
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      // Update local state
      setStatistics(prev => ({
        ...prev,
        [`${type}_created`]: prev[`${type}_created`] + increment
      }));

    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (formData.name) {
      return formData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return '?';
  };

  // Render country item for FlatList
  const renderCountryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.countryItem}
      onPress={() => selectCountry(item)}
    >
      <Text style={styles.countryText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Header title="Profile" />
      
      {showAlert && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section with Profile */}
        <Animated.View style={[styles.headerContainer, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{getUserInitials()}</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.editAvatarButton}
                onPress={pickImage}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.userInfoSection}>
            <Text style={styles.userName}>{formData.name || 'Your Name'}</Text>
            <Text style={styles.userEmail}>{formData.email || 'email@example.com'}</Text>
          </View>
        </Animated.View>

        {/* Profile Information Cards */}
        <View style={styles.contentContainer}>
          
          {/* Personal Information Section */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            {/* Name Field */}
            <View style={[
              styles.infoCard, 
              isEditing ? styles.infoCardEditable : styles.infoCardReadOnly
            ]}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoIcon}>
                  <Ionicons name="person" size={18} color="#FF9800" />
                </View>
                <Text style={styles.infoLabel}>Full Name</Text>
                {isEditing && (
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '600' }}>EDITABLE</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[
                  styles.infoInput, 
                  !isEditing && styles.infoInputDisabled,
                  isEditing && styles.infoInputEditable
                ]}
                placeholder="Enter your name"
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                placeholderTextColor="#A0AEC0"
                editable={isEditing}
              />
            </View>

            {/* Email Field - Read Only */}
            <View style={[styles.infoCard, styles.infoCardReadOnly]}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoIcon}>
                  <Ionicons name="mail" size={18} color="#94A3B8" />
                </View>
                <Text style={styles.infoLabel}>Email</Text>
                <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}>READ ONLY</Text>
                </View>
              </View>
              <TextInput
                style={[styles.infoInput, styles.infoInputDisabled]}
                value={formData.email}
                editable={false}
                placeholderTextColor="#A0AEC0"
              />
              <Text style={styles.infoHint}>Email cannot be changed</Text>
            </View>

            {/* Phone Field */}
            <View style={[
              styles.infoCard, 
              isEditing ? styles.infoCardEditable : styles.infoCardReadOnly
            ]}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoIcon}>
                  <Ionicons name="call" size={18} color={isEditing ? "#FF9800" : "#94A3B8"} />
                </View>
                <Text style={styles.infoLabel}>Phone</Text>
                {isEditing ? (
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '600' }}>EDITABLE</Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}>LOCKED</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[
                  styles.infoInput, 
                  !isEditing && styles.infoInputDisabled,
                  isEditing && styles.infoInputEditable
                ]}
                placeholder="Enter your phone (9 digits)"
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                placeholderTextColor="#A0AEC0"
                keyboardType="phone-pad"
                editable={isEditing}
              />
            </View>

            {/* Region Field */}
            <View style={[
              styles.infoCard, 
              isEditing ? styles.infoCardEditable : styles.infoCardReadOnly
            ]}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoIcon}>
                  <Ionicons name="location" size={18} color={isEditing ? "#FF9800" : "#94A3B8"} />
                </View>
                <Text style={styles.infoLabel}>Country/Region</Text>
                {isEditing ? (
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '600' }}>EDITABLE</Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}>LOCKED</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity 
                style={[
                  styles.infoSelector, 
                  !isEditing && styles.infoInputDisabled,
                  isEditing && styles.infoSelectorEditable
                ]}
                onPress={isEditing ? openRegionPicker : null}
                disabled={!isEditing}
              >
                <Text style={[styles.infoSelectorText, formData.region ? {} : {color: '#A0AEC0'}]}>
                  {formData.region || 'Select your country'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={isEditing ? "#FF9800" : "#94A3B8"} />
              </TouchableOpacity>
            </View>

            {/* Birthdate Field */}
            <View style={[
              styles.infoCard, 
              isEditing ? styles.infoCardEditable : styles.infoCardReadOnly
            ]}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoIcon}>
                  <Ionicons name="calendar" size={18} color={isEditing ? "#FF9800" : "#94A3B8"} />
                </View>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                {isEditing ? (
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '600' }}>EDITABLE</Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}>LOCKED</Text>
                  </View>
                )}
              </View>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  style={{
                    backgroundColor: '#F7F9FC',
                    borderRadius: 12,
                    paddingLeft: 16,
                    paddingRight: 16,
                    paddingTop: 16,
                    paddingBottom: 16,
                    fontSize: 16,
                    color: '#2D3748',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    width: '100%',
                    fontFamily: 'inherit',
                  }}
                  value={formData.birthdate ? dateUtils.formatForDB(formData.birthdate) : ''}
                  onChange={e => {
                    if (e.target.value) {
                      setFormData(prev => ({
                        ...prev,
                        birthdate: dateUtils.formatToDisplay(new Date(e.target.value))
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        birthdate: ''
                      }));
                    }
                  }}
                />
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.infoSelector, 
                    !isEditing && styles.infoInputDisabled,
                    isEditing && styles.infoSelectorEditable
                  ]}
                  onPress={isEditing ? () => setShowDatePicker(true) : null}
                  disabled={!isEditing}
                >
                  <Text style={[styles.infoSelectorText, formData.birthdate ? {} : {color: '#A0AEC0'}]}>
                    {formData.birthdate || 'Select your date of birth'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={isEditing ? "#FF9800" : "#94A3B8"} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Statistics Section */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Profile Statistics</Text>
            
            {/* Account Age */}
            <View style={[styles.infoCard, { borderColor: '#E0E7FF', backgroundColor: '#FAFBFF' }]}>
              <View style={styles.infoCardHeader}>
                <View style={[styles.infoIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                  <Ionicons name="time" size={18} color="#6366F1" />
                </View>
                <Text style={styles.infoLabel}>Account Age</Text>
              </View>
              <Text style={[styles.statisticValue, { color: '#6366F1' }]}>{statistics.account_age} days</Text>
            </View>

            {/* Goals Created */}
            <View style={[styles.infoCard, { borderColor: '#FEF3C7', backgroundColor: '#FFFBEB' }]}>
              <View style={styles.infoCardHeader}>
                <View style={[styles.infoIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Ionicons name="trophy" size={18} color="#F59E0B" />
                </View>
                <Text style={styles.infoLabel}>Goals Created</Text>
              </View>
              <Text style={[styles.statisticValue, { color: '#F59E0B' }]}>{statistics.goals_created}</Text>
            </View>

            {/* Income Created */}
            <View style={[styles.infoCard, { borderColor: '#D1FAE5', backgroundColor: '#F0FDF4' }]}>
              <View style={styles.infoCardHeader}>
                <View style={[styles.infoIcon, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                  <Ionicons name="trending-up" size={18} color="#22C55E" />
                </View>
                <Text style={styles.infoLabel}>Income Records</Text>
              </View>
              <Text style={[styles.statisticValue, { color: '#22C55E' }]}>{statistics.income_created}</Text>
            </View>

            {/* Expenses Created */}
            <View style={[styles.infoCard, { borderColor: '#FED7D7', backgroundColor: '#FEF5F5' }]}>
              <View style={styles.infoCardHeader}>
                <View style={[styles.infoIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="trending-down" size={18} color="#EF4444" />
                </View>
                <Text style={styles.infoLabel}>Expense Records</Text>
              </View>
              <Text style={[styles.statisticValue, { color: '#EF4444' }]}>{statistics.expenses_created}</Text>
            </View>
          </View>

          {/* Edit/Save Button */}
          <View style={styles.actionsSection}>
            <TouchableOpacity 
              style={isEditing ? styles.saveButton : styles.editButton}
              onPress={isEditing ? handleSave : () => setIsEditing(true)}
              disabled={isSaving}
            >
              <View style={styles.actionButtonContent}>
                <View style={styles.actionIcon}>
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons name={isEditing ? "save" : "create"} size={24} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionText}>
                    {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
                  </Text>
                  <Text style={styles.actionSubtext}>
                    {isEditing ? 'Update profile information' : 'Modify your profile details'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfoSection}>
            <Text style={styles.sectionTitle}>App Information</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoIcon}>
                  <Ionicons name="information-circle" size={20} color="#FF9800" />
                </View>
                <Text style={styles.infoLabel}>Application Version</Text>
              </View>
              <Text style={styles.versionText}>1.0.0 - MIT Project</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={() => setShowLogoutModal(true)}
          >
            <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker Modal for Mobile */}
      {showDatePicker && Platform.OS !== 'web' && (
        Platform.OS === 'android' ? (
          <DateTimePicker
            value={formData.birthdate ? new Date(dateUtils.formatForDB(formData.birthdate)) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        ) : (
          <Modal
            transparent={true}
            visible={showDatePicker}
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <DateTimePicker
                  value={formData.birthdate ? new Date(dateUtils.formatForDB(formData.birthdate)) : new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                />
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalButtonTextConfirm}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )
      )}

      {/* Region Picker Modal with Search */}
      <Modal
        visible={showRegionPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRegionPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowRegionPicker(false)}
              >
                <Ionicons name="close" size={24} color="#718096" />
              </TouchableOpacity>
            </View>
            
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#A0AEC0" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country..."
                placeholderTextColor="#A0AEC0"
                value={searchQuery}
                onChangeText={handleCountrySearch}
                autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => handleCountrySearch('')}
                  style={styles.clearSearchButton}
                >
                  <Ionicons name="close-circle" size={20} color="#A0AEC0" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Countries List */}
            <View style={styles.countriesContainer}>
              {/* Clear selection option */}
              <TouchableOpacity 
                style={styles.clearCountryOption}
                onPress={clearRegionSelection}
              >
                <Ionicons name="close-circle" size={20} color="#FF6B6B" style={styles.clearIcon} />
                <Text style={styles.clearCountryText}>Clear selection</Text>
              </TouchableOpacity>
              
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.code || item.name}
                renderItem={renderCountryItem}
                style={styles.countriesList}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.countrySeparator} />}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to sign out? You will need to log in again.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
              >
                <Text style={styles.modalButtonTextConfirm}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

export default ProfilePage;