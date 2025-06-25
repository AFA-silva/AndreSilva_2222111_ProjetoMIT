import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, FlatList, Animated } from 'react-native';
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
import StatisticsUpdater from '../../Utility/StatisticsUpdater';

const ExpensesPage = ({ navigation }) => {
  const [expenses, setExpenses] = useState([]);
  const [originalExpenses, setOriginalExpenses] = useState([]); // Armazenar valores originais
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false); // Modal para exibir itens filtrados
  const [isCategoryFilterVisible, setCategoryFilterVisible] = useState(false);
  const [isManageModalVisible, setManageModalVisible] = useState(false); // New modal for management
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

  // Use filteredExpenses para a lista e se estiver vazia, use expenses
  const expensesToDisplay = filteredExpenses.length > 0 ? filteredExpenses : expenses;
  const expensesWithButtons = [...expensesToDisplay, { isAddButton: true }, { isManageButton: true }];

  // Add state for managing tabs in modal
  const [activeManageTab, setActiveManageTab] = useState('categories');

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategoriesAndFrequencies = async (userId) => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = () => {
    try {
      setSelectedExpense(null);
      setFormData({
        name: '',
        amount: '',
        category_id: '',
        frequency_id: '',
        priority: 3,
      });
      setModalVisible(true);
    } catch (error) {
      console.error('Error in handleAddExpense:', error);
    }
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

      // Update statistics only when adding new expense (not editing)
      if (!selectedExpense) {
        await StatisticsUpdater.incrementExpenses(userId);
        console.log('Statistics updated: expenses count incremented');
      }

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

      // Update statistics when deleting expense
      await StatisticsUpdater.decrementExpenses(userId);
      console.log('Statistics updated: expenses count decremented');

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

  const renderExpenseItem = (item, index) => {
    if (item.isAddButton) {
      return (
        <TouchableOpacity
          key="add-button"
          style={[styles.addButton, { backgroundColor: '#F44336' }]}
          onPress={handleAddExpense}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Expense</Text>
        </TouchableOpacity>
      );
    }

    if (item.isManageButton) {
      return (
        <TouchableOpacity
          key="manage-button"
          style={[styles.addButton, { backgroundColor: '#FF9800' }]}
          onPress={() => setManageModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="settings" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Manage Categories</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View key={item.id || `expense-${index}`} style={styles.expenseItem}>
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

  // Add skeleton component
  const SkeletonLoader = () => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const shimmer = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      shimmer.start();
      return () => shimmer.stop();
    }, []);

    const opacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonContainer}>
        <View style={styles.skeletonChart}>
          <Animated.View style={[styles.skeletonShimmer, { opacity }]} />
        </View>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.skeletonItem}>
            <Animated.View style={[styles.skeletonShimmer, { opacity }]} />
          </View>
        ))}
      </View>
    );
  };

  // Add methods for manage modal actions
  const handleAddCategory = () => {
    // TODO: Implement add category logic
    setAlertMessage('Add category feature coming soon!');
    setAlertType('info');
    setShowAlert(true);
  };

  const handleEditCategory = (category) => {
    // TODO: Implement edit category logic
    setAlertMessage(`Edit category "${category.name}" feature coming soon!`);
    setAlertType('info');
    setShowAlert(true);
  };

  const handleDeleteCategory = (category) => {
    // TODO: Implement delete category logic
    setAlertMessage(`Delete category "${category.name}" feature coming soon!`);
    setAlertType('info');
    setShowAlert(true);
  };

  const handleAddFrequency = () => {
    // TODO: Implement add frequency logic
    setAlertMessage('Add frequency feature coming soon!');
    setAlertType('info');
    setShowAlert(true);
  };

  const handleEditFrequency = (frequency) => {
    // TODO: Implement edit frequency logic
    setAlertMessage(`Edit frequency "${frequency.name}" feature coming soon!`);
    setAlertType('info');
    setShowAlert(true);
  };

  const handleDeleteFrequency = (frequency) => {
    // TODO: Implement delete frequency logic
    setAlertMessage(`Delete frequency "${frequency.name}" feature coming soon!`);
    setAlertType('info');
    setShowAlert(true);
  };

  return (
    <View style={styles.container}>
      {showAlert && <AlertComponent type={alertType} message={alertMessage} onClose={() => setShowAlert(false)} />}

      <Header title="Expenses Management" />

      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <>
          <View style={styles.chartContainer}>
            <Chart
              incomes={expenses}
              categories={categories}
              frequencies={frequencies}
              processData={processExpenseData}
              chartTypes={['Bar', 'Pie']}
              onCategorySelect={handleChartCategorySelect}
            />
          </View>
          
          {/* Se existir um filtro ativo, mostrar botão para limpar */}
          {filteredExpenses.length > 0 && (
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
          )}
          
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {expensesWithButtons.map((item, index) => renderExpenseItem(item, index))}
          </ScrollView>
        </>
        )}

      {/* Add/Edit Modal - Fixed */}
      {modalVisible && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onPress={() => setModalVisible(false)}
            activeOpacity={1}
          />
          <View
            style={{
              width: '90%',
              maxWidth: 350,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              maxHeight: '80%',
              alignSelf: 'center',
            }}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#F44336',
                marginBottom: 16,
                textAlign: 'center',
              }}>
                {selectedExpense ? 'Edit Expense' : 'Add Expense'}
              </Text>

              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#C62828',
                marginBottom: 4,
              }}>Expense Name</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#FFCDD2',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  backgroundColor: '#FFFFFF',
                  fontSize: 16,
                  color: '#C62828',
                  minHeight: 44,
                }}
                placeholder="Enter expense name"
                placeholderTextColor="#B0BEC5"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#C62828',
                marginBottom: 4,
              }}>Amount</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#FFCDD2',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  backgroundColor: '#FFFFFF',
                  fontSize: 16,
                  color: '#C62828',
                  minHeight: 44,
                }}
                placeholder="Enter amount"
                placeholderTextColor="#B0BEC5"
                keyboardType="numeric"
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
              />

              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#C62828',
                marginBottom: 4,
              }}>Category</Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#FFCDD2',
                borderRadius: 8,
                marginBottom: 12,
                backgroundColor: '#FFFFFF',
                minHeight: 44,
              }}>
                <Picker
                  selectedValue={formData.category_id}
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
              </View>

              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#C62828',
                marginBottom: 4,
              }}>Frequency</Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#FFCDD2',
                borderRadius: 8,
                marginBottom: 12,
                backgroundColor: '#FFFFFF',
                minHeight: 44,
              }}>
                <Picker
                  selectedValue={formData.frequency_id}
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
              </View>

              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#C62828',
                marginBottom: 4,
              }}>Priority</Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#FFCDD2',
                borderRadius: 8,
                marginBottom: 16,
                backgroundColor: '#FFFFFF',
                minHeight: 44,
              }}>
                <Picker
                  selectedValue={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <Picker.Item label="Minimum" value={1} />
                  <Picker.Item label="Low" value={2} />
                  <Picker.Item label="Medium" value={3} />
                  <Picker.Item label="High" value={4} />
                  <Picker.Item label="Maximum" value={5} />
                </Picker>
              </View>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#E0E0E0',
                    padding: 16,
                    borderRadius: 8,
                    alignItems: 'center',
                    minHeight: 48,
                    justifyContent: 'center',
                  }}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    color: '#616161',
                    fontWeight: '600',
                    fontSize: 16,
                  }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#F44336',
                    padding: 16,
                    borderRadius: 8,
                    alignItems: 'center',
                    minHeight: 48,
                    justifyContent: 'center',
                  }}
                  onPress={handleSaveExpense}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontWeight: '600',
                    fontSize: 16,
                  }}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Delete Confirmation Modal - Fixed */}
      {deleteModalVisible && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          activeOpacity={1}
          onPress={() => setDeleteModalVisible(false)}
        >
          <TouchableOpacity
            style={{
              width: '90%',
              maxWidth: 350,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              alignSelf: 'center',
            }}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              gap: 12,
            }}>
              <Ionicons name="warning" size={32} color="#FF6B6B" />
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#F44336',
                letterSpacing: 0.5,
              }}>Delete Expense</Text>
            </View>
            <Text style={{
              fontSize: 16,
              color: '#C62828',
              textAlign: 'center',
              marginBottom: 8,
              letterSpacing: 0.3,
            }}>
              Are you sure you want to delete "{expenseToDelete?.name}"?
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#E57373',
              textAlign: 'center',
              marginBottom: 20,
              letterSpacing: 0.2,
            }}>
              This action cannot be undone.
            </Text>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#F44336',
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  minHeight: 48,
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
                onPress={handleDeleteExpense}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 16,
                  letterSpacing: 0.5,
                }}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#FFCDD2',
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  minHeight: 48,
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
                onPress={() => setDeleteModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#C62828" style={{ marginRight: 8 }} />
                <Text style={{
                  color: '#C62828',
                  fontWeight: '600',
                  fontSize: 16,
                  letterSpacing: 0.5,
                }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Management Modal with Tabs - Fixed */}
      {isManageModalVisible && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          activeOpacity={1}
          onPress={() => setManageModalVisible(false)}
        >
          <TouchableOpacity
            style={{
              width: '90%',
              maxWidth: 400,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              maxHeight: '80%',
              alignSelf: 'center',
            }}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#F44336',
              marginBottom: 16,
              textAlign: 'center',
              letterSpacing: 0.5,
            }}>Manage Settings</Text>
            
            {/* Tab Selection */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: '#FFEBEE',
              borderRadius: 8,
              padding: 4,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#FFCDD2',
            }}>
              <TouchableOpacity 
                style={[
                  {
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 6,
                    alignItems: 'center',
                  },
                  activeManageTab === 'categories' && {
                    backgroundColor: '#F44336',
                  }
                ]}
                onPress={() => setActiveManageTab('categories')}
                activeOpacity={0.7}
              >
                <Text style={[
                  {
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#D32F2F',
                  },
                  activeManageTab === 'categories' && {
                    color: '#FFFFFF',
                    fontWeight: '700',
                  }
                ]}>
                  Categories
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  {
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 6,
                    alignItems: 'center',
                  },
                  activeManageTab === 'frequencies' && {
                    backgroundColor: '#F44336',
                  }
                ]}
                onPress={() => setActiveManageTab('frequencies')}
                activeOpacity={0.7}
              >
                <Text style={[
                  {
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#D32F2F',
                  },
                  activeManageTab === 'frequencies' && {
                    color: '#FFFFFF',
                    fontWeight: '700',
                  }
                ]}>
                  Frequencies
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={{ maxHeight: 200 }} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Categories Section */}
              {activeManageTab === 'categories' && (
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#C62828',
                    marginBottom: 12,
                    letterSpacing: 0.3,
                  }}>Expense Categories</Text>
                  {categories.map((category) => (
                    <View key={category.id} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#FFEBEE',
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: '#FFCDD2',
                    }}>
                      <Text style={{
                        fontSize: 14,
                        color: '#D32F2F',
                        fontWeight: '500',
                        flex: 1,
                      }}>{category.name}</Text>
                      <View style={{
                        flexDirection: 'row',
                        gap: 8,
                      }}>
                        <TouchableOpacity 
                          style={{
                            padding: 8,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FF9800',
                          }}
                          onPress={() => handleEditCategory(category)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="pencil" size={14} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={{
                            padding: 8,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#F44336',
                          }}
                          onPress={() => handleDeleteCategory(category)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity 
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#F44336',
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                    onPress={handleAddCategory}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={{
                      color: '#FFFFFF',
                      fontWeight: '600',
                      fontSize: 14,
                      marginLeft: 6,
                    }}>Add Category</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Frequencies Section */}
              {activeManageTab === 'frequencies' && (
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#C62828',
                    marginBottom: 12,
                    letterSpacing: 0.3,
                  }}>Frequencies</Text>
                  {frequencies.map((frequency) => (
                    <View key={frequency.id} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#FFEBEE',
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: '#FFCDD2',
                    }}>
                      <Text style={{
                        fontSize: 14,
                        color: '#D32F2F',
                        fontWeight: '500',
                        flex: 1,
                      }}>{frequency.name} ({frequency.days} days)</Text>
                      <View style={{
                        flexDirection: 'row',
                        gap: 8,
                      }}>
                        <TouchableOpacity 
                          style={{
                            padding: 8,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FF9800',
                          }}
                          onPress={() => handleEditFrequency(frequency)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="pencil" size={14} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={{
                            padding: 8,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#F44336',
                          }}
                          onPress={() => handleDeleteFrequency(frequency)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity 
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#F44336',
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                    onPress={handleAddFrequency}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={{
                      color: '#FFFFFF',
                      fontWeight: '600',
                      fontSize: 14,
                      marginLeft: 6,
                    }}>Add Frequency</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 16,
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#F44336',
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  minHeight: 44,
                  justifyContent: 'center',
                }}
                onPress={() => setManageModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 14,
                }}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ExpensesPage;
