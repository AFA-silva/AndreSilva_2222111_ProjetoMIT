import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../Supabase';
import styles from '../../Styles/Manage/IncomePageStyle';
import IncomeChart from '../../Utility/Chart';
import Alert from '../../Utility/Alerts'; // Alerta importado

const IncomePage = ({ navigation }) => {
  const [incomes, setIncomes] = useState([]);
  const [frequencies, setFrequencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency_id: '',
    category_id: '',
  });

  // Gerenciamento de alertas
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  const fetchIncomes = async () => {
    const { data, error } = await supabase
      .from('income')
      .select('*, frequencies(name), categories(name)');
    if (error) {
      console.error('Error fetching incomes:', error);
    } else {
      setIncomes(data || []);
    }
  };

  const fetchFrequencies = async () => {
    const { data, error } = await supabase.from('frequencies').select('*');
    if (error) {
      console.error('Error fetching frequencies:', error);
    } else {
      setFrequencies(data || []);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      setCategories(data || []);
    }
  };

  useEffect(() => {
    fetchIncomes();
    fetchFrequencies();
    fetchCategories();
  }, []);

  const handleAddIncome = () => {
    setSelectedIncome(null);
    setFormData({
      name: '',
      amount: '',
      frequency_id: '',
      category_id: '',
    });
    setModalVisible(true);
  };

  const handleEditIncome = (income) => {
    setSelectedIncome(income);
    setFormData({
      name: income.name,
      amount: income.amount.toString(),
      frequency_id: income.frequency_id,
      category_id: income.category_id,
    });
    setModalVisible(true);
  };

  const handleSaveIncome = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('Erro ao autenticar o usuário:', authError);
        alert('Erro ao obter o usuário autenticado. Por favor, tente novamente.');
        return;
      }

      const userId = user?.id;

      if (!userId) {
        alert('Erro: Usuário não autenticado. Não é possível adicionar a receita.');
        return;
      }

      if (!formData.name || !formData.amount || !formData.frequency_id || !formData.category_id) {
        alert('Por favor, preencha todos os campos antes de salvar.');
        return;
      }

      const payload = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        frequency_id: formData.frequency_id,
        category_id: formData.category_id,
        user_id: userId, // Incluindo o user_id
      };

      let error;
      if (selectedIncome) {
        ({ error } = await supabase
          .from('income')
          .update(payload)
          .eq('id', selectedIncome.id));
      } else {
        ({ error } = await supabase
          .from('income')
          .insert([payload]));
      }

      if (error) {
        console.error('Erro ao salvar receita:', error);
        alert('Erro ao salvar a receita. Por favor, tente novamente.');
        return;
      }

      // Alerta verde de sucesso
      setAlertMessage(selectedIncome ? 'Receita atualizada com sucesso!' : 'Receita adicionada com sucesso!');
      setAlertType('success');
      setShowAlert(true);
    } catch (error) {
      console.error('Erro inesperado ao salvar receita:', error);
      alert('Erro inesperado. Por favor, tente novamente.');
    } finally {
      setModalVisible(false);
      fetchIncomes(); // Atualiza a lista de receitas
    }
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
      {/* Alerta */}
      {showAlert && <Alert type={alertType} message={alertMessage} onClose={() => setShowAlert(false)} />}

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
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.incomeItem}>
            <Text style={styles.incomeTitle}>{item.name}</Text>
            <Text style={styles.incomeDetails}>
              ${item.amount} - {item.frequencies?.name} - {item.categories?.name}
            </Text>
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
            <TextInput
              style={styles.modalInput}
              placeholder="Name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Amount"
              keyboardType="numeric"
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
            />
            <Picker
              selectedValue={formData.frequency_id}
              style={styles.picker}
              onValueChange={(itemValue) =>
                setFormData({ ...formData, frequency_id: itemValue })
              }
            >
              <Picker.Item label="Select Frequency" value="" />
              {frequencies.map((frequency) => (
                <Picker.Item
                  key={frequency.id}
                  label={frequency.name}
                  value={frequency.id}
                />
              ))}
            </Picker>
            <Picker
              selectedValue={formData.category_id}
              style={styles.picker}
              onValueChange={(itemValue) =>
                setFormData({ ...formData, category_id: itemValue })
              }
            >
              <Picker.Item label="Select Category" value="" />
              {categories.map((category) => (
                <Picker.Item
                  key={category.id}
                  label={category.name}
                  value={category.id}
                />
              ))}
            </Picker>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveIncome}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default IncomePage;