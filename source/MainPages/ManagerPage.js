import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from '../Styles/MainPageStyles/ManagerPageStyle';

const ManagerPage = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gerenciamento</Text>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.managerButton}>
          <Text style={styles.buttonText}>Gerenciar Receitas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.managerButton}>
          <Text style={styles.buttonText}>Gerenciar Despesas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.managerButton}>
          <Text style={styles.buttonText}>Gerenciar Metas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.managerButton}>
          <Text style={styles.buttonText}>Mercado de Moedas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.managerButton}>
          <Text style={styles.buttonText}>Investimentos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ManagerPage;
