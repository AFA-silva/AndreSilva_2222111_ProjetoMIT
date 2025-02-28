import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from '../Styles/MainPageStyles/MainMenuPageStyle';

const MainMenuPage = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu Principal</Text>

      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Transações</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Metas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Configurações</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MainMenuPage;
