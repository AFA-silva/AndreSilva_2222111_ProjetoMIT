import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../Styles/Manage/ExpensesPageStyle';
import { supabase } from '../../../Supabase';
import AlertComponent from '../../Utility/Alerts';
import { useFocusEffect } from '@react-navigation/native';
import Chart from '../../Utility/Chart';

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
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

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
        return;
      }
      setUserId(user.id);
      fetchExpenses(user.id);
      fetchCategoriesAndFrequencies(user.id);
    };
    fetchUserData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        fetchExpenses(userId);
        fetchCategoriesAndFrequencies(userId);
      }
    }, [userId])
  );

  const fetchExpenses = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          categories (name),
          frequencies (name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
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
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
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
        
        // Convert directly to target period based on frequency
        switch (days) {
          case 1: // frequency_id: 1 (daily)
            switch (selectedPeriod) {
              case 'day':
                convertedAmount = amount; // Keep daily amount
                break;
              case 'week':
                convertedAmount = amount * 7; // Convert to weekly
                break;
              case 'month':
                convertedAmount = amount * 30; // Convert to monthly
                break;
            }
            break;

          case 7: // frequency_id: 2 (weekly)
            switch (selectedPeriod) {
              case 'day':
                convertedAmount = amount / 7; // Convert to daily
                break;
              case 'week':
                convertedAmount = amount; // Keep weekly amount
                break;
              case 'month':
                convertedAmount = amount * 4.28; // Convert to monthly
                break;
            }
            break;

          case 14: // frequency_id: 3 (biweekly)
            switch (selectedPeriod) {
              case 'day':
                convertedAmount = amount / 14; // Convert to daily
                break;
              case 'week':
                convertedAmount = amount / 2; // Convert to weekly
                break;
              case 'month':
                convertedAmount = amount * 2; // Convert to monthly
                break;
            }
            break;

          case 30: // frequency_id: 4 (monthly)
            switch (selectedPeriod) {
              case 'day':
                convertedAmount = amount / 30; // Convert to daily
                break;
              case 'week':
                convertedAmount = amount / 4.28; // Convert to weekly
                break;
              case 'month':
                convertedAmount = amount; // Keep monthly amount
                break;
            }
            break;

          case 365: // frequency_id: 5 (yearly)
            switch (selectedPeriod) {
              case 'day':
                convertedAmount = amount / 365; // Convert to daily
                break;
              case 'week':
                convertedAmount = amount / 52; // Convert to weekly
                break;
              case 'month':
                convertedAmount = amount / 12; // Convert to monthly
                break;
            }
            break;

          default:
            // For custom frequencies, convert to monthly first
            const monthlyAmount = (amount * 30) / days;
            switch (selectedPeriod) {
              case 'day':
                convertedAmount = monthlyAmount / 30;
                break;
              case 'week':
                convertedAmount = monthlyAmount / 4.28;
                break;
              case 'month':
                convertedAmount = monthlyAmount;
                break;
            }
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

  return (
    <View style={styles.container}>
      {showAlert && <AlertComponent type={alertType} message={alertMessage} onClose={() => setShowAlert(false)} />}

      <Text style={styles.header}>Expenses Management</Text>

      <Chart
        incomes={expenses}
        categories={categories}
        frequencies={frequencies}
        processData={processExpenseData}
        chartTypes={['categories', 'priority', 'status']}
      />

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
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>
              Do you want to delete the expense - {expenseToDelete?.name}?
            </Text>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleDeleteExpense}
              >
                <Text style={styles.saveButtonText}>Yes, Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>No, Go Back</Text>
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
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>
              Do you want to delete the category - {categoryToDelete?.name}?
            </Text>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.deleteButton, { flex: 1, marginRight: 8 }]} 
                onPress={handleDeleteCategory}
              >
                <Text style={styles.deleteButtonText}>Yes, Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.cancelButton, { flex: 1 }]} 
                onPress={() => setDeleteCategoryModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ExpensesPage;
