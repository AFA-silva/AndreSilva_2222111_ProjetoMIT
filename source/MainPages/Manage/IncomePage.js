import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../Supabase'; // Ensure Supabase is properly configured
import styles from '../../Styles/Manage/IncomePageStyle';
import IncomeChart from '../../Utility/Chart'; // Corrected the import

const IncomePage = ({ navigation }) => {
  const [incomes, setIncomes] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);

  const fetchIncomes = async () => {
    const { data, error } = await supabase.from('income').select('*');
    if (error) {
      console.error('Error fetching incomes:', error);
    } else {
      setIncomes(data || []);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const handleAddIncome = () => {
    setSelectedIncome(null);
    setModalVisible(true);
  };

  const handleEditIncome = (income) => {
    setSelectedIncome(income);
    setModalVisible(true);
  };

  const handleDeleteIncome = async (incomeId) => {
    const { error } = await supabase.from('income').delete().eq('id', incomeId);
    if (error) {
      console.error('Error deleting income:', error);
    } else {
      fetchIncomes();
    }
  };

  const handleManageCategoriesAndFrequencies = () => {
    navigation.navigate('CategoriesAndFrequenciesPage');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Income</Text>

      {/* Income Chart */}
      <IncomeChart incomes={incomes} />

      {/* Add Income Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddIncome}
        activeOpacity={0.7}
      >
        <Text style={styles.addButtonText}>+ Add Income</Text>
      </TouchableOpacity>

      {/* Manage Categories and Frequencies Button */}
      <TouchableOpacity
        style={styles.manageButton}
        onPress={handleManageCategoriesAndFrequencies}
        activeOpacity={0.7}
      >
        <Text style={styles.manageButtonText}>Manage Categories & Frequencies</Text>
      </TouchableOpacity>

      {/* Income List */}
      <FlatList
        data={incomes}
        keyExtractor={(item) => item.id.toString()} // Ensure keys are strings
        renderItem={({ item }) => (
          <View style={styles.incomeItem}>
            <Text style={styles.incomeTitle}>{item.name}</Text>
            <Text style={styles.incomeAmount}>${item.amount}</Text>
            <View style={styles.incomeActions}>
              <TouchableOpacity onPress={() => handleEditIncome(item)}>
                <Ionicons name="create-outline" size={24} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteIncome(item.id)}>
                <Ionicons name="trash-outline" size={24} color="#D84315" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal for Adding/Editing Income */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>
              {selectedIncome ? 'Edit Income' : 'Add Income'}
            </Text>
            {/* Add/Edit Form Here */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default IncomePage;