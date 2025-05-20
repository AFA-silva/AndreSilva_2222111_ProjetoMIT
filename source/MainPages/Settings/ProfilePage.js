import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Animated,
  Switch,
  ActivityIndicator,
  Platform,
  Modal
} from 'react-native';
import styles from '../../Styles/Settings/ProfilePageStyle';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; // Enable image picker
import { supabase } from '../../../Supabase';
import { isEmailValid, isPhoneValid, isFieldNotEmpty } from '../../Utility/Validations';
import Alert from '../../Utility/Alerts';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { fetchCountries } from '../../Utility/FetchCountries';

const ProfilePage = ({ navigation }) => {
  // User data states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    region: '',
    email: '',
    birthdate: '',
    occupation: '',
    bio: '',
    language: 'Portuguese'
  });
  
  // UI states
  const [profileImage, setProfileImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);
  const [countries, setCountries] = useState([]);
  const [retryAttempt, setRetryAttempt] = useState(0);
  
  // Alert state
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerScaleAnim = useRef(new Animated.Value(0.95)).current;

  // Individual section animations
  const personalInfoAnim = useRef(new Animated.Value(0)).current;
  const preferencesAnim = useRef(new Animated.Value(0)).current;
  const privacyAnim = useRef(new Animated.Value(0)).current;

  // Improved date utility functions - combines formatting and validation
  const dateUtils = {
    // Format date object to DD/MM/YYYY
    formatToDisplay: (date) => {
      if (!date) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    },
    
    // Convert DD/MM/YYYY to YYYY-MM-DD for database
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
    
    // Validate birth date format (DD/MM/YYYY)
    isValidFormat: (dateString) => {
      if (!dateString || dateString.trim() === '') return true; // Empty is allowed
      
      // Check format DD/MM/YYYY
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const matches = dateString.match(regex);
      
      if (!matches) return false;
      
      // Extract date parts
      const day = parseInt(matches[1], 10);
      const month = parseInt(matches[2], 10);
      const year = parseInt(matches[3], 10);
      
      // Check valid ranges
      if (day < 1 || day > 31) return false;
      if (month < 1 || month > 12) return false;
      if (year < 1900 || year > new Date().getFullYear()) return false;
      
      return true;
    }
  };

  // Fetch user data when entering the page
  useEffect(() => {
    getCurrentUser();
    
    // Fetch countries data
    const loadCountries = async () => {
      const countriesData = await fetchCountries();
      setCountries(countriesData);
    };
    loadCountries();
    
    // Animation setup with platform check for all animations
    const useNativeDriver = Platform.OS !== 'web';
    
    // Staggered animation sequence for better UX
    Animated.sequence([
      // Header animation first
      Animated.parallel([
        Animated.timing(headerFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver,
        }),
        Animated.timing(headerScaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver,
        })
      ]),
      // Main container fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver,
        })
      ]),
      // Staggered section animations
      Animated.stagger(150, [
        Animated.timing(personalInfoAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver,
        }),
        Animated.timing(preferencesAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver,
        }),
        Animated.timing(privacyAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver,
        })
      ])
    ]).start();
  }, [retryAttempt]);

  // Auto-hide alert after 3 seconds
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Reconnection mechanism for Supabase
  useEffect(() => {
    let reconnectTimer;
    
    if (error && error.includes('connection')) {
      reconnectTimer = setTimeout(() => {
        setAlertMessage('Attempting to reconnect...');
        setAlertType('info');
        setShowAlert(true);
        setRetryAttempt(prev => prev + 1);
      }, 5000);
    }
    
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [error]);

  // Buscar o usuário atual
  const getCurrentUser = async () => {
    try {
      setIsLoading(true);
      
      // Buscar dados da sessão do usuário
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        if (userError.message.includes('Failed to fetch') || 
            userError.message.includes('ERR_CONNECTION_CLOSED') || 
            userError.message.includes('NetworkError')) {
          setError('connection: ' + userError.message);
          setAlertMessage('Connection lost. Trying to reconnect...');
          setAlertType('error');
          setShowAlert(true);
          return;
        }
        throw userError;
      }
      
      if (!user) {
        throw new Error('User not found');
      }
      
      setUserId(user.id);
      
      // Após obter o ID do usuário, buscar os dados completos
      await fetchUserData(user.id);
      
    } catch (error) {
      console.error('Error getting current user:', error);
      setError(error.message);
      
      // Show different alerts based on error type
      if (error.message && (
          error.message.includes('Failed to fetch') || 
          error.message.includes('ERR_CONNECTION_CLOSED') || 
          error.message.includes('NetworkError'))) {
        setAlertMessage('Connection lost. The app will try to reconnect automatically.');
        setAlertType('warning');
      } else {
        setAlertMessage('Could not load user data. Please try again later.');
        setAlertType('error');
      }
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserData = async (userId) => {
    try {
      // Buscar dados da tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, email, phone, region')
        .eq('id', userId)
        .single();
      
      if (userError) throw userError;
      
      // Buscar dados da tabela user_profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profile')
        .select('birthdate, occupation, bio, language, image, theme_preference')
        .eq('user_id', userId)
        .single();
      
      // Se não encontrar o perfil, pode ser que o trigger não tenha criado ainda
      // Nesse caso, criamos manualmente
      if (profileError && profileError.code === 'PGRST116') {
        // Perfil não existe, criar um novo
        const { error: insertError } = await supabase
          .from('user_profile')
          .insert([{ user_id: userId }]);
          
        if (insertError) throw insertError;
        
        // Definir dados padrão para o perfil
        const defaultProfileData = {
          birthdate: '',
          occupation: '',
          bio: '',
          language: 'Portuguese',
          image: null,
          theme_preference: 'light'
        };
        
        // Combinar dados do usuário com perfil padrão
        setFormData({
          ...defaultProfileData,
          ...userData,
          name: userData.name || '',
          phone: userData.phone || '',
          region: userData.region || '',
          email: userData.email || ''
        });
        
        if (defaultProfileData.theme_preference === 'dark') {
          setDarkModeEnabled(true);
        }
        
        return;
      }
      
      if (profileError) throw profileError;
      
      // Formatar data de nascimento usando o utilitário de datas
      let formattedBirthdate = '';
      if (profileData.birthdate) {
        formattedBirthdate = dateUtils.formatToDisplay(new Date(profileData.birthdate));
      }
      
      setFormData({
        name: userData.name || '',
        phone: userData.phone || '',
        region: userData.region || '',
        email: userData.email || '',
        birthdate: formattedBirthdate,
        occupation: profileData.occupation || '',
        bio: profileData.bio || '',
        language: profileData.language || 'Portuguese'
      });
      
      // Configurar o tema baseado na preferência salva
      if (profileData.theme_preference === 'dark') {
        setDarkModeEnabled(true);
      }
      
      // Configurar a imagem de perfil
      if (profileData.image) {
        setProfileImage(profileData.image);
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error.message);
      setAlertMessage('Não foi possível carregar os dados do perfil');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to select profile image
  const pickImage = async () => {
    try {
      // Request permission first
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setAlertMessage('Permission to access media library is required!');
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
        // For web, use the uri directly
        if (Platform.OS === 'web') {
          setProfileImage(result.assets[0].uri);
        } 
        // For mobile, use base64 data
        else if (result.assets[0].base64) {
          setProfileImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        } else {
          setProfileImage(result.assets[0].uri);
        }
        
        setAlertMessage('Profile image updated!');
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

  // Handle date selection from the date picker
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

  const validateForm = () => {
    // Name is required
    if (!isFieldNotEmpty(formData.name)) {
      setAlertMessage('Name field cannot be empty');
      setAlertType('error');
      setShowAlert(true);
      return false;
    }
    
    // Phone validation if provided
    if (formData.phone && !isPhoneValid(formData.phone)) {
      setAlertMessage('Phone number must be 9 digits');
      setAlertType('error');
      setShowAlert(true);
      return false;
    }
    
    // Birthdate validation
    if (formData.birthdate && !dateUtils.isValidFormat(formData.birthdate)) {
      setAlertMessage('Birth date must be in format DD/MM/YYYY');
      setAlertType('error');
      setShowAlert(true);
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Atualizar a tabela users
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone,
          region: formData.region
        })
        .eq('id', userId);
      
      if (userError) throw userError;
      
      // Atualizar a tabela user_profile
      const { error: profileError } = await supabase
        .from('user_profile')
        .update({
          birthdate: dateUtils.formatForDB(formData.birthdate),
          occupation: formData.occupation,
          bio: formData.bio,
          language: formData.language,
          theme_preference: darkModeEnabled ? 'dark' : 'light',
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
      setAlertMessage(`Error: ${error.message || 'Failed to save profile changes'}`);
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditableField = (icon, label, field, placeholder, keyboardType = 'default', isCustomField = false, onPress = null) => {
    // For custom fields like date picker and region selector
    if (isCustomField && onPress) {
      return (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{label}</Text>
          <TouchableOpacity 
            style={[
              styles.inputWrapper, 
              !isEditing && styles.inputWrapperDisabled,
              isEditing && styles.inputWrapperFocused
            ]}
            onPress={isEditing ? onPress : null}
            disabled={!isEditing}
          >
            <View style={styles.inputIcon}>
              {icon}
            </View>
            <Text 
              style={[
                styles.input, 
                !isEditing && styles.inputDisabled,
                !formData[field] && { color: '#A0AEC0' }
              ]}
            >
              {formData[field] || placeholder}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Standard input fields
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={[
          styles.inputWrapper, 
          !isEditing && styles.inputWrapperDisabled,
          isEditing && styles.inputWrapperFocused
        ]}>
          <View style={styles.inputIcon}>
            {icon}
          </View>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            placeholder={placeholder}
            value={formData[field] || ''}
            onChangeText={(text) => handleInputChange(field, text)}
            placeholderTextColor="#A0AEC0"
            keyboardType={keyboardType}
            editable={isEditing}
          />
        </View>
      </View>
    );
  };

  // Shared modal header component to reduce redundancy
  const renderModalHeader = (title, onClose) => (
    <View style={styles.datePickerHeader}>
      <Text style={styles.datePickerTitle}>{title}</Text>
      <TouchableOpacity onPress={onClose}>
        <Ionicons name="close" size={24} color="#2D3748" />
      </TouchableOpacity>
    </View>
  );

  // Render date picker modal (for iOS)
  const renderDatePickerModal = () => {
    if (!showDatePicker || Platform.OS === 'android') return null;
    
    return (
      <Modal
        transparent={true}
        visible={showDatePicker}
        animationType="slide"
      >
        <View style={styles.datePickerModalOverlay}>
          <View style={styles.datePickerModalContainer}>
            {renderModalHeader('Select Date', () => setShowDatePicker(false))}
            <DateTimePicker
              value={formData.birthdate ? new Date(dateUtils.formatForDB(formData.birthdate)) : new Date()}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              style={styles.datePicker}
            />
            <TouchableOpacity 
              style={styles.datePickerConfirmButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.datePickerConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Render region picker modal
  const renderRegionPickerModal = () => {
    if (!showRegionPicker) return null;
    
    return (
      <Modal
        transparent={true}
        visible={showRegionPicker}
        animationType="slide"
      >
        <View style={styles.datePickerModalOverlay}>
          <View style={styles.datePickerModalContainer}>
            {renderModalHeader('Select Region', () => setShowRegionPicker(false))}
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.region}
                onValueChange={(itemValue) => {
                  setFormData({...formData, region: itemValue});
                }}
                style={{width: '100%'}}
              >
                <Picker.Item label="Select your region" value="" />
                {countries.map((country) => (
                  <Picker.Item key={country.name} label={country.name} value={country.name} />
                ))}
              </Picker>
            </View>
            <TouchableOpacity 
              style={styles.datePickerConfirmButton}
              onPress={() => setShowRegionPicker(false)}
            >
              <Text style={styles.datePickerConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Navigate to Login screen
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
        <ActivityIndicator size="large" color="#F9A825" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#E74C3C" />
        <Text style={styles.errorTitle}>Erro ao carregar o perfil</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={getCurrentUser}
        >
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      {showAlert && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}
      
      <Animated.View 
        style={[
          styles.container, 
          { opacity: fadeAnim, transform: [{ translateY }] }
        ]}
      >
        {/* Header with background gradient */}
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: headerFadeAnim,
              transform: [
                { scale: headerScaleAnim }
              ]
            }
          ]}
        >
          <View style={styles.headerContent}>
            {/* Profile Image */}
            <TouchableOpacity 
              style={[
                styles.profileImageWrapper,
                isEditing && styles.profileImageWrapperEditing
              ]} 
              onPress={isEditing ? pickImage : null} 
              activeOpacity={isEditing ? 0.7 : 1}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileInitials}>
                    {formData.name ? formData.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              <View style={[
                styles.cameraIconWrapper,
                !isEditing && styles.cameraIconDisabled
              ]}>
                <Ionicons name="camera" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
            
            <Text style={styles.userName}>{formData.name || 'Nome do Usuário'}</Text>
            <Text style={styles.userEmail}>{formData.email || 'email@exemplo.com'}</Text>
            
            {/* Edit/Save Button */}
            <TouchableOpacity 
              style={[
                styles.editButton,
                isEditing && styles.saveButton
              ]} 
              onPress={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name={isEditing ? "save-outline" : "pencil-outline"} size={20} color="#FFFFFF" />
                  <Text style={styles.editButtonText}>
                    {isEditing ? "Save Profile" : "Edit Profile"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
        
        {/* Personal Information Section - positioned to overlap with header */}
        <Animated.View style={[
          styles.sectionContainer,
          styles.personalInfoContainer,
          { 
            opacity: personalInfoAnim,
            transform: [{ 
              translateY: personalInfoAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              }) 
            }]
          }
        ]}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {renderEditableField(
            <Ionicons name="person-outline" size={20} color="#F9A825" />,
            "Full Name",
            "name",
            "Enter your full name"
          )}
          
          {renderEditableField(
            <MaterialIcons name="phone" size={20} color="#F9A825" />,
            "Phone Number",
            "phone",
            "Enter your phone number (9 digits)",
            "phone-pad"
          )}
          
          {/* Region Selection */}
          {renderEditableField(
            <Ionicons name="location-outline" size={20} color="#F9A825" />,
            "Region",
            "region",
            "Select your region",
            "default",
            true,
            () => setShowRegionPicker(true)
          )}
          
          {/* Birthdate with date picker */}
          {Platform.OS !== 'web' && renderEditableField(
            <Ionicons name="calendar-outline" size={20} color="#F9A825" />,
            "Birth Date",
            "birthdate",
            "Select birth date",
            "default",
            true,
            () => {
              setShowDatePicker(true);
            }
          )}
          
          {/* For web platform, render the enhanced HTML date input */}
          {Platform.OS === 'web' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Birth Date</Text>
              <View style={[
                styles.inputWrapper, 
                !isEditing && styles.inputWrapperDisabled,
                isEditing && styles.inputWrapperFocused,
              ]}>
                <input
                  type="date"
                  style={{
                    padding: 12,
                    fontSize: 16,
                    color: '#2D3436',
                    backgroundColor: 'transparent',
                    width: '100%',
                    height: 50,
                    border: 'none',
                    outline: 'none',
                    cursor: isEditing ? 'pointer' : 'default',
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
                  disabled={!isEditing}
                />
              </View>
              {isEditing && (
                <Text style={{fontSize: 12, color: '#718096', marginTop: 4}}>
                  Click to select a date
                </Text>
              )}
            </View>
          )}
          
          {/* Show date picker for Android */}
          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={formData.birthdate ? new Date(dateUtils.formatForDB(formData.birthdate)) : new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
          
          {/* Occupation field - simple text input */}
          {renderEditableField(
            <Ionicons name="briefcase-outline" size={20} color="#F9A825" />,
            "Occupation",
            "occupation",
            "What do you do?"
          )}
          
          {/* Bio field with multiline */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Bio</Text>
            <View style={[
              styles.textAreaWrapper, 
              !isEditing && styles.inputWrapperDisabled,
              isEditing && styles.inputWrapperFocused
            ]}>
              <TextInput
                style={[styles.textArea, !isEditing && styles.inputDisabled]}
                placeholder="Tell us about yourself..."
                value={formData.bio || ''}
                onChangeText={(text) => handleInputChange("bio", text)}
                placeholderTextColor="#A0AEC0"
                multiline
                numberOfLines={4}
                editable={isEditing}
              />
            </View>
          </View>
        </Animated.View>
        
        {/* Preferences Section - Reduzido */}
        <Animated.View style={[
          styles.sectionContainer,
          {
            opacity: preferencesAnim,
            transform: [{ 
              translateY: preferencesAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              }) 
            }]
          }
        ]}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceIconContainer}>
              <Ionicons name="language-outline" size={22} color="#F9A825" />
            </View>
            <View style={styles.preferenceContent}>
              <Text style={styles.preferenceLabel}>Language</Text>
              <Text style={styles.preferenceValue}>{formData.language || 'Portuguese'}</Text>
            </View>
            {isEditing && (
              <View style={styles.preferenceEditButton}>
                <Text style={{color: '#CBD5E0', fontSize: 12}}>Not editable</Text>
              </View>
            )}
          </View>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceIconContainer}>
              <Ionicons name="moon-outline" size={22} color="#F9A825" />
            </View>
            <View style={styles.preferenceContent}>
              <Text style={styles.preferenceLabel}>Dark Mode</Text>
              <Text style={styles.preferenceDescription}>Change app appearance</Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: '#E2E8F0', true: '#F9A82580' }}
              thumbColor={darkModeEnabled ? '#F9A825' : '#CBD5E0'}
              disabled={!isEditing}
            />
          </View>
        </Animated.View>
        
        {/* Data Privacy Section - Em vez de Account Stats */}
        <Animated.View style={[
          styles.sectionContainer,
          {
            opacity: privacyAnim,
            transform: [{ 
              translateY: privacyAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              }) 
            }]
          }
        ]}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {/* Only keep the delete account option but mark it as "coming soon" */}
          <TouchableOpacity 
            style={styles.privacyOption}
            disabled={true}
          >
            <View style={styles.privacyOptionIcon}>
              <Ionicons name="trash-outline" size={22} color="#E74C3C" />
            </View>
            <View style={styles.privacyOptionContent}>
              <Text style={[styles.privacyOptionTitle, {color: '#E74C3C'}]}>Delete Account</Text>
              <Text style={styles.privacyOptionDescription}>Permanently delete your account and data</Text>
            </View>
            <View style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: 'rgba(203, 213, 224, 0.2)',
              borderRadius: 6,
            }}>
              <Text style={{ fontSize: 10, color: '#718096' }}>SOON</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Render logout button instead of support button */}
        <Animated.View style={{ opacity: privacyAnim }}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
        
        <View style={styles.footerSpace} />
      </Animated.View>
      
      {/* Date Picker Modal for iOS */}
      {renderDatePickerModal()}
      
      {/* Region Picker Modal */}
      {renderRegionPickerModal()}
    </ScrollView>
  );
};

export default ProfilePage;