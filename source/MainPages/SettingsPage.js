import React from 'react';
import { View, Text } from 'react-native';
import styles from '../Styles/MainPageStyles/SettingsPageStyle';

const SettingsPage = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.contentText}>Settings Page</Text>
    </View>
  );
};

export default SettingsPage;