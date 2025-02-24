import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import styles from '../Styles/WelcomePageStyle'; // Importar os estilos

const WelcomePage = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} />
      
      <Text style={styles.title}>Controle as suas finanças!</Text>
      <Text style={styles.description}>
        Monitore as suas finanças, defina metas e alcance os seus objetivos com facilidade e eficiência.
      </Text>
      
      <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerText}>Create an account</Text>
      </TouchableOpacity>
    </View>
  );
};

export default WelcomePage;