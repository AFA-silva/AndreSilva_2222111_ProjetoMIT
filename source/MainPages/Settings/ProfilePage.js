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

const ProfilePage = ({ navigation }) => {
  // User data states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    region: '',
    birthdate: '',
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
      setAlertMessage('Não foi possível carregar os dados do perfil');
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
        .select('birthdate, image')
        .eq('user_id', userId)
        .single();
      
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
          setAlertMessage('Permissão para acessar galeria é necessária!');
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
        
        setAlertMessage('Foto de perfil atualizada!');
        setAlertType('success');
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setAlertMessage('Falha ao selecionar imagem. Tente novamente.');
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
      setAlertMessage('Nome não pode estar vazio');
      setAlertType('error');
      setShowAlert(true);
      return false;
    }
    
    if (!isEmailValid(formData.email)) {
      setAlertMessage('Email inválido');
      setAlertType('error');
      setShowAlert(true);
      return false;
    }
    
    // Phone validation if provided
    if (formData.phone && !isPhoneValid(formData.phone)) {
      setAlertMessage('Telefone deve ter 9 dígitos');
      setAlertType('error');
      setShowAlert(true);
      return false;
    }
    
    // Birthdate validation
    if (formData.birthdate && !dateUtils.isValidFormat(formData.birthdate)) {
      setAlertMessage('Data de nascimento deve estar no formato DD/MM/AAAA');
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
      
      setAlertMessage('Perfil atualizado com sucesso!');
      setAlertType('success');
      setShowAlert(true);
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setAlertMessage(`Erro: ${error.message || 'Falha ao salvar alterações'}`);
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error signing out:', error);
      setAlertMessage('Falha ao sair. Tente novamente.');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
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
      <Header title="Perfil" />
      
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
            <Text style={styles.userName}>{formData.name || 'Seu Nome'}</Text>
            <Text style={styles.userEmail}>{formData.email || 'email@exemplo.com'}</Text>
          </View>
        </Animated.View>

        {/* Profile Information Cards */}
        <View style={styles.contentContainer}>
          
          {/* Personal Information Section */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Informações Pessoais</Text>
            
            {/* Name Field */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoIcon}>
                  <Ionicons name="person" size={20} color="#FF9800" />
                </View>
                <Text style={styles.infoLabel}>Nome Completo</Text>
              </View>
              <TextInput
                style={styles.infoInput}
                placeholder="Digite seu nome"
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                placeholderTextColor="#A0AEC0"
              />
            </View>

            {/* Email Field - Read Only */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoIcon}>
                  <Ionicons name="mail" size={20} color="#FF9800" />
                </View>
                <Text style={styles.infoLabel}>Email</Text>
              </View>
              <TextInput
                style={[styles.infoInput, styles.infoInputDisabled]}
                value={formData.email}
                editable={false}
                placeholderTextColor="#A0AEC0"
              />
              <Text style={styles.infoHint}>Email não pode ser alterado</Text>
            </View>

            {/* Phone Field */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoIcon}>
                  <Ionicons name="call" size={20} color="#FF9800" />
                </View>
                <Text style={styles.infoLabel}>Telefone</Text>
              </View>
              <TextInput
                style={styles.infoInput}
                placeholder="Digite seu telefone (9 dígitos)"
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                placeholderTextColor="#A0AEC0"
                keyboardType="phone-pad"
              />
            </View>

            {/* Region Field */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoIcon}>
                  <Ionicons name="location" size={20} color="#FF9800" />
                </View>
                <Text style={styles.infoLabel}>País/Região</Text>
              </View>
              <TouchableOpacity 
                style={styles.infoSelector}
                onPress={openRegionPicker}
              >
                <Text style={[styles.infoSelectorText, formData.region ? {} : {color: '#A0AEC0'}]}>
                  {formData.region || 'Selecione seu país'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#A0AEC0" />
              </TouchableOpacity>
            </View>

            {/* Birthdate Field */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoIcon}>
                  <Ionicons name="calendar" size={20} color="#FF9800" />
                </View>
                <Text style={styles.infoLabel}>Data de Nascimento</Text>
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
                  style={styles.infoSelector}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.infoSelectorText, formData.birthdate ? {} : {color: '#A0AEC0'}]}>
                    {formData.birthdate || 'Selecione sua data de nascimento'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#A0AEC0" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Ações</Text>
            
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleSave}
                disabled={isSaving}
              >
                <View style={styles.actionButtonContent}>
                  <View style={styles.actionIcon}>
                    {isSaving ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Ionicons name="save" size={24} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionText}>
                      {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </Text>
                    <Text style={styles.actionSubtext}>
                      Atualizar informações do perfil
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.secondaryActionButton}
                onPress={() => navigation.navigate('CurrencyMarketPage')}
              >
                <View style={styles.actionButtonContent}>
                  <View style={styles.secondaryActionIcon}>
                    <Ionicons name="globe" size={24} color="#FF9800" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.secondaryActionText}>Gerenciar Moedas</Text>
                    <Text style={styles.actionSubtext}>
                      Configurar moedas preferidas
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* App Info */}
          <View style={styles.appInfoSection}>
            <Text style={styles.sectionTitle}>Informações do App</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoIcon}>
                  <Ionicons name="information-circle" size={20} color="#FF9800" />
                </View>
                <Text style={styles.infoLabel}>Versão do Aplicativo</Text>
              </View>
              <Text style={styles.versionText}>1.0.0 - Projeto MIT</Text>
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
            <Text style={styles.logoutText}>Sair da Conta</Text>
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
                <Text style={styles.modalTitle}>Selecionar Data</Text>
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
                  <Text style={styles.modalButtonTextConfirm}>Confirmar</Text>
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
              <Text style={styles.modalTitle}>Selecionar País</Text>
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
                placeholder="Buscar país..."
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
                <Text style={styles.clearCountryText}>Limpar seleção</Text>
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
            <Text style={styles.modalTitle}>Sair da Conta</Text>
            <Text style={styles.modalDescription}>
              Tem certeza que deseja sair? Você precisará fazer login novamente.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
              >
                <Text style={styles.modalButtonTextConfirm}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

export default ProfilePage;