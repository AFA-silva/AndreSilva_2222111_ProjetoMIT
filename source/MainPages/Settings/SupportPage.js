import React from 'react';
import { View, Text } from 'react-native';
import styles from '../../Styles/Settings/SupportPageStyle'; // Ensure the correct path for styles

const SupportPage = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Support Page</Text>
      <Text style={styles.content}>Get help and support here.</Text>
    </View>
  );
};

export default SupportPage;