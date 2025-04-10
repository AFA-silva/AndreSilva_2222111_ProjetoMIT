import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import styles from './ProfilePageStyle'; // Import the updated styles
import { supabase } from '../../../Supabase'; // Ensure this path points to your Supabase setup file

const ProfilePage = () => {
  const [profileImage, setProfileImage] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false); // State to track loading errors

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(false);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          setError(true);
          console.error('Error fetching user data:', error.message);
        } else if (!user) {
          setError(true);
          console.warn('No user data found!');
        } else {
          console.log('User data:', user); // Log the fetched data for debugging
          const { data, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (fetchError) {
            setError(true);
            console.error('Error fetching user profile data:', fetchError.message);
          } else {
            setProfileImage(data.image);
            setName(data.name);
            setPhone(data.phone);
            setRegion(data.region);
          }
        }
      } catch (err) {
        setError(true);
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'The name cannot be empty.');
      return;
    }

    if (!/^\+?[0-9]*$/.test(phone)) {
      Alert.alert('Error', 'The phone number must contain only numbers.');
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
        console.error('Error updating user data:', error.message);
      } else {
        Alert.alert('Success', 'Your profile has been updated!');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
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
            console.error('Error uploading image:', error.message);
          } else {
            const { publicUrl } = supabase
              .storage
              .from('profile-images')
              .getPublicUrl(data.path);
            setProfileImage(publicUrl);
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
          console.error('Error uploading image:', error.message);
        } else {
          const { publicUrl } = supabase
            .storage
            .from('profile-images')
            .getPublicUrl(data.path);
          setProfileImage(publicUrl);
        }
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF9800" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load user data. Please try again later.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>

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

      {/* Name */}
      <View style={styles.inputGroup}>
        <Ionicons name="person-outline" size={24} color="#FF9800" />
        <TextInput
          style={styles.inputText}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Phone */}
      <View style={styles.inputGroup}>
        <Ionicons name="call-outline" size={24} color="#FF9800" />
        <TextInput
          style={styles.inputText}
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      {/* Region */}
      <View style={styles.inputGroup}>
        <Ionicons name="location-outline" size={24} color="#FF9800" />
        <TextInput
          style={styles.inputText}
          placeholder="Region"
          value={region}
          onChangeText={setRegion}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProfilePage;