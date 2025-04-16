import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Modal, FlatList, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; // For picking profile image
import styles from '../../Styles/Settings/ProfilePageStyle'; // Import styles
import { supabase } from '../../../Supabase'; // Replace with your Supabase client import
import { fetchCountries } from '../../Utility/FetchCountries'; // Reuse shared country-fetching utility

const ProfilePage = ({ navigation }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [image, setImage] = useState(null); // Holds the profile image URI
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true); // Loading state for fetching user data

  useEffect(() => {
    // Load countries for the region picker
    const loadCountries = async () => {
      const countryList = await fetchCountries();
      setCountries(countryList);
      setFilteredCountries(countryList);
    };

    const loadUserData = async () => {
      try {
        // Fetch the user's data from the database
        const { data, error } = await supabase
          .from('users')
          .select('name, phone, region, image')
          .eq('email', 'user@example.com') // Replace with authenticated user's email
          .single();

        if (error) {
          throw error;
        }

        // Populate the inputs with user data
        setName(data.name || '');
        setPhone(data.phone || '');
        setRegion(data.region || '');
        setImage(data.image || null);
      } catch (error) {
        console.error('Error fetching user data:', error.message);
      } finally {
        setLoading(false);
      }
    };

    loadCountries();
    loadUserData();
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setFilteredCountries(
      countries.filter((country) =>
        country.name.toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  const pickImage = async () => {
    // Request permission to access media library
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri); // Update the image in the interface
    }
  };

  const handleSave = () => {
    // TODO: Add logic to save changes to the database
    console.log('Profile saved:', { name, phone, region, image });
    alert('Profile updated successfully!');
  };

  if (loading) {
    // Show a loading indicator while data is being fetched
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>

      {/* Profile Image Section */}
      <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.profileImage} />
        ) : (
          <Text style={styles.imagePlaceholder}>Tap to select image</Text>
        )}
      </TouchableOpacity>

      {/* Name Input */}
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />

      {/* Phone Input */}
      <TextInput
        style={styles.input}
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      {/* Region Picker */}
      <TouchableOpacity style={styles.input} onPress={() => setModalVisible(true)}>
        <View style={styles.countryPickerRow}>
          {region ? (
            <Image
              source={{ uri: `https://flagcdn.com/w40/${region.toLowerCase()}.png` }}
              style={styles.flagIcon}
            />
          ) : null}
          <Text style={[styles.inputText, { color: region ? '#333' : '#999' }]}>
            {region ? countries.find((c) => c.code === region)?.name || 'Select your region' : 'Select your region'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Region Picker Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a country..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setRegion(item.code);
                    setModalVisible(false);
                  }}
                >
                  <View style={styles.modalItemRow}>
                    <Image
                      source={{ uri: `https://flagcdn.com/w40/${item.code.toLowerCase()}.png` }}
                      style={styles.modalFlagIcon}
                    />
                    <Text style={styles.modalText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProfilePage;