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
import { incrementExpensesCreated } from '../../Utility/StatisticsService';


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

  // Add state for managing tabs in modal
  const [activeManageTab, setActiveManageTab] = useState('categories');

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  // Estados para modais de categoria/frequência
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState('add'); // 'add' or 'edit'
  const [frequencyModalMode, setFrequencyModalMode] = useState('add'); // 'add' or 'edit'
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingFrequency, setEditingFrequency] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '' });
  const [frequencyFormData, setFrequencyFormData] = useState({ name: '', days: '' });
  
  // Estados para modais de exclusão
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [showDeleteFrequencyModal, setShowDeleteFrequencyModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [frequencyToDelete, setFrequencyToDelete] = useState(null);

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

  // Get user currency directly from database
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
      
              console.log('[ExpensesPage] Currency loaded directly from database:', data.actual_currency);
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
        await incrementExpensesCreated(userId);
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

  const renderExpenseCard = (item, index) => {
    // Renderiza apenas cards de despesa, não botões
    const isHighlighted = selectedCategoryId === item.category_id;

    return (
      <View 
        key={item.id || `expense-${index}`}
        style={[
          beautifulStyles.expenseCard, 
          isHighlighted && beautifulStyles.highlightedCard
        ]}
      >
        {/* Header Row */}
        <View style={beautifulStyles.cardHeader}>
          <View style={beautifulStyles.cardHeaderLeft}>
            <View style={[beautifulStyles.expenseIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="trending-down" size={18} color="#2196F3" />
            </View>
            <View>
              <Text style={[beautifulStyles.expenseTitle, { color: '#000000' }]}>{item.name}</Text>
              <Text style={beautifulStyles.expenseAmount}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          </View>
          <View style={beautifulStyles.actionButtons}>
            <TouchableOpacity
              style={beautifulStyles.editButton}
              onPress={() => {
                console.log('Edit button clicked for:', item.name);
                handleEditExpense(item);
              }}
            >
              <Ionicons name="pencil" size={14} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={beautifulStyles.deleteButton}
              onPress={() => {
                console.log('Delete button clicked for:', item.name);
                confirmDeleteExpense(item);
              }}
            >
              <Ionicons name="trash" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tags and Priority Row */}
        <View style={beautifulStyles.tagsRow}>
          {item.categories && (
            <View style={[
              beautifulStyles.categoryTag,
              isHighlighted && beautifulStyles.highlightedTag
            ]}>
              <Text style={[
                beautifulStyles.tagText,
                isHighlighted && beautifulStyles.highlightedTagText
              ]}>
                {item.categories.name}
              </Text>
            </View>
          )}
          {item.frequencies && (
            <View style={beautifulStyles.frequencyTag}>
              <Ionicons name="time" size={12} color="#2196F3" />
              <Text style={beautifulStyles.frequencyText}>
                {item.frequencies.name}
              </Text>
            </View>
          )}
        </View>

        {/* Priority Label */}
        <View style={beautifulStyles.priorityRow}>
          <Text style={beautifulStyles.priorityText}>
            Priority: {getPriorityLabel(item.priority)}
          </Text>
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

  // Management functions
  const handleAddCategory = () => {
    setCategoryModalMode('add');
    setCategoryFormData({ name: '' });
    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  const createExpenseCategory = async (categoryName) => {
    try {

      // Check if category already exists for this user
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('name')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .eq('name', categoryName);

      if (existingCategories && existingCategories.length > 0) {
        setAlertMessage('Category with this name already exists');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      // Create new category
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: categoryName,
          type: 'expense',
          user_id: userId
        }])
        .select();

      if (error) {
        console.error('Error creating category:', error);
        setAlertMessage('Failed to create category');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      setAlertMessage('Category created successfully!');
      setAlertType('success');
      setShowAlert(true);
      
      // Refresh categories list
      fetchCategoriesAndFrequencies(userId);
    } catch (error) {
      console.error('Unexpected error creating category:', error);
      setAlertMessage('Unexpected error occurred');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const handleEditCategory = (category) => {
    setCategoryModalMode('edit');
    setCategoryFormData({ name: category.name });
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const updateExpenseCategory = async (category, newCategoryName) => {
    try {

      // Check if the new name already exists for this user (excluding current category)
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('name')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .eq('name', newCategoryName)
        .neq('id', category.id);

      if (existingCategories && existingCategories.length > 0) {
        setAlertMessage('Category with this name already exists');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      // Update category
      const { error } = await supabase
        .from('categories')
        .update({ name: newCategoryName })
        .eq('id', category.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating category:', error);
        setAlertMessage('Failed to update category');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      setAlertMessage('Category updated successfully!');
      setAlertType('success');
      setShowAlert(true);
      
      // Refresh categories list
      fetchCategoriesAndFrequencies(userId);
    } catch (error) {
      console.error('Unexpected error updating category:', error);
      setAlertMessage('Unexpected error occurred');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const handleDeleteCategory = async (category) => {
    try {
      setCategoryToDelete(category);
      setShowDeleteCategoryModal(true);
    } catch (error) {
      console.error('Unexpected error deleting category:', error);
      setAlertMessage('Unexpected error occurred');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const deleteExpenseCategory = async (category) => {
    try {

      // Check if category is being used by any expenses
      const { data: expensesUsingCategory } = await supabase
        .from('expenses')
        .select('id')
        .eq('category_id', category.id)
        .eq('user_id', userId);

      if (expensesUsingCategory && expensesUsingCategory.length > 0) {
        setAlertMessage(`Cannot delete category "${category.name}" because it is being used by ${expensesUsingCategory.length} expense(s). Please update or delete those expenses first.`);
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      // Delete category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting category:', error);
        setAlertMessage('Failed to delete category');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      setAlertMessage('Category deleted successfully!');
      setAlertType('success');
      setShowAlert(true);
      
      // Refresh categories list
      fetchCategoriesAndFrequencies(userId);
    } catch (error) {
      console.error('Unexpected error deleting category:', error);
      setAlertMessage('Unexpected error occurred');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const handleAddFrequency = () => {
    setFrequencyModalMode('add');
    setFrequencyFormData({ name: '', days: '' });
    setEditingFrequency(null);
    setShowFrequencyModal(true);
  };

  const createExpenseFrequency = async (frequencyName, days) => {
    try {

      // Check if frequency already exists for this user
      const { data: existingFrequencies } = await supabase
        .from('frequencies')
        .select('name')
        .eq('user_id', userId)
        .eq('name', frequencyName.trim());

      if (existingFrequencies && existingFrequencies.length > 0) {
        setAlertMessage('Frequency with this name already exists');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      // Create new frequency
      const { data, error } = await supabase
        .from('frequencies')
        .insert([{
          name: frequencyName.trim(),
          days: days,
          user_id: userId
        }])
        .select();

      if (error) {
        console.error('Error creating frequency:', error);
        setAlertMessage('Failed to create frequency');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      setAlertMessage('Frequency created successfully!');
      setAlertType('success');
      setShowAlert(true);
      
      // Refresh frequencies list
      fetchCategoriesAndFrequencies(userId);
    } catch (error) {
      console.error('Unexpected error creating frequency:', error);
      setAlertMessage('Unexpected error occurred');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const handleEditFrequency = (frequency) => {
    setFrequencyModalMode('edit');
    setFrequencyFormData({ name: frequency.name, days: frequency.days.toString() });
    setEditingFrequency(frequency);
    setShowFrequencyModal(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (!categoryFormData.name || categoryFormData.name.trim() === '') {
        setAlertMessage('Category name cannot be empty');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      if (categoryModalMode === 'add') {
        await createExpenseCategory(categoryFormData.name.trim());
      } else {
        await updateExpenseCategory(editingCategory, categoryFormData.name.trim());
      }
      
      setShowCategoryModal(false);
    } catch (error) {
      console.error('Error saving category:', error);
      setAlertMessage('Failed to save category');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const handleSaveFrequency = async () => {
    try {
      if (!frequencyFormData.name || frequencyFormData.name.trim() === '') {
        setAlertMessage('Frequency name cannot be empty');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      const days = parseInt(frequencyFormData.days);
      if (!frequencyFormData.days || isNaN(days) || days <= 0) {
        setAlertMessage('Please enter a valid number of days (greater than 0)');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      if (frequencyModalMode === 'add') {
        await createExpenseFrequency(frequencyFormData.name.trim(), days);
      } else {
        await updateExpenseFrequency(editingFrequency, frequencyFormData.name.trim(), days);
      }
      
      setShowFrequencyModal(false);
    } catch (error) {
      console.error('Error saving frequency:', error);
      setAlertMessage('Failed to save frequency');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const updateExpenseFrequency = async (frequency, newFrequencyName, days) => {
    try {

      // Check if the new name already exists for this user (excluding current frequency)
      const { data: existingFrequencies } = await supabase
        .from('frequencies')
        .select('name')
        .eq('user_id', userId)
        .eq('name', newFrequencyName)
        .neq('id', frequency.id);

      if (existingFrequencies && existingFrequencies.length > 0) {
        setAlertMessage('Frequency with this name already exists');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      // Update frequency
      const { error } = await supabase
        .from('frequencies')
        .update({ 
          name: newFrequencyName,
          days: days
        })
        .eq('id', frequency.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating frequency:', error);
        setAlertMessage('Failed to update frequency');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      setAlertMessage('Frequency updated successfully!');
      setAlertType('success');
      setShowAlert(true);
      
      // Refresh frequencies list
      fetchCategoriesAndFrequencies(userId);
    } catch (error) {
      console.error('Unexpected error updating frequency:', error);
      setAlertMessage('Unexpected error occurred');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const handleDeleteFrequency = async (frequency) => {
    try {
      setFrequencyToDelete(frequency);
      setShowDeleteFrequencyModal(true);
    } catch (error) {
      console.error('Unexpected error deleting frequency:', error);
      setAlertMessage('Unexpected error occurred');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const deleteExpenseFrequency = async (frequency) => {
    try {

      // Check if frequency is being used by any expenses
      const { data: expensesUsingFrequency } = await supabase
        .from('expenses')
        .select('id')
        .eq('frequency_id', frequency.id)
        .eq('user_id', userId);

      if (expensesUsingFrequency && expensesUsingFrequency.length > 0) {
        setAlertMessage(`Cannot delete frequency "${frequency.name}" because it is being used by ${expensesUsingFrequency.length} expense(s). Please update or delete those expenses first.`);
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      // Delete frequency
      const { error } = await supabase
        .from('frequencies')
        .delete()
        .eq('id', frequency.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting frequency:', error);
        setAlertMessage('Failed to delete frequency');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      setAlertMessage('Frequency deleted successfully!');
      setAlertType('success');
      setShowAlert(true);
      
      // Refresh frequencies list
      fetchCategoriesAndFrequencies(userId);
    } catch (error) {
      console.error('Unexpected error deleting frequency:', error);
      setAlertMessage('Unexpected error occurred');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  return (
    <View style={styles.container}>
      {showAlert && <AlertComponent type={alertType} message={alertMessage} onClose={() => setShowAlert(false)} />}

      <Header title="Expenses Management" />

      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <ScrollView 
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={beautifulStyles.pageScrollContent}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Section Header */}
          <View style={beautifulStyles.sectionHeader}>
            <Text style={beautifulStyles.sectionTitle}>Your Expenses</Text>
            <Text style={beautifulStyles.sectionSubtitle}>
              {filteredExpenses.length > 0 ? `${filteredExpenses.length} filtered` : `${expenses.length} total`}
            </Text>
          </View>

          {/* Expense Cards - renderizados diretamente no scroll principal */}
          {expensesToDisplay.map((item, index) => renderExpenseCard(item, index))}
          
          {/* Add Button - sempre renderizado */}
          <TouchableOpacity
            style={beautifulStyles.addButton}
            onPress={handleAddExpense}
            activeOpacity={0.8}
          >
            <View style={beautifulStyles.addButtonContent}>
              <View style={beautifulStyles.addButtonIcon}>
                <Ionicons name="add" size={24} color="#F44336" />
              </View>
              <View style={beautifulStyles.addButtonTextContainer}>
                <Text style={beautifulStyles.addButtonText}>Add New Expense</Text>
                <Text style={beautifulStyles.addButtonSubtext}>Track your expenses</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#F44336" />
            </View>
          </TouchableOpacity>

          {/* Manage Button */}
          <TouchableOpacity
            style={beautifulStyles.manageButton}
            onPress={() => setManageModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={beautifulStyles.manageButtonContent}>
              <View style={beautifulStyles.manageButtonIcon}>
                <Ionicons name="settings" size={24} color="#F44336" />
              </View>
              <View style={beautifulStyles.manageButtonTextContainer}>
                <Text style={beautifulStyles.manageButtonText}>Manage Extra</Text>
                <Text style={beautifulStyles.manageButtonSubtext}>Add or edit categories & frequencies</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#F44336" />
            </View>
          </TouchableOpacity>
          
          {/* Empty State */}
          {expenses.length === 0 && (
            <View style={beautifulStyles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color="#FFCDD2" />
              <Text style={beautifulStyles.emptyTitle}>No Expenses Yet</Text>
              <Text style={beautifulStyles.emptySubtitle}>
                Start by adding your first expense to track your spending
              </Text>
            </View>
          )}
        </ScrollView>
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
                color: '#000000',
                marginBottom: 16,
                textAlign: 'center',
              }}>
                {selectedExpense ? 'Edit Expense' : 'Add Expense'}
              </Text>

              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#000000',
                marginBottom: 4,
              }}>Expense Name</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#F44336',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  backgroundColor: '#FFFFFF',
                  fontSize: 16,
                  color: '#000000',
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
                color: '#000000',
                marginBottom: 4,
              }}>Amount</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#F44336',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  backgroundColor: '#FFFFFF',
                  fontSize: 16,
                  color: '#000000',
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
                color: '#000000',
                marginBottom: 4,
              }}>Category</Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#F44336',
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
                color: '#000000',
                marginBottom: 4,
              }}>Frequency</Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#F44336',
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
                color: '#000000',
                marginBottom: 4,
              }}>Priority</Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#F44336',
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
                    backgroundColor: '#F44336',
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
                    color: '#FFFFFF',
                    fontWeight: '600',
                    fontSize: 16,
                  }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#4CAF50',
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
                color: '#000000',
                letterSpacing: 0.5,
              }}>Delete Expense</Text>
            </View>
            <Text style={{
              fontSize: 16,
              color: '#000000',
              textAlign: 'center',
              marginBottom: 8,
              letterSpacing: 0.3,
            }}>
              Are you sure you want to delete "{expenseToDelete?.name}"?
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#E65100',
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
                  backgroundColor: '#4CAF50',
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
                <Ionicons name="close" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{
                  color: '#FFFFFF',
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
              maxHeight: '85%',
              alignSelf: 'center',
              flex: 1,
              marginVertical: 40,
            }}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#000000',
                flex: 1,
                textAlign: 'center',
                letterSpacing: 0.5,
              }}>Manage Extra</Text>
              <TouchableOpacity
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#F5F5F5',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => setManageModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#666666" />
              </TouchableOpacity>
            </View>
            
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
              style={{ flex: 1 }} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {/* Categories Section */}
              {activeManageTab === 'categories' && (
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: 12,
                    letterSpacing: 0.3,
                  }}>Expense Categories</Text>
                  
                  <ScrollView 
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {categories.filter(category => category.user_id === userId).length === 0 ? (
                      <View style={{
                        padding: 20,
                        alignItems: 'center',
                        backgroundColor: '#FFEBEE',
                        borderRadius: 8,
                        marginBottom: 12,
                      }}>
                        <Text style={{
                          fontSize: 14,
                          color: '#D32F2F',
                          textAlign: 'center',
                          fontStyle: 'italic',
                        }}>No custom categories yet. Add your first one!</Text>
                      </View>
                    ) : categories.filter(category => category.user_id === userId).map((category) => (
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
                  </ScrollView>
                </View>
              )}

              {/* Frequencies Section */}
              {activeManageTab === 'frequencies' && (
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: 12,
                    letterSpacing: 0.3,
                  }}>Frequencies</Text>
                  
                  <ScrollView 
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {frequencies.filter(frequency => frequency.user_id === userId).length === 0 ? (
                      <View style={{
                        padding: 20,
                        alignItems: 'center',
                        backgroundColor: '#FFEBEE',
                        borderRadius: 8,
                        marginBottom: 12,
                      }}>
                        <Text style={{
                          fontSize: 14,
                          color: '#D32F2F',
                          textAlign: 'center',
                          fontStyle: 'italic',
                        }}>No custom frequencies yet. Add your first one!</Text>
                      </View>
                    ) : frequencies.filter(frequency => frequency.user_id === userId).map((frequency) => (
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
                  </ScrollView>
                </View>
              )}
            </ScrollView>
            
            {/* Add Button at Bottom */}
            <View style={{
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#F0F0F0',
            }}>
              {activeManageTab === 'categories' && (
                <TouchableOpacity 
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F44336',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                  }}
                  onPress={handleAddCategory}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={{
                    color: '#FFFFFF',
                    fontWeight: '600',
                    fontSize: 14,
                  }}>Add New Category</Text>
                </TouchableOpacity>
              )}
              
              {activeManageTab === 'frequencies' && (
                <TouchableOpacity 
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F44336',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                  }}
                  onPress={handleAddFrequency}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={{
                    color: '#FFFFFF',
                    fontWeight: '600',
                    fontSize: 14,
                  }}>Add New Frequency</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
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
            onPress={() => setShowCategoryModal(false)}
            activeOpacity={1}
          />
          <View
            style={{
              width: '90%',
              maxWidth: 350,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              alignSelf: 'center',
            }}
          >
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#F44336',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              {categoryModalMode === 'add' ? 'Add Category' : 'Edit Category'}
            </Text>

            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#000000',
              marginBottom: 4,
            }}>Category Name</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#F44336',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                backgroundColor: '#FFFFFF',
                fontSize: 16,
                color: '#000000',
                minHeight: 44,
              }}
              placeholder="Enter category name"
              placeholderTextColor="#B0BEC5"
              value={categoryFormData.name}
              onChangeText={(text) => setCategoryFormData({ ...categoryFormData, name: text })}
              autoFocus={true}
            />

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
                onPress={() => setShowCategoryModal(false)}
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
                onPress={handleSaveCategory}
                activeOpacity={0.7}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 16,
                }}>{categoryModalMode === 'add' ? 'Add' : 'Update'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Frequency Modal */}
      {showFrequencyModal && (
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
            onPress={() => setShowFrequencyModal(false)}
            activeOpacity={1}
          />
          <View
            style={{
              width: '90%',
              maxWidth: 350,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              alignSelf: 'center',
            }}
          >
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#F44336',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              {frequencyModalMode === 'add' ? 'Add Frequency' : 'Edit Frequency'}
            </Text>

            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#000000',
              marginBottom: 4,
            }}>Frequency Name</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#F44336',
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
                backgroundColor: '#FFFFFF',
                fontSize: 16,
                color: '#000000',
                minHeight: 44,
              }}
              placeholder="e.g., Bi-weekly, Quarterly"
              placeholderTextColor="#B0BEC5"
              value={frequencyFormData.name}
              onChangeText={(text) => setFrequencyFormData({ ...frequencyFormData, name: text })}
              autoFocus={true}
            />

            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#000000',
              marginBottom: 4,
            }}>Days</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#F44336',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                backgroundColor: '#FFFFFF',
                fontSize: 16,
                color: '#000000',
                minHeight: 44,
              }}
              placeholder="Enter number of days"
              placeholderTextColor="#B0BEC5"
              keyboardType="numeric"
              value={frequencyFormData.days}
              onChangeText={(text) => setFrequencyFormData({ ...frequencyFormData, days: text })}
            />

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
                onPress={() => setShowFrequencyModal(false)}
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
                onPress={handleSaveFrequency}
                activeOpacity={0.7}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 16,
                }}>{frequencyModalMode === 'add' ? 'Add' : 'Update'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Delete Category Modal */}
      {showDeleteCategoryModal && (
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
          onPress={() => setShowDeleteCategoryModal(false)}
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
                color: '#000000',
                letterSpacing: 0.5,
              }}>Delete Category</Text>
            </View>
            <Text style={{
              fontSize: 16,
              color: '#000000',
              textAlign: 'center',
              marginBottom: 8,
              letterSpacing: 0.3,
            }}>
              Are you sure you want to delete the category "{categoryToDelete?.name}"?
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#E65100',
              textAlign: 'center',
              marginBottom: 20,
              letterSpacing: 0.2,
            }}>
              This action cannot be undone and may affect existing expenses using this category.
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
                onPress={async () => {
                  await deleteExpenseCategory(categoryToDelete);
                  setShowDeleteCategoryModal(false);
                }}
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
                  backgroundColor: '#4CAF50',
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  minHeight: 48,
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
                onPress={() => setShowDeleteCategoryModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 16,
                  letterSpacing: 0.5,
                }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Delete Frequency Modal */}
      {showDeleteFrequencyModal && (
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
          onPress={() => setShowDeleteFrequencyModal(false)}
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
                color: '#000000',
                letterSpacing: 0.5,
              }}>Delete Frequency</Text>
            </View>
            <Text style={{
              fontSize: 16,
              color: '#000000',
              textAlign: 'center',
              marginBottom: 8,
              letterSpacing: 0.3,
            }}>
              Are you sure you want to delete the frequency "{frequencyToDelete?.name}"?
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#E65100',
              textAlign: 'center',
              marginBottom: 20,
              letterSpacing: 0.2,
            }}>
              This action cannot be undone and may affect existing expenses using this frequency.
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
                onPress={async () => {
                  await deleteExpenseFrequency(frequencyToDelete);
                  setShowDeleteFrequencyModal(false);
                }}
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
                  backgroundColor: '#4CAF50',
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  minHeight: 48,
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
                onPress={() => setShowDeleteFrequencyModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 16,
                  letterSpacing: 0.5,
                }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Beautiful styles for visual elements (expenses theme)
const beautifulStyles = {
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#E57373',
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#FFCDD2',
    marginHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#E57373',
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  pageScrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#E57373',
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(244, 67, 54, 0.3)',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  addButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addButtonTextContainer: {
    flex: 1,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    letterSpacing: 0.2,
  },
  addButtonSubtext: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  manageButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(244, 67, 54, 0.3)',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  manageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  manageButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  manageButtonTextContainer: {
    flex: 1,
  },
  manageButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    letterSpacing: 0.2,
  },
  manageButtonSubtext: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  highlightedCard: {
    borderLeftColor: '#C62828',
    backgroundColor: '#FFEBEE',
    shadowOpacity: 0.2,
    elevation: 6,
    transform: [{scale: 1.02}],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseIcon: {
    backgroundColor: '#FFCDD2',
    borderRadius: 10,
    padding: 8,
    marginRight: 12,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 2,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryTag: {
    backgroundColor: '#FFCDD2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  highlightedTag: {
    backgroundColor: '#F44336',
  },
  frequencyTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C62828',
  },
  highlightedTagText: {
    color: '#FFFFFF',
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  priorityRow: {
    marginTop: 8,
  },
  priorityText: {
    fontSize: 12,
    color: '#E57373',
    fontWeight: '500',
  },
};

export default ExpensesPage;
