import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For icons
import styles from '../Styles/MainPageStyles/ManagerPageStyle';

const ManagerPage = ({ navigation }) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Gerenciamento</Text>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.managerButton}>
          <View style={styles.buttonRow}>
            <Ionicons name="cash-outline" size={24} color="#FF9800" />
            <Text style={styles.buttonText}>Gerenciar Receitas</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.managerButton}>
          <View style={styles.buttonRow}>
            <Ionicons name="card-outline" size={24} color="#FF9800" />
            <Text style={styles.buttonText}>Gerenciar Despesas</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.managerButton}>
          <View style={styles.buttonRow}>
            <Ionicons name="stats-chart-outline" size={24} color="#FF9800" />
            <Text style={styles.buttonText}>Gerenciar Metas</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.managerButton}>
          <View style={styles.buttonRow}>
            <Ionicons name="earth-outline" size={24} color="#FF9800" />
            <Text style={styles.buttonText}>Mercado de Moedas</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.managerButton}>
          <View style={styles.buttonRow}>
            <Ionicons name="trending-up-outline" size={24} color="#FF9800" />
            <Text style={styles.buttonText}>Investimentos</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default ManagerPage;