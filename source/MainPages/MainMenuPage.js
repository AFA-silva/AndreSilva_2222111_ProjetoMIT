import React from 'react';
import { View, Text } from 'react-native';
import styles from '../Styles/MainMenuPageStyle'; // Importar os estilos

const MainMenuPage = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the Main Menu Page</Text>
      <Text style={styles.subtitle}>This is the main screen of your project.</Text>
      <Text style={styles.subtitle}>Inácio és gay!</Text>
    </View>
  );
};

export default MainMenuPage;