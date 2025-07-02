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

import SkeletonLoading, { CardSkeleton, TextRowSkeleton, AvatarSkeleton } from '../../Utility/SkeletonLoading';

// Custom Header component for ProfilePage without rounded corners
const ProfileHeader = ({ title }) => {
  return (
    <View style={styles.customHeaderWrapper}>
      <View style={styles.customHeaderContainer}>
        {/* Decorative floating circles */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />
        
        <View style={styles.customTitleContainer}>
          <Text style={styles.customHeaderTitle}>{title}</Text>
          <View style={styles.customTitleUnderline} />
        </View>
      </View>
    </View>
  );
};

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
  const [modalVisible, setModalVisible] = useState(false);
  
  // Alert state
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  
  // Animation values - Mobile focused animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;
  const avatarBounceAnim = useRef(new Animated.Value(0)).current;
  const contentSlideAnim = useRef(new Animated.Value(30)).current;

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
      if (!dateString || dateString.trim() === '') return null;
      
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const matches = dateString.match(regex);
      
      if (!matches) return null;
      
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

  // Profile skeleton component
  const ProfileSkeleton = () => (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Skeleton */}
        <View style={styles.headerContainer}>
          <View style={styles.avatarSection}>
            <AvatarSkeleton size={90} />
          </View>
          <View style={styles.userInfoSection}>
            <TextRowSkeleton lines={1} style={{ width: '60%', marginBottom: 8, height: 28 }} />
            <TextRowSkeleton lines={1} style={{ width: '80%', height: 16 }} />
          </View>
        </View>

        {/* Content Skeleton */}
        <View style={styles.contentContainer}>
          {/* Personal Information Section */}
          <View style={styles.infoSection}>
            <TextRowSkeleton lines={1} style={{ width: '50%', marginBottom: 20, height: 22 }} />
            
            {/* Info Cards - Match actual card heights */}
            <CardSkeleton height={100} style={{ marginBottom: 12, borderRadius: 16 }} />
            <CardSkeleton height={100} style={{ marginBottom: 12, borderRadius: 16 }} />
            <CardSkeleton height={100} style={{ marginBottom: 12, borderRadius: 16 }} />
            <CardSkeleton height={100} style={{ marginBottom: 12, borderRadius: 16 }} />
            <CardSkeleton height={100} style={{ marginBottom: 12, borderRadius: 16 }} />
          </View>

          {/* Statistics Section */}
          <View style={styles.infoSection}>
            <TextRowSkeleton lines={1} style={{ width: '40%', marginBottom: 20, height: 22 }} />
            
            {/* Statistics Cards Row */}
            <View style={styles.statisticsContainer}>
              <CardSkeleton height={120} style={{ flex: 1, marginHorizontal: 4, borderRadius: 16 }} />
              <CardSkeleton height={120} style={{ flex: 1, marginHorizontal: 4, borderRadius: 16 }} />
              <CardSkeleton height={120} style={{ flex: 1, marginHorizontal: 4, borderRadius: 16 }} />
            </View>
            
            {/* Account Age Card */}
            <CardSkeleton height={120} style={{ marginBottom: 12, borderRadius: 16, marginTop: 12 }} />
          </View>

          {/* Actions Section */}
          <View style={styles.actionsSection}>
            <CardSkeleton height={80} style={{ marginBottom: 12, borderRadius: 16 }} />
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <CardSkeleton height={70} style={{ borderRadius: 16 }} />
        </View>
      </ScrollView>
    </View>
  );

  // Country search function
  const handleSearch = (query) => {
    setSearchQuery(query);
    setFilteredCountries(
      countries.filter((country) =>
        country.name.toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  // Load user data when component mounts
  useEffect(() => {
    // Load user data and countries
    getCurrentUser();
    
    // Load countries data
    const loadCountriesData = async () => {
      try {
        const countriesData = await fetchCountries();
        setCountries(countriesData);
        setFilteredCountries(countriesData);
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };
    loadCountriesData();
    
    // Beautiful mobile entrance animations
    Animated.sequence([
      // Quick fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Parallel spring animations
      Animated.parallel([
        // Header slides down with bounce
        Animated.spring(headerSlideAnim, {
          toValue: 0,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
        // Container scales up
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
        // Avatar bounces in
        Animated.spring(avatarBounceAnim, {
          toValue: 1,
          tension: 120,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
      // Content slides up
      Animated.spring(contentSlideAnim, {
        toValue: 0,
        tension: 90,
        friction: 8,
        useNativeDriver: true,
      }),
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

  // Refresh statistics from database
  const refreshStatistics = async () => {
    try {
      // Fetch statistics directly from user_profile table
      const { data, error } = await supabase
        .from('user_profile')
        .select('account_age, goals_created, expenses_created, income_created')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows

      if (error) {
        console.error('Error fetching user statistics:', error);
        return;
      }

      // If no profile exists, create one with default values
      if (!data) {
        const { error: insertError } = await supabase
          .from('user_profile')
          .insert([{ 
            user_id: userId,
            account_age: 0,
            goals_created: 0,
            expenses_created: 0,
            income_created: 0
          }]);
          
        if (insertError) {
          console.error('Error creating user profile:', insertError);
        }
        
        // Set default statistics
        const defaultStats = {
          account_age: 0,
          goals_created: 0,
          expenses_created: 0,
          income_created: 0,
        };
        setStatistics(defaultStats);
        return;
      }

      const stats = {
        account_age: data.account_age || 0,
        goals_created: data.goals_created || 0,
        expenses_created: data.expenses_created || 0,
        income_created: data.income_created || 0,
      };
      
      setStatistics(stats);
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
      // Get user data and profile data in parallel for faster loading
      const [
        { data: userData, error: userError },
        { data: profileData, error: profileError }
      ] = await Promise.all([
        supabase
          .from('users')
          .select('name, email, phone, region')
          .eq('id', userId)
          .single(),
        supabase
          .from('user_profile')
          .select('birthdate, image, account_age, goals_created, expenses_created, income_created')
          .eq('user_id', userId)
          .maybeSingle() // Use maybeSingle() instead of single() to handle 0 rows
      ]);
      
      if (userError) throw userError;
      
      // Set statistics from profile data
      if (profileData && !profileError) {
        const stats = {
          account_age: profileData.account_age || 0,
          goals_created: profileData.goals_created || 0,
          expenses_created: profileData.expenses_created || 0,
          income_created: profileData.income_created || 0,
        };
        setStatistics(stats);
      } else {
        // If no profile exists or there was an error, create default profile
        const { error: insertError } = await supabase
          .from('user_profile')
          .insert([{ 
            user_id: userId,
            account_age: 0,
            goals_created: 0,
            expenses_created: 0,
            income_created: 0
          }]);
          
        if (insertError) {
          console.error('Error creating user profile:', insertError);
        }
        
        // Set default statistics
        const defaultStats = {
          account_age: 0,
          goals_created: 0,
          expenses_created: 0,
          income_created: 0,
        };
        setStatistics(defaultStats);
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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setAlertMessage('Permission to access gallery is required!');
        setAlertType('error');
        setShowAlert(true);
        return;
      }
      
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (result.assets[0].base64) {
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
    setModalVisible(true);
  };

  // Handle country selection
  const selectCountry = (country) => {
    setFormData({...formData, region: country.code});
    setModalVisible(false);
    setSearchQuery('');
  };

  // Handle clear region selection
  const clearRegionSelection = () => {
    setFormData({...formData, region: ''});
    setModalVisible(false);
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
    
    // Birthdate validation - only validate if field is not empty
    if (formData.birthdate && formData.birthdate.trim() !== '' && !dateUtils.isValidFormat(formData.birthdate)) {
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
      console.log('Starting profile save process...');
      console.log('Form data:', { 
        name: formData.name,
        phone: formData.phone,
        region: formData.region,
        birthdate: formData.birthdate
      });
      
      // Update users table
      console.log('Updating users table...');
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone,
          region: formData.region,
        })
        .eq('id', userId);
      
      if (userError) throw userError;
      console.log('Users table updated successfully');
      
      // Prepare birthdate for database
      const formattedBirthdate = dateUtils.formatForDB(formData.birthdate);
      console.log('Formatted birthdate for DB:', formattedBirthdate);
      
      // Update user_profile table
      console.log('Updating user_profile table...');
      const { error: profileError } = await supabase
        .from('user_profile')
        .update({
          birthdate: formattedBirthdate,
          image: profileImage
        })
        .eq('user_id', userId);
      
      if (profileError) throw profileError;
      console.log('User_profile table updated successfully');
      
      setAlertMessage('Profile updated successfully!');
      setAlertType('success');
      setShowAlert(true);
      setIsEditing(false);
      
      console.log('Profile save completed successfully!');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      setAlertMessage(`Error: ${error.message || 'Failed to save changes'}`);
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setIsSaving(false);
      console.log('Profile save process finished');
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
      <View style={styles.container}>
        <ProfileHeader title="Profile" />
        <ProfileSkeleton />
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

  // Get user initials for avatar
  const getUserInitials = () => {
    if (formData.name) {
      return formData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return '?';
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ProfileHeader title="Profile" />
      
      {showAlert && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}
      
      {isLoading ? (
        <ProfileSkeleton />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header Section with Profile - Animated */}
          <Animated.View style={[
            styles.headerContainer, 
            { 
              transform: [
                { scale: scaleAnim },
                { translateY: headerSlideAnim }
              ]
            }
          ]}>
            <Animated.View style={[
              styles.avatarSection,
              {
                transform: [
                  { scale: avatarBounceAnim },
                  { 
                    rotate: avatarBounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['45deg', '0deg']
                    })
                  }
                ]
              }
            ]}>
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
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>
            
            <Animated.View style={[
              styles.userInfoSection,
              {
                opacity: avatarBounceAnim,
                transform: [{
                  translateY: avatarBounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }
            ]}>
              <Text style={styles.userName}>{formData.name || 'Your Name'}</Text>
              <Text style={styles.userEmail}>{formData.email || 'email@example.com'}</Text>
            </Animated.View>
          </Animated.View>

          {/* Profile Information Cards - Animated */}
          <Animated.View style={[
            styles.contentContainer,
            {
              opacity: contentSlideAnim.interpolate({
                inputRange: [0, 30],
                outputRange: [1, 0]
              }),
              transform: [{
                translateY: contentSlideAnim
              }]
            }
          ]}>
            
            {/* Personal Information Section */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>👤 Personal Information</Text>
              
              {/* Name Field */}
              <View style={[
                styles.infoCard, 
                isEditing ? styles.infoCardEditable : styles.infoCardReadOnly
              ]}>
                <View style={styles.infoCardHeader}>
                  <View style={[styles.infoIcon, isEditing && styles.infoIconEditing]}>
                    <Ionicons name="person" size={20} color="#FFFFFF" />
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
                  <View style={[styles.infoIcon, styles.infoIconReadOnly]}>
                    <Ionicons name="mail" size={20} color="#FFFFFF" />
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
                  <View style={[styles.infoIcon, isEditing && styles.infoIconEditing]}>
                    <Ionicons name="call" size={20} color="#FFFFFF" />
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
                  <View style={[styles.infoIcon, isEditing && styles.infoIconEditing]}>
                    <Ionicons name="location" size={20} color="#FFFFFF" />
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
                  <View style={styles.countryPickerRow}>
                    {formData.region ? (
                      <Image source={{ uri: `https://flagcdn.com/w40/${formData.region.toLowerCase()}.png` }} style={styles.flagIcon} />
                    ) : (
                      <Image source={require('../../../assets/flag-placeholder.png')} style={styles.flagIcon} />
                    )}
                    <Text style={[styles.infoSelectorText, formData.region ? {} : {color: '#A0AEC0'}]}>
                      {formData.region ? countries.find((c) => c.code === formData.region)?.name || 'Select your country' : 'Select your country'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={isEditing ? "#FF9800" : "#94A3B8"} />
                </TouchableOpacity>
              </View>

              {/* Birthdate Field */}
              <View style={[
                styles.infoCard, 
                isEditing ? styles.infoCardEditable : styles.infoCardReadOnly
              ]}>
                <View style={styles.infoCardHeader}>
                  <View style={[styles.infoIcon, isEditing && styles.infoIconEditing]}>
                    <Ionicons name="calendar" size={20} color="#FFFFFF" />
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
              </View>
            </View>

            {/* Statistics Section - Redesigned as colorful cards */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>📊 Your Activity</Text>
              
              {/* Statistics Cards Row */}
              <View style={styles.statisticsContainer}>
                {/* Goals Created */}
                <View style={styles.statisticCard}>
                  <View style={styles.statisticIconContainer}>
                    <Ionicons name="trophy" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.statisticLabel}>Goals Created</Text>
                  <Text style={styles.statisticValue}>{statistics.goals_created}</Text>
                  <Text style={styles.statisticSubLabel}>Total</Text>
                </View>

                {/* Income Records */}
                <View style={styles.statisticCard}>
                  <View style={styles.statisticIconContainer}>
                    <Ionicons name="trending-up" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.statisticLabel}>Income Records</Text>
                  <Text style={styles.statisticValue}>{statistics.income_created}</Text>
                  <Text style={styles.statisticSubLabel}>Total</Text>
                </View>

                {/* Expense Records */}
                <View style={styles.statisticCard}>
                  <View style={styles.statisticIconContainer}>
                    <Ionicons name="trending-down" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.statisticLabel}>Expense Records</Text>
                  <Text style={styles.statisticValue}>{statistics.expenses_created}</Text>
                  <Text style={styles.statisticSubLabel}>Total</Text>
                </View>
              </View>

              {/* Account Age Card */}
              <View style={[styles.infoCard, { backgroundColor: '#FFFBF5', borderColor: '#FFE082' }]}>
                <View style={styles.infoCardHeader}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="time" size={20} color="#FFFFFF" />
                  </View>
                  <Text style={styles.infoLabel}>Account Age</Text>
                </View>
                <Text style={[styles.statisticValue, { fontSize: 28, marginTop: 8 }]}>{statistics.account_age} days</Text>
                <Text style={[styles.infoHint, { color: '#F57C00', fontStyle: 'normal', marginTop: 4 }]}>
                  🎉 Keep tracking your finances!
                </Text>
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
          </Animated.View>

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
      )}

      {/* Date Picker Modal for Mobile */}
      {showDatePicker && (
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

      {/* Region Picker Modal - Exact same as RegisterPage */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.searchContainer}>
              <TextInput
                style={[styles.searchInput, { color: '#000' }]}
                placeholder="Search for a country..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>
            
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    selectCountry(item);
                  }}
                >
                  <Text style={styles.modalText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
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