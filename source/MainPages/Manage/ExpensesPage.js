import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../Styles/Manage/ExpensesPageStyle';
import { supabase } from '../../../Supabase';
import AlertComponent from '../../Utility/Alerts';
import { useFocusEffect } from '@react-navigation/native';
import Chart from '../../Utility/Chart';
import Header from '../../Utility/Header';
import { formatCurrency, getCurrentCurrency, addCurrencyChangeListener, removeCurrencyChangeListener, shouldConvertCurrencyValues } from '../../Utility/FetchCountries';
import { convertValueToCurrentCurrency } from '../../Utility/CurrencyConverter';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [originalExpenses, setOriginalExpenses] = useState([]); // Armazenar valores originais
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false); // Modal para exibir itens filtrados
  const [isCategoryFilterVisible, setCategoryFilterVisible] = useState(false);
  const [categories, setCategories] = useState([]);
  const [frequencies, setFrequencies] = useState([]);
  const [userId, setUserId] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category_id: '',
    frequency_id: '',
    priority: 3, // Default to média priority
  });
  const [originalCurrency, setOriginalCurrency] = useState('EUR'); // Moeda original do sistema
  const [chartRenderKey, setChartRenderKey] = useState(Date.now());

  // Alert states
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
  });
  const [isDeleteCategoryModalVisible, setDeleteCategoryModalVisible] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Use filteredExpenses para a lista e se estiver vazia, use expenses
  const expensesToDisplay = filteredExpenses.length > 0 ? filteredExpenses : expenses;
  const expensesWithAddButton = [...expensesToDisplay, { isAddButton: true }];
  
  // Novo método para lidar com a seleção de categoria no gráfico
  const handleChartCategorySelect = (selectedCategory) => {
    if (!selectedCategory) {
      // Se nenhuma categoria está selecionada, limpar o filtro
      setFilteredExpenses([]);
      setSelectedCategoryId(null);
      return;
    }

    // Encontrar a categoria correspondente no array de categorias
    const category = categories.find(c => c.name === selectedCategory.name);
    if (!category) return;

    // Se clicar na mesma categoria, limpa o filtro
    if (selectedCategoryId === category.id) {
      setSelectedCategoryId(null);
      setFilteredExpenses([]);
      return;
    }
    
    setSelectedCategoryId(category.id);
    
    // Filtrar as despesas para mostrar apenas as da categoria selecionada
    const filtered = expenses.filter(expense => expense.category_id === category.id);
    setFilteredExpenses(filtered);
    
    if (filtered.length === 0) {
      setAlertMessage('No expenses found for this category');
      setAlertType('info');
      setShowAlert(true);
    }
  };

  // Renderizar um item de categoria para o filtro horizontal
  const renderCategoryItem = ({ item }) => {
    if (!item || !item.id) return null;
    
    const isSelected = selectedCategoryId === item.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.categoryChip, 
          isSelected && styles.categoryChipSelected
        ]}
        onPress={() => handleChartCategorySelect(item)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.categoryChipText,
          isSelected && styles.categoryChipTextSelected
        ]}>
          {item.name}
        </Text>
        {isSelected && (
          <View style={styles.categoryChipIndicator}>
            <Ionicons name="checkmark" size={12} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Botão para limpar filtros
  const renderClearFilterButton = () => {
    if (filteredExpenses.length === 0) return null;
    
    return (
      <TouchableOpacity 
        style={styles.clearFilterButton}
        onPress={() => {
          setFilteredExpenses([]);
          setSelectedCategoryId(null);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="close-circle" size={18} color="#FFF" />
        <Text style={styles.clearFilterButtonText}>Clear Filter</Text>
      </TouchableOpacity>
    );
  };

  // Renderiza um item de despesa para o modal de filtro
  const renderFilterItem = ({ item, index }) => {
    if (!item || item.isAddButton) return null;
    
    return (
      <View style={styles.modalExpenseItem} key={`filter-item-${item.id || index}`}>
        <View style={styles.expenseRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.priorityIndicator, getPriorityColor(item.priority)]} />
            <Text style={styles.expenseTitle}>{item.name}</Text>
          </View>
          <Text style={styles.expenseDetails}>
            {formatCurrency(item.amount)}
          </Text>
        </View>

        <View style={styles.expenseRow}>
          {item.categories && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>
                {item.categories.name}
              </Text>
            </View>
          )}
          {item.frequencies && (
            <View style={styles.frequencyTag}>
              <Text style={styles.frequencyText}>
                {item.frequencies.name}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.expenseRow, { marginTop: 4 }]}>
          <Text style={styles.expenseDetails}>
            Priority: {getPriorityLabel(item.priority)}
          </Text>
        </View>
      </View>
    );
  };

  // Obter a moeda do usuário diretamente do banco de dados
  const loadUserCurrency = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('user_currency_preferences')
        .select('actual_currency')
        .eq('user_id', session.user.id)
        .single();
        
      if (error || !data) {
        throw new Error('Failed to load currency preference');
      }
      
      console.log('[ExpensesPage] Moeda carregada direto do banco:', data.actual_currency);
      setOriginalCurrency(data.actual_currency);
      return data.actual_currency;
    } catch (error) {
      console.error('[ExpensesPage] Erro ao carregar moeda do usuário:', error);
      throw new Error('Cannot determine user currency');
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
        return;
      }
      setUserId(user.id);
      await loadUserCurrency(); // Carregar a moeda do usuário
      fetchExpenses(user.id);
      fetchCategoriesAndFrequencies(user.id);
    };
    fetchUserData();
    
    // Adicionar listener para mudanças de moeda
    addCurrencyChangeListener(handleCurrencyChange);
    
    // Limpar listener ao desmontar
    return () => {
      removeCurrencyChangeListener(handleCurrencyChange);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        fetchExpenses(userId);
        fetchCategoriesAndFrequencies(userId);
      }
    }, [userId])
  );

  // Função para converter os valores para a moeda atual
  const convertExpensesToCurrentCurrency = async (data, origCurrency) => {
    try {
      if (!data || data.length === 0) {
        return;
      }
      
      const sourceCurrency = origCurrency || originalCurrency || 'EUR';
      console.log(`[ExpensesPage] Convertendo ${data.length} despesas de ${sourceCurrency}`);
      
      // Não salva mais no AsyncStorage
      console.log(`[ExpensesPage] Usando moeda ${sourceCurrency} para conversão`);
      
      const convertedExpenses = await Promise.all(data.map(async (expense, index) => {
        try {
          console.log(`[Expense ${index+1}] Convertendo ${expense.amount} ${sourceCurrency}`);
          const convertedAmount = await convertValueToCurrentCurrency(expense.amount, sourceCurrency);
          console.log(`[Expense ${index+1}] Resultado: ${convertedAmount}`);
          
          return {
            ...expense,
            amount: convertedAmount
          };
        } catch (error) {
          console.error('[ExpensesPage] Erro ao converter valor individual:', error);
          return expense; // Manter o valor original em caso de erro
        }
      }));
      
      console.log('[ExpensesPage] Despesas convertidas com sucesso');
      setExpenses(convertedExpenses);
    } catch (error) {
      console.error('[ExpensesPage] Erro ao converter valores:', error);
      setExpenses(data); // Em caso de erro, usar os valores originais
    }
  };

  // Ouvinte para mudanças na moeda
  const handleCurrencyChange = async (newCurrency) => {
    try {
      console.log('Moeda alterada para:', newCurrency?.code);
      
      // Verificar se devemos converter os valores
      const shouldConvert = shouldConvertCurrencyValues();
      console.log('Converter valores?', shouldConvert);
      
      if (shouldConvert) {
        // Converter valores usando a moeda original
        await convertExpensesToCurrentCurrency(originalExpenses, originalCurrency);
      } else {
        // Apenas atualizar o símbolo da moeda, sem converter os valores
        setExpenses([...originalExpenses]);
      }
      
      // Forçar re-renderização do gráfico
      setChartRenderKey(Date.now());
    } catch (error) {
      console.error('Erro ao lidar com mudança de moeda:', error);
    }
  };

  const fetchExpenses = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
            *,
            categories (name),
            frequencies (id, name, days)
          `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Armazenar valores originais
      setOriginalExpenses(data || []);
      
      // Obter a moeda do usuário para usar na conversão
      const origCurrency = await loadUserCurrency();
      
      // Converter para a moeda atual
      await convertExpensesToCurrentCurrency(data || [], origCurrency);
      
      // Limpar o filtro quando novos dados são carregados
      setFilteredExpenses([]);
      setSelectedCategoryId(null);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setAlertMessage('Failed to fetch expenses');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const fetchCategoriesAndFrequencies = async (userId) => {
    try {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq('type', 'expense');

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

  const handleAddExpense = () => {
    setSelectedExpense(null);
    setFormData({
      name: '',
      amount: '',
      category_id: '',
      frequency_id: '',
      priority: 3,
    });
    setModalVisible(true);
  };

  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      category_id: expense.category_id,
      frequency_id: expense.frequency_id,
      priority: expense.priority,
    });
    setModalVisible(true);
  };

  const handleSaveExpense = async () => {
    try {
      if (!formData.name || !formData.amount || !formData.category_id || !formData.frequency_id) {
        setAlertMessage('Please fill in all fields before saving.');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      const payload = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id,
        frequency_id: formData.frequency_id,
        priority: formData.priority,
        user_id: userId,
      };

      let error;
      if (selectedExpense) {
        ({ error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', selectedExpense.id));
      } else {
        ({ error } = await supabase
          .from('expenses')
          .insert([payload]));
      }

      if (error) throw error;

      setAlertMessage(selectedExpense ? 'Expense updated successfully!' : 'Expense added successfully!');
      setAlertType('success');
      setShowAlert(true);

      fetchExpenses(userId);
      
      // Limpar o filtro quando uma nova despesa é adicionada
      setFilteredExpenses([]);
      setSelectedCategoryId(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      setAlertMessage('Error saving expense. Please try again.');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setModalVisible(false);
    }
  };

  const confirmDeleteExpense = (expense) => {
    setExpenseToDelete(expense);
    setDeleteModalVisible(true);
  };

  const handleDeleteExpense = async () => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseToDelete.id);

      if (error) throw error;

      setAlertMessage('Expense deleted successfully!');
      setAlertType('success');
      setShowAlert(true);
      fetchExpenses(userId);
      
      // Limpar o filtro quando uma despesa é excluída
      setFilteredExpenses([]);
      setSelectedCategoryId(null);
    } catch (error) {
      console.error('Error deleting expense:', error);
      setAlertMessage('Failed to delete expense');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setDeleteModalVisible(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 1:
        return styles.priorityMinima;
      case 2:
        return styles.priorityBaixa;
      case 3:
        return styles.priorityMedia;
      case 4:
        return styles.priorityAlta;
      case 5:
        return styles.priorityMaxima;
      default:
        return styles.priorityMedia;
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 1:
        return 'Min';
      case 2:
        return 'Low';
      case 3:
        return 'Medium';
      case 4:
        return 'High';
      case 5:
        return 'Max';
      default:
        return 'Medium';
    }
  };

  const formatAmount = (amount) => {
    return formatCurrency(amount);
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setCategoryFormData({
      name: category.name,
    });
    setCategoryModalVisible(true);
  };

  const handleDeleteCategory = async () => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id);

      if (error) throw error;

      setAlertMessage('Category deleted successfully!');
      setAlertType('success');
      setShowAlert(true);
      fetchCategoriesAndFrequencies(userId);
      
      // Limpar o filtro quando uma categoria é excluída
      setFilteredExpenses([]);
      setSelectedCategoryId(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      setAlertMessage('Failed to delete category');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setDeleteCategoryModalVisible(false);
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (!categoryFormData.name.trim()) {
        setAlertMessage('Please enter a category name');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      const payload = {
        name: categoryFormData.name.trim(),
        type: 'expense',
        user_id: userId
      };

      let error;
      if (selectedCategory) {
        ({ error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', selectedCategory.id));
      } else {
        ({ error } = await supabase
          .from('categories')
          .insert([payload]));
      }

      if (error) throw error;

      setAlertMessage(selectedCategory ? 'Category updated successfully!' : 'Category added successfully!');
      setAlertType('success');
      setShowAlert(true);
      setCategoryFormData({ name: '' });
      setCategoryModalVisible(false);
      fetchCategoriesAndFrequencies(userId);
      
      // Limpar o filtro quando uma categoria é alterada
      setFilteredExpenses([]);
      setSelectedCategoryId(null);
    } catch (error) {
      console.error('Error saving category:', error);
      setAlertMessage('Failed to save category');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const confirmDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setDeleteCategoryModalVisible(true);
  };

  const renderExpenseItem = ({ item }) => {
    if (item.isAddButton) {
      return (
        <>
          <TouchableOpacity
            style={[styles.expenseItem, { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderColor: '#FFB74D', borderWidth: 2, backgroundColor: '#FFFDE7' }]}
            onPress={handleAddExpense}
            activeOpacity={0.8}
          >
            <Text style={[styles.addButtonText, { color: '#FFA726', fontSize: 18 }]}>+ Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.expenseItem, { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderColor: '#FFA726', borderWidth: 2, backgroundColor: '#FFF3E0' }]}
            onPress={() => {
              setSelectedCategory(null);
              setCategoryFormData({ name: '' });
              setCategoryModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.addButtonText, { color: '#FF9800', fontSize: 18 }]}>Manage Categories</Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <View style={styles.expenseItem}>
        <View style={styles.expenseRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.priorityIndicator, getPriorityColor(item.priority)]} />
            <Text style={styles.expenseTitle}>{item.name}</Text>
          </View>
          <Text style={styles.expenseDetails}>
            {formatAmount(item.amount)}
          </Text>
        </View>

        <View style={styles.expenseRow}>
          {item.categories && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>
                {item.categories.name}
              </Text>
            </View>
          )}
          {item.frequencies && (
            <View style={styles.frequencyTag}>
              <Text style={styles.frequencyText}>
                {item.frequencies.name}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.expenseRow, { marginTop: 8 }]}>
          <Text style={styles.expenseDetails}>
            Priority: {getPriorityLabel(item.priority)}
          </Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={[styles.actionButtonEdit, { marginRight: 8 }]}
              onPress={() => handleEditExpense(item)}
            >
              <Ionicons name="pencil" size={16} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButtonDelete}
              onPress={() => confirmDeleteExpense(item)}
            >
              <Ionicons name="trash" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const processExpenseData = (expenseData, selectedPeriod = 'month') => {
    if (!expenseData || !categories) return { labels: [], data: [] };

    const categoryMap = {};
    
    // Initialize categories
    categories.forEach(category => {
      categoryMap[category.id] = {
        name: category.name,
        total: 0
      };
    });

    const today = new Date();
    expenseData.forEach(expense => {
      const { category_id, amount, frequency_id, frequencies } = expense;
      const expenseDate = new Date(expense.created_at);
      let shouldInclude = false;
      let convertedAmount = amount;

      // Check if expense should be included based on period
      const dayDiff = Math.floor((today - expenseDate) / (1000 * 60 * 60 * 24));
      switch (selectedPeriod) {
        case 'day':
          shouldInclude = dayDiff < 7; // Last 7 days
          break;
        case 'week':
          shouldInclude = dayDiff < 28; // Last 4 weeks
          break;
        case 'month':
          shouldInclude = dayDiff < 180; // Last 6 months
          break;
        default:
          shouldInclude = dayDiff < 180; // Default to monthly
      }

      if (!shouldInclude) return;

      // Convert amount based on frequency and period
      if (frequencies) {
        const days = frequencies.days || 30;
        const monthlyAmount = (amount * 30) / days; // Convert to monthly first

        // Then convert to target period
        switch (selectedPeriod) {
          case 'day':
            convertedAmount = monthlyAmount / 30; // Convert to daily
            break;
          case 'week':
            convertedAmount = monthlyAmount / 4.28; // Convert to weekly
            break;
          case 'month':
            convertedAmount = monthlyAmount; // Keep monthly amount
            break;
        }
      }

      // Process Category Data
      if (category_id && categoryMap[category_id]) {
        categoryMap[category_id].total += convertedAmount;
      }
    });

    // Convert category data for chart
    const categoryData = Object.values(categoryMap)
      .filter(cat => cat.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)
      .map(cat => ({
        name: cat.name,
        amount: Math.round(cat.total * 100) / 100,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        legendFontColor: '#333333',
        legendFontSize: 12,
      }));

    return {
      categoryData,
    };
  };

  return (
    <View style={styles.container}>
      {showAlert && <AlertComponent type={alertType} message={alertMessage} onClose={() => setShowAlert(false)} />}

      <Header title="Expenses Management" />

      <View style={styles.chartContainer}>
        <Chart
          incomes={expenses}
          categories={categories}
          frequencies={frequencies}
          processData={processExpenseData}
          chartTypes={['categories', 'pie', 'line']}
          onCategorySelect={handleChartCategorySelect}
        />
      </View>
      
      <FlatList
        data={expensesWithAddButton}
        keyExtractor={(item, idx) => item.id ? item.id.toString() : `add-btn-${idx}`}
        renderItem={renderExpenseItem}
        style={styles.expenseList}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>
              {selectedExpense ? 'Edit Expense' : 'Add Expense'}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Expense Name"
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
              selectedValue={formData.category_id}
              style={styles.picker}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
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

            <Picker
              selectedValue={formData.frequency_id}
              style={styles.picker}
              onValueChange={(value) => setFormData({ ...formData, frequency_id: value })}
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
              selectedValue={formData.priority}
              style={styles.picker}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <Picker.Item label="Mínima" value={1} />
              <Picker.Item label="Baixa" value={2} />
              <Picker.Item label="Média" value={3} />
              <Picker.Item label="Alta" value={4} />
              <Picker.Item label="Máxima" value={5} />
            </Picker>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveExpense}
              >
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

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 400 }]}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning" size={32} color="#FF6B6B" />
              <Text style={styles.deleteModalTitle}>Delete Expense</Text>
            </View>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete "{expenseToDelete?.name}"?
            </Text>
            <Text style={styles.deleteModalSubtext}>
              This action cannot be undone.
            </Text>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.deleteButton, { flex: 1, marginRight: 8 }]}
                onPress={handleDeleteExpense}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, { flex: 1 }]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#666666" style={{ marginRight: 8 }} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Management Modal */}
      <Modal visible={isCategoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>
              {selectedCategory ? 'Edit Category' : 'Add Category'}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Category Name"
              value={categoryFormData.name}
              onChangeText={(text) => setCategoryFormData({ name: text })}
            />

            <View style={styles.categoriesList}>
              {categories.map((category) => (
                <View key={category.id} style={styles.categoryItem}>
                  <Text style={styles.categoryItemText}>{category.name}</Text>
                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      style={[styles.actionButtonEdit, { marginRight: 8 }]}
                      onPress={() => handleEditCategory(category)}
                    >
                      <Ionicons name="pencil" size={16} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButtonDelete}
                      onPress={() => confirmDeleteCategory(category)}
                    >
                      <Ionicons name="trash" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveCategory}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setCategoryModalVisible(false);
                  setCategoryFormData({ name: '' });
                  setSelectedCategory(null);
                }}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Category Confirmation Modal */}
      <Modal visible={isDeleteCategoryModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 400 }]}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning" size={32} color="#FF6B6B" />
              <Text style={styles.deleteModalTitle}>Delete Category</Text>
            </View>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete "{categoryToDelete?.name}"?
            </Text>
            <Text style={styles.deleteModalSubtext}>
              This action cannot be undone and will affect all expenses in this category.
            </Text>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.deleteButton, { flex: 1, marginRight: 8 }]}
                onPress={handleDeleteCategory}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, { flex: 1 }]}
                onPress={() => setDeleteCategoryModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#666666" style={{ marginRight: 8 }} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ExpensesPage;
