import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import styles from '../../Styles/Settings/ProfilePageStyle';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
// import * as ImagePicker from 'expo-image-picker'; // Descomente se usar expo-image-picker
// import { getUserByEmail } from '../../Utility/MainQueries'; // Exemplo de import para buscar dados

const ProfilePage = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [email] = useState('user@example.com'); // Substitua pelo email dinâmico

  // Buscar dados do usuário na database ao entrar na página
  useEffect(() => {
    const fetchUserData = async () => {
      // Exemplo de chamada para Supabase ou outro backend
      // const user = await getUserByEmail(email);
      // if (user) {
      //   setName(user.name || '');
      //   setPhone(user.phone || '');
      //   setRegion(user.region || '');
      //   setProfileImage(user.profile_image_url || null);
      // }
      // Simulação de carregamento de dados
      setName('John Doe');
      setPhone('+351 912345678');
      setRegion('Lisboa');
      // setProfileImage('https://randomuser.me/api/portraits/men/1.jpg');
    };
    fetchUserData();
  }, [email]);

  // Função para selecionar imagem de perfil
  const pickImage = async () => {
    // Descomente se usar expo-image-picker
    // let result = await ImagePicker.launchImageLibraryAsync({
    //   mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //   allowsEditing: true,
    //   aspect: [1, 1],
    //   quality: 1,
    // });
    // if (!result.canceled) {
    //   setProfileImage(result.assets[0].uri);
    // }
    alert('Funcionalidade de upload de imagem não implementada neste exemplo.');
  };

  const handleSave = () => {
    alert('Profile saved!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
      {/* Imagem de perfil */}
      <TouchableOpacity style={styles.profileImageWrapper} onPress={pickImage} activeOpacity={0.8}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Ionicons name="image-outline" size={80} color="#FFA726" />
          </View>
        )}
        <View style={styles.cameraIconWrapper}>
          <Ionicons name="camera" size={22} color="#FFF" />
        </View>
      </TouchableOpacity>

      {/* Input Nome */}
      <View style={styles.inputWrapper}>
        <Ionicons name="person-outline" size={22} color="#FFA726" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#AAA"
        />
      </View>
      {/* Input Telefone */}
      <View style={styles.inputWrapper}>
        <MaterialIcons name="phone" size={22} color="#FFA726" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor="#AAA"
        />
      </View>
      {/* Input Região */}
      <View style={styles.inputWrapper}>
        <Ionicons name="location-outline" size={22} color="#FFA726" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Region"
          value={region}
          onChangeText={setRegion}
          placeholderTextColor="#AAA"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProfilePage;