import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import styles from '../../Styles/Settings/SecurityPageStyle'; // Certifique-se de que o caminho está correto

const SecurityPage = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Security Page</Text>
      <Text style={styles.content}>Manage your security settings here.</Text>
    </View>
  );
};

export default SecurityPage;