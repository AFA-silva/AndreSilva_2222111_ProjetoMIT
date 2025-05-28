import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, FlatList, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../Styles/Manage/ExpensesPageStyle';
import { supabase } from '../../../Supabase';
import AlertComponent from '../../Utility/Alerts';
import { useFocusEffect } from '@react-navigation/native';
import Chart from '../../Utility/Chart';
import { formatCurrency, getCurrentCurrency, addCurrencyChangeListener, removeCurrencyChangeListener, shouldConvertCurrencyValues } from '../../Utility/FetchCountries';
import { convertValueToCurrentCurrency } from '../../Utility/CurrencyConverter';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [originalExpenses, setOriginalExpenses] = useState([]); // Armazenar valores originais
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
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

  const expensesWithAddButton = [...expenses, { isAddButton: true }];

  // Carregar a moeda original salva do usuário
  const loadOriginalCurrency = async () => {
    try {
      const savedCurrency = await AsyncStorage.getItem('original_app_currency');
      if (savedCurrency) {
        console.log('[ExpensesPage] Moeda original carregada:', savedCurrency);
        setOriginalCurrency(savedCurrency);
        return savedCurrency;
      } else {
        // Se não tiver sido salva ainda, salvar a moeda atual como original
        const currentCurrency = getCurrentCurrency();
        console.log('[ExpensesPage] Definindo moeda original:', currentCurrency.code);
        await AsyncStorage.setItem('original_app_currency', currentCurrency.code);
        setOriginalCurrency(currentCurrency.code);
        return currentCurrency.code;
      }
    } catch (error) {
      console.error('[ExpensesPage] Erro ao carregar moeda original:', error);
      // Usar EUR como fallback se houver erro
      setOriginalCurrency('EUR');
      return 'EUR';
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
      await loadOriginalCurrency(); // Carregar a moeda original
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
      
      // Forçar atualização de valor no AsyncStorage para debugging
      await AsyncStorage.setItem('original_app_currency', sourceCurrency);
      
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
      
      // Obter a moeda original para usar na conversão
      const origCurrency = await loadOriginalCurrency();
      
      // Converter para a moeda atual
      await convertExpensesToCurrentCurrency(data || [], origCurrency);
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
    const priorityMap = {
      1: { name: 'Mínima', total: 0, color: '#4CAF50' },
      2: { name: 'Baixa', total: 0, color: '#8BC34A' },
      3: { name: 'Média', total: 0, color: '#FFD700' },
      4: { name: 'Alta', total: 0, color: '#FF9800' },
      5: { name: 'Máxima', total: 0, color: '#F44336' },
    };
    const statusMap = {
      paid: { name: 'Paid', total: 0, color: '#4CAF50' },
      pending: { name: 'Pending', total: 0, color: '#FFA726' },
    };

    // Initialize categories
    categories.forEach(category => {
      categoryMap[category.id] = {
        name: category.name,
        total: 0
      };
    });

    const today = new Date();
    expenseData.forEach(expense => {
      const { category_id, amount, priority, frequency_id, frequencies, status = 'pending' } = expense;
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

      // Process Priority Data
      if (priority && priorityMap[priority]) {
        priorityMap[priority].total += convertedAmount;
      }

      // Process Status Data
      statusMap[status].total += convertedAmount;
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

    // Convert priority data for chart
    const totalPriorityAmount = Object.values(priorityMap).reduce((sum, pri) => sum + pri.total, 0);
    const priorityData = Object.values(priorityMap)
      .filter(pri => pri.total > 0)
      .map(pri => ({
        name: `${pri.name} (${Math.round((pri.total / totalPriorityAmount) * 100)}%)`,
        amount: Math.round(pri.total * 100) / 100,
        color: pri.color,
        legendFontColor: '#333333',
        legendFontSize: 12,
      }));

    // Convert status data for chart
    const totalStatusAmount = Object.values(statusMap).reduce((sum, stat) => sum + stat.total, 0);
    const statusData = Object.values(statusMap)
      .filter(stat => stat.total > 0)
      .map(stat => ({
        name: `${stat.name} (${Math.round((stat.total / totalStatusAmount) * 100)}%)`,
        amount: Math.round(stat.total * 100) / 100,
        color: stat.color,
        legendFontColor: '#333333',
        legendFontSize: 12,
      }));

    return {
      categoryData,
      priorityData,
      statusData
    };
  };

  // Renderizar conteúdo principal da página
  const renderContent = (props) => {
    const { 
      expenses, 
      categories, 
      selectedPeriod, 
      setSelectedPeriod, 
      handleAddCategory, 
      chartRenderKey,
      handleAddExpense,
      renderExpenseItem,
      expensesWithAddButton,
      showAlert,
      alertType,
      alertMessage,
      setShowAlert
    } = props;
    
    // Processar dados para o gráfico
    const expenseSummaryData = processExpenseData(expenses, selectedPeriod);
    const hasExpenses = expenses && expenses.length > 0;
    
    return (
      <>
        {/* Seção superior com gráfico */}
        <View style={styles.chartContainer}>
          <View style={styles.periodSelector}>
            <TouchableOpacity
              style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod('week')}>
              <Text style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod('month')}>
              <Text style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, selectedPeriod === 'year' && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod('year')}>
              <Text style={[styles.periodText, selectedPeriod === 'year' && styles.periodTextActive]}>Yearly</Text>
            </TouchableOpacity>
          </View>

          {hasExpenses ? (
            <Chart 
              key={`chart-${chartRenderKey}`}
              data={expenseSummaryData}
              width={350}
              height={220}
              chartType="pie"
            />
          ) : (
            <View style={styles.emptyChartContainer}>
              <Ionicons name="pie-chart" size={80} color="#e0e0e0" />
              <Text style={styles.emptyChartText}>No expense data to display</Text>
            </View>
          )}
          
          {/* Seção de categorias */}
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Category</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista de despesas */}
        <View style={styles.expensesContainer}>
          <Text style={styles.sectionTitle}>My Expenses</Text>
          <FlatList
            data={expensesWithAddButton}
            renderItem={renderExpenseItem}
            keyExtractor={(item, index) => item.id ? `expense-${item.id}` : `add-button-${index}`}
            style={styles.expensesList}
            nestedScrollEnabled={true}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        </View>
        
        {/* Alert Component */}
        {showAlert && (
          <AlertComponent 
            type={alertType} 
            message={alertMessage} 
            onClose={() => setShowAlert(false)} 
          />
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Expenses Manager</Text>
      </View>
      
      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => renderContent({
          expenses, 
          categories, 
          selectedPeriod, 
          setSelectedPeriod: (period) => setSelectedPeriod(period), 
          handleAddCategory: () => setCategoryModalVisible(true), 
          chartRenderKey,
          handleAddExpense,
          renderExpenseItem,
          expensesWithAddButton,
          showAlert,
          alertType,
          alertMessage,
          setShowAlert
        })}
        keyExtractor={item => item.key}
        style={styles.mainContainer}
      />
      
      {/* Modais existentes */}
      {/* ... código dos modais ... */}
    </SafeAreaView>
  );
};

export default ExpensesPage;
