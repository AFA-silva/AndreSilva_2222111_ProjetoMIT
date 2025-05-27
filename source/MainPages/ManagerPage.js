import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For icons
import styles from '../Styles/MainPageStyles/ManagerPageStyle';
import Header from '../Utility/Header';

const ManagerPage = ({ navigation }) => {
  return (
    <View style={styles.mainContainer}>
      <Header title="Manager" />
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.managerButton}
            onPress={() => navigation.navigate('IncomePage')} // Navigate to IncomePage
          >
            <View style={styles.buttonRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="cash-outline" size={24} color="#FF9800" />
              </View>
              <View>
                <Text style={styles.buttonText}>Manage Income</Text>
                <Text style={styles.categoryLabel}>Track all your income sources</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#CBD5E0" style={{ marginLeft: 'auto' }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.managerButton}
            onPress={() => navigation.navigate('ExpensesPage')} // Navigate to ExpensesPage
          >
            <View style={styles.buttonRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="card-outline" size={24} color="#FF9800" />
              </View>
              <View>
                <Text style={styles.buttonText}>Manage Expenses</Text>
                <Text style={styles.categoryLabel}>Control your spending</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#CBD5E0" style={{ marginLeft: 'auto' }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.managerButton}
            onPress={() => navigation.navigate('GoalsPage')} // Navigate to GoalsPage
          >
            <View style={styles.buttonRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="flag-outline" size={24} color="#FF9800" />
              </View>
              <View>
                <Text style={styles.buttonText}>Manage Goals</Text>
                <Text style={styles.categoryLabel}>Set and track your financial goals</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#CBD5E0" style={{ marginLeft: 'auto' }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.managerButton}
            onPress={() => navigation.navigate('CurrencyMarketPage')}
          >
            <View style={styles.buttonRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="earth-outline" size={24} color="#FF9800" />
              </View>
              <View>
                <Text style={styles.buttonText}>Mercado de Moedas</Text>
                <Text style={styles.categoryLabel}>Manage and convert currencies</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#CBD5E0" style={{ marginLeft: 'auto' }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.managerButton, styles.disabledButton]}
          >
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>SOON</Text>
            </View>
            <View style={styles.buttonRow}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(113, 128, 150, 0.1)' }]}>
                <Ionicons name="trending-up-outline" size={24} color="#718096" />
              </View>
              <View>
                <Text style={[styles.buttonText, { color: '#718096' }]}>Investimentos</Text>
                <Text style={styles.categoryLabel}>Coming soon...</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default ManagerPage;