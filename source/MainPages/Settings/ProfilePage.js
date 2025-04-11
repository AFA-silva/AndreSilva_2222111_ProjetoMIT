import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { Menu, Divider, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import styles from './ProfilePageStyle';
import { supabase } from '../../../Supabase';
import { isPhoneValid, isFieldNotEmpty, isNameValid } from '../../Utility/Validations';
import Alert from '../../Utility/Alerts';
import { fetchCountries } from '../../Utility/FetchCountries';

const ProfilePage = () => {
  const [profileImage, setProfileImage] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ visible: false, message: '', type: 'info' });
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          showAlert('Unable to fetch user data.', 'error');
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('users')
          .select('image, name, phone, region')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          showAlert('Unable to fetch profile data.', 'error');
        } else {
          setProfileImage(data.image);
          setName(data.name);
          setPhone(data.phone);
          setRegion(data.region);
        }
      } catch (err) {
        showAlert('An unexpected error occurred.', 'error');
      } finally {
        setLoading(false);
      }
    };

    const loadCountries = async () => {
      const countryList = await fetchCountries();
      setCountries(countryList);
    };

    fetchUserData();
    loadCountries();
  }, []);

  const showAlert = (message, type = 'info') => {
    setAlert({ visible: true, message, type });
    setTimeout(() => {
      setAlert({ visible: false, message: '', type: 'info' });
    }, 3000); // Auto-hide alert after 3 seconds
  };

  const handleSave = async () => {
    if (!isFieldNotEmpty(name)) {
      showAlert('The name cannot be empty.', 'error');
      return;
    }

    if (!isNameValid(name)) {
      showAlert('The name exceeds the maximum length of 20 characters.', 'error');
      return;
    }

    if (!isPhoneValid(phone)) {
      showAlert('The phone number must contain exactly 9 digits.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updates = {
        name,
        phone,
        region,
        image: profileImage,
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        showAlert('Unable to update profile.', 'error');
      } else {
        showAlert('Your profile has been updated!', 'success');
      }
    } catch (err) {
      showAlert('An unexpected error occurred.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files[0];
        if (file) {
          const { data, error } = await supabase
            .storage
            .from('profile-images')
            .upload(`user_${Date.now()}_${file.name}`, file);

          if (error) {
            showAlert('Unable to upload image.', 'error');
          } else {
            const { publicUrl } = supabase
              .storage
              .from('profile-images')
              .getPublicUrl(data.path);
            setProfileImage(publicUrl);
            showAlert('Profile image updated successfully!', 'success');
          }
        }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const file = result.assets[0];
        const { data, error } = await supabase
          .storage
          .from('profile-images')
          .upload(`user_${Date.now()}_${file.uri.split('/').pop()}`, {
            uri: file.uri,
            type: 'image/jpeg',
            name: file.uri.split('/').pop(),
          });

        if (error) {
          showAlert('Unable to upload image.', 'error');
        } else {
          const { publicUrl } = supabase
            .storage
            .from('profile-images')
            .getPublicUrl(data.path);
          setProfileImage(publicUrl);
          showAlert('Profile image updated successfully!', 'success');
        }
      }
    }
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleRegionSelect = (regionCode) => {
    setRegion(regionCode);
    closeMenu();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>

      {alert.visible && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert({ visible: false, message: '', type: 'info' })}
        />
      )}

      {/* Profile Image */}
      <TouchableOpacity onPress={handleImagePick} style={styles.profileImageContainer}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="person-circle-outline" size={80} color="#999" />
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.imageInstruction}>Tap the image to change</Text>

      {/* Other Fields */}
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.inputText}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputGroup}>
        <TextInput
          style={styles.inputText}
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      {/* Custom Dropdown for Region */}
      <View style={styles.inputGroup}>
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <TouchableOpacity onPress={openMenu}>
              <Text style={styles.inputText}>
                {region ? countries.find((c) => c.code === region)?.name || 'Select your region' : 'Select your region'}
              </Text>
            </TouchableOpacity>
          }
        >
          {countries.map((country) => (
            <Menu.Item
              key={country.code}
              title={country.name}
              onPress={() => handleRegionSelect(country.code)}
            />
          ))}
        </Menu>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProfilePage;