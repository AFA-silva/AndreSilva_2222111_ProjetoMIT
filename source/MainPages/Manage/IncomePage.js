import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../Supabase';
import styles from '../../Styles/Manage/IncomePageStyle';
import IncomeChart from '../../Utility/Chart';
import AlertComponent from '../../Utility/Alerts';
import { useFocusEffect } from '@react-navigation/native'; // Importação adicionada

const IncomePage = ({ navigation }) => {
  const [incomes, setIncomes] = useState([]);
  const [chartRenderKey, setChartRenderKey] = useState(Date.now());
  const [frequencies, setFrequencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chartData, setChartData] = useState([]); // Dados para o gráfico
  const [isModalVisible, setModalVisible] = useState(false); // Modal para adicionar ou editar income
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false); // Modal de confirmação de exclusão
  const [incomeToDelete, setIncomeToDelete] = useState(null); // Income selecionado para deletar
  const [userId, setUserId] = useState(null);
  const [selectedIncome, setSelectedIncome] = useState(null); // Income selecionado para edição
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency_id: '',
    category_id: '',
  });

  // Adicionar estado para alertas
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false); // Controla a exibição do alerta

  const incomesWithAddButton = [...incomes, { isAddButton: true }];

  const fetchUserIncomes = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('income')
        .select('*, frequencies(name, days), categories(name)')
        .eq('user_id', userId);
      if (error) {
        console.error('Error fetching incomes:', error);
        setIncomes([]);
        return;
      }
      setIncomes(data || []);
      processChartData(data); // Processar os dados para o gráfico
    } catch (error) {
      console.error('Unexpected error fetching incomes:', error);
    }
  };

  const fetchUserCategoriesAndFrequencies = async (userId) => {
    try {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`);

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        setCategories([]);
      } else {
        setCategories(categories || []);
      }

      const { data: frequencies, error: frequenciesError } = await supabase
        .from('frequencies')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`);

      if (frequenciesError) {
        console.error('Error fetching frequencies:', frequenciesError);
        setFrequencies([]);
      } else {
        setFrequencies(frequencies || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching categories or frequencies:', error);
    }
  };

  const processChartData = (incomeData) => {
    const categoryMap = {};

    incomeData.forEach((income) => {
      const { category_id, categories, frequencies, amount } = income;
      const days = frequencies?.days || 30; // Usar os dias da frequência ou 30 como padrão
      const monthlyAmount = (amount * 30) / days; // Converter para valor mensal

      if (!categoryMap[category_id]) {
        categoryMap[category_id] = {
          name: categories?.name || 'Uncategorized',
          total: 0,
        };
      }

      categoryMap[category_id].total += monthlyAmount;
    });

    const chartData = Object.values(categoryMap).map((category) => ({
      name: category.name,
      amount: category.total,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Gerar cores aleatórias
      legendFontColor: '#333',
      legendFontSize: 12,
    }));

    setChartData(chartData);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
        return;
      }
      setUserId(user.id);
      fetchUserIncomes(user.id);
      fetchUserCategoriesAndFrequencies(user.id);
    };
    fetchUserData();
  }, []);

  // Adicionada lógica para recarregar dados ao reentrar na página
  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        fetchUserIncomes(userId);
        fetchUserCategoriesAndFrequencies(userId);
        setChartRenderKey(Date.now()); // ← FORÇA O RE-RENDER DO CHART
      }
    }, [userId])
  );
  

  const handleAddIncome = () => {
    // Reseta o estado do formulário e abre o modal
    setSelectedIncome(null);
    setFormData({
      name: '',
      amount: '',
      frequency_id: '',
      category_id: '',
    });
    setModalVisible(true); // Exibe o modal
  };

  const handleEditIncome = (income) => {
    // Configura o estado do formulário com os dados do income selecionado e abre o modal
    setSelectedIncome(income);
    setFormData({
      name: income.name,
      amount: income.amount.toString(),
      frequency_id: income.frequency_id,
      category_id: income.category_id,
    });
    setModalVisible(true); // Exibe o modal
  };

  const handleSaveIncome = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('Error authenticating user:', authError);
        alert('Error fetching authenticated user. Please try again.');
        return;
      }

      const userId = user?.id;

      if (!userId) {
        alert('Error: Unauthenticated user. Unable to add income.');
        return;
      }

      if (!formData.name || !formData.amount || !formData.frequency_id || !formData.category_id) {
        alert('Please fill in all fields before saving.');
        return;
      }

      const payload = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        frequency_id: formData.frequency_id,
        category_id: formData.category_id,
        user_id: userId,
      };

      let error;
      if (selectedIncome) {
        // Atualiza o income selecionado
        ({ error } = await supabase
          .from('income')
          .update(payload)
          .eq('id', selectedIncome.id));
      } else {
        // Adiciona um novo income
        ({ error } = await supabase
          .from('income')
          .insert([payload]));
      }

      if (error) {
        console.error('Error saving income:', error);
        alert('Error saving income. Please try again.');
        return;
      }

      // Exibe mensagem de sucesso em um alerta
      setAlertMessage(selectedIncome ? 'Income updated successfully!' : 'Income added successfully!');
      setAlertType('success');
      setShowAlert(true);

      fetchUserIncomes(userId); // Atualiza lista após salvar
    } catch (error) {
      console.error('Unexpected error saving income:', error);
      alert('Unexpected error. Please try again.');
    } finally {
      setModalVisible(false); // Fecha o modal após salvar
    }
  };

  const handleDeleteIncome = async () => {
    try {
      const { error } = await supabase.from('income').delete().eq('id', incomeToDelete.id);
      if (error) {
        console.error('Error deleting income:', error);
      } else {
        fetchUserIncomes(userId); // Atualiza lista após exclusão
        // Exibe mensagem de sucesso em um alerta
        setAlertMessage('Income deleted successfully!');
        setAlertType('success');
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Unexpected error deleting income:', error);
    } finally {
      setDeleteModalVisible(false); // Fecha o modal após concluir a exclusão
    }
  };

  const confirmDeleteIncome = (income) => {
    setIncomeToDelete(income); // Define o income selecionado
    setDeleteModalVisible(true); // Abre o modal de confirmação
  };

  const renderIncomeItem = ({ item }) => {
    if (item.isAddButton) {
      return (
        <TouchableOpacity
          style={[styles.incomeItem, { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderColor: '#FFB74D', borderWidth: 2, backgroundColor: '#FFFDE7' }]}
          onPress={handleAddIncome}
          activeOpacity={0.8}
        >
          <Text style={[styles.addButtonText, { color: '#FFA726', fontSize: 18 }]}>+ Add Income</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.incomeItem}>
        <View style={styles.incomeRow}>
          <Text style={styles.incomeTitle}>{item.name}</Text>
          <Text style={styles.incomeDetails}>{item.categories.name}</Text>
        </View>
        <View style={styles.incomeRow}>
          <Text style={styles.incomeDetails}>Amount: {item.amount}</Text>
          <TouchableOpacity style={styles.actionButtonEdit} onPress={() => handleEditIncome(item)}>
            <Ionicons name="pencil" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.incomeRow}>
          <Text style={styles.incomeDetails}>Frequency: {item.frequencies.name}</Text>
          <TouchableOpacity style={styles.actionButtonDelete} onPress={() => confirmDeleteIncome(item)}>
            <Ionicons name="trash" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {showAlert && <AlertComponent type={alertType} message={alertMessage} onClose={() => setShowAlert(false)} />}

      <Text style={styles.header}>Income Management</Text>

      <IncomeChart
  key={chartRenderKey}
  incomes={incomes}
  categories={categories}
  frequencies={frequencies}
/>


      <FlatList
        data={incomesWithAddButton}
        keyExtractor={(item, idx) => item.id ? item.id.toString() : `add-btn-${idx}`}
        renderItem={renderIncomeItem}
        style={styles.incomeList}
      />

      {/* Modal de Adicionar/Editar Income */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>{selectedIncome ? 'Edit Income' : 'Add Income'}</Text>
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
              onValueChange={(itemValue) => setFormData({ ...formData, frequency_id: itemValue })}
            >
              <Picker.Item label="Select Frequency" value="" />
              {frequencies.map((frequency) => (
                <Picker.Item key={frequency.id} label={frequency.name} value={frequency.id} />
              ))}
            </Picker>
            <Picker
              selectedValue={formData.category_id}
              style={styles.picker}
              onValueChange={(itemValue) => setFormData({ ...formData, category_id: itemValue })}
            >
              <Picker.Item label="Select Category" value="" />
              {categories.map((category) => (
                <Picker.Item key={category.id} label={category.name} value={category.id} />
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

      {/* Modal de Confirmação de Exclusão */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>
              Do you want to delete the income - {incomeToDelete?.name}?
            </Text>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleDeleteIncome}>
                <Text style={styles.saveButtonText}>Yes, Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.closeButtonText}>No, Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default IncomePage;