import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../../Supabase';
import styles from '../../Styles/Manage/GoalsPageStyle';
import AlertComponent from '../../Utility/Alerts';
import { useFocusEffect } from '@react-navigation/native';

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [userId, setUserId] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    deadline: new Date(),
    goal_saving_minimum: 20,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [goalStatuses, setGoalStatuses] = useState({});
  const [financialMetrics, setFinancialMetrics] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    availableMoney: 0,
    totalSavingsPercentage: 0,
  });

  // Alert states
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  const [isDetailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (user) {
          setUserId(user.id);
          await fetchGoals(user.id);
          await calculateFinancialMetrics(user.id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setAlertMessage('Failed to fetch user data');
        setAlertType('error');
        setShowAlert(true);
      }
    };
    fetchUserData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        fetchGoals(userId);
        calculateFinancialMetrics(userId);
      }
    }, [userId])
  );

  const fetchGoals = async (userId) => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
      
      // Calcular status para cada meta
      if (data) {
        const statuses = {};
        for (const goal of data) {
          statuses[goal.id] = await calculateGoalStatus(goal);
        }
        setGoalStatuses(statuses);

        // Calcula distribuição ótima entre metas
        const { data: incomes, error: incomeError } = await supabase
          .from('income')
          .select('*, frequencies(days)')
          .eq('user_id', userId);

        const { data: expenses, error: expenseError } = await supabase
          .from('expenses')
          .select('*, frequencies(days)')
          .eq('user_id', userId);

        if (incomeError || expenseError) throw incomeError || expenseError;

        const totalIncome = incomes.reduce((sum, income) => {
          const days = income.frequencies?.days || 30;
          return sum + (income.amount * 30) / days;
        }, 0);

        const totalExpenses = expenses.reduce((sum, expense) => {
          const days = expense.frequencies?.days || 30;
          return sum + (expense.amount * 30) / days;
        }, 0);

        const availableMoney = totalIncome - totalExpenses;
        const optimalDistribution = calculateOptimalDistribution(data, availableMoney);
        
        // Atualiza o estado com a distribuição ótima
        setFinancialMetrics(prev => ({
          ...prev,
          totalIncome,
          totalExpenses,
          availableMoney,
          totalSavingsPercentage: prev.totalSavingsPercentage,
          optimalDistribution
        }));
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      setAlertMessage('Failed to fetch goals');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const calculateGoalStatus = async (goal) => {
    if (!userId) return null;

    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Fetch income and expenses
      const { data: incomes, error: incomeError } = await supabase
        .from('income')
        .select('*, frequencies(days)')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('*, frequencies(days), priority')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (incomeError || expenseError) throw incomeError || expenseError;

      // Calculate total income
      const totalIncome = incomes.reduce((sum, income) => {
        const days = income.frequencies?.days || 30;
        return sum + (income.amount * 30) / days;
      }, 0);

      // Calculate total expenses
      const totalExpenses = expenses.reduce((sum, expense) => {
        const days = expense.frequencies?.days || 30;
        return sum + (expense.amount * 30) / days;
      }, 0);

      const availableMoney = totalIncome - totalExpenses;
      const remainingAmount = goal.amount - (goal.current_amount || 0);
      const daysUntilDeadline = calculateDaysUntilDeadline(goal.deadline);
      
      // Calcula os dias que já passaram no mês atual
      const daysPassedInMonth = today.getDate() - 1;
      // Calcula os dias restantes no mês atual
      const daysRemainingInMonth = endOfMonth.getDate() - today.getDate() + 1;
      
      // Calcula quanto precisa economizar por dia para atingir a meta no prazo
      const requiredDailySaving = remainingAmount / daysUntilDeadline;
      
      // Calcula quanto está economizando por dia com a porcentagem atual
      const currentDailySaving = (availableMoney * goal.goal_saving_minimum / 100) / 30;
      
      // Calcula quanto já economizou neste mês
      const savedThisMonth = currentDailySaving * daysPassedInMonth;
      
      // Calcula quanto vai economizar até o fim do mês
      const willSaveThisMonth = currentDailySaving * daysRemainingInMonth;
      
      // Calcula quanto falta economizar após este mês
      const remainingAfterThisMonth = remainingAmount - savedThisMonth - willSaveThisMonth;
      
      // Calcula quantos dias adicionais precisa após este mês
      const additionalDaysNeeded = Math.ceil(remainingAfterThisMonth / currentDailySaving);
      
      // Data possível considerando o mês atual
      const possibleDate = new Date(today);
      possibleDate.setDate(today.getDate() + daysRemainingInMonth + additionalDaysNeeded);

      // 1. Verifica se é possível com as configurações atuais
      if (possibleDate <= new Date(goal.deadline)) {
        return {
          status: 'success',
          message: `Meta alcançável! Você atingirá a meta no dia desejado (${new Date(goal.deadline).toLocaleDateString()}) usando ${goal.goal_saving_minimum}% dos savings.`,
          monthlySaving: currentDailySaving * 30,
          monthsNeeded: Math.ceil((daysRemainingInMonth + additionalDaysNeeded) / 30),
          reachDate: possibleDate.toLocaleDateString(),
          originalSettings: {
            monthsNeeded: Math.ceil((daysRemainingInMonth + additionalDaysNeeded) / 30),
            monthlySaving: currentDailySaving * 30,
            reachDate: possibleDate.toLocaleDateString(),
            savingPercentage: goal.goal_saving_minimum
          }
        };
      }

      // 2. Verifica se é possível aumentando a porcentagem de savings
      // Considera o que já foi economizado neste mês
      const remainingToSave = remainingAmount - savedThisMonth;
      const requiredPercentage = (remainingToSave / (availableMoney * (daysUntilDeadline / 30))) * 100;
      
      if (requiredPercentage <= 100) {
        return {
          status: 'info',
          message: `A Meta é alcançável se aumentar a porcentagem de savings para ${Math.ceil(requiredPercentage)}%.`,
          monthlySaving: (availableMoney * requiredPercentage) / 100,
          monthsNeeded: Math.ceil(daysUntilDeadline / 30),
          reachDate: new Date(goal.deadline).toLocaleDateString(),
          originalSettings: {
            monthsNeeded: Math.ceil((daysRemainingInMonth + additionalDaysNeeded) / 30),
            monthlySaving: currentDailySaving * 30,
            reachDate: possibleDate.toLocaleDateString(),
            savingPercentage: goal.goal_saving_minimum
          }
        };
      }

      // 3. Verifica se é possível removendo despesas, começando pelas de menor prioridade
      const priorityExpenses = {
        1: expenses.filter(e => e.priority === 1).sort((a, b) => a.amount - b.amount), // Mínima
        2: expenses.filter(e => e.priority === 2).sort((a, b) => a.amount - b.amount), // Baixa
        3: expenses.filter(e => e.priority === 3).sort((a, b) => a.amount - b.amount), // Média
        4: expenses.filter(e => e.priority === 4).sort((a, b) => a.amount - b.amount), // Alta
        5: expenses.filter(e => e.priority === 5).sort((a, b) => a.amount - b.amount), // Máxima
      };

      const priorityNames = {
        1: 'mínima',
        2: 'baixa',
        3: 'média',
        4: 'alta',
        5: 'máxima'
      };

      // Tenta remover despesas em ordem de prioridade (da menor para a maior)
      for (let priority = 1; priority <= 5; priority++) {
        for (const expense of priorityExpenses[priority]) {
          const expenseMonthly = (expense.amount * 30) / (expense.frequencies?.days || 30);
          const newAvailableMoney = availableMoney + expenseMonthly;
          const newRequiredPercentage = (remainingToSave / (newAvailableMoney * (daysUntilDeadline / 30))) * 100;

          if (newRequiredPercentage <= 100) {
            return {
              status: 'info',
              message: `A Meta é alcançável se remover a despesa '${expense.name}' (prioridade ${priorityNames[priority]}) e usar ${Math.ceil(newRequiredPercentage)}% dos savings.`,
              monthlySaving: (newAvailableMoney * newRequiredPercentage) / 100,
              monthsNeeded: Math.ceil(daysUntilDeadline / 30),
              reachDate: new Date(goal.deadline).toLocaleDateString(),
              originalSettings: {
                monthsNeeded: Math.ceil((daysRemainingInMonth + additionalDaysNeeded) / 30),
                monthlySaving: currentDailySaving * 30,
                reachDate: possibleDate.toLocaleDateString(),
                savingPercentage: goal.goal_saving_minimum
              }
            };
          }
        }
      }

      // Se nada for possível
      return {
        status: 'error',
        message: 'Meta não alcançável com as configurações atuais.',
        monthlySaving: currentDailySaving * 30,
        monthsNeeded: null,
        reachDate: null,
        originalSettings: {
          monthsNeeded: Math.ceil((daysRemainingInMonth + additionalDaysNeeded) / 30),
          monthlySaving: currentDailySaving * 30,
          reachDate: possibleDate.toLocaleDateString(),
          savingPercentage: goal.goal_saving_minimum
        }
      };

    } catch (error) {
      console.error('Error calculating goal status:', error);
      return {
        status: 'error',
        message: 'Erro ao calcular status da meta',
      };
    }
  };

  const calculateFinancialMetrics = async (userId) => {
    if (!userId) return;

    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Fetch income and expenses
      const { data: incomes, error: incomeError } = await supabase
        .from('income')
        .select('*, frequencies(days)')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('*, frequencies(days)')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (incomeError || expenseError) throw incomeError || expenseError;

      // Calculate total income
      const totalIncome = incomes.reduce((sum, income) => {
        const days = income.frequencies?.days || 30;
        return sum + (income.amount * 30) / days;
      }, 0);

      // Calculate total expenses
      const totalExpenses = expenses.reduce((sum, expense) => {
        const days = expense.frequencies?.days || 30;
        return sum + (expense.amount * 30) / days;
      }, 0);

      // Calculate available money
      const availableMoney = totalIncome - totalExpenses;

      // Calculate total savings percentage from goals
      const { data: userGoals, error: goalsError } = await supabase
        .from('goals')
        .select('goal_saving_minimum')
        .eq('user_id', userId);

      if (goalsError) throw goalsError;

      const totalSavingsPercentage = userGoals.reduce((sum, goal) => {
        return sum + (goal.goal_saving_minimum || 0);
      }, 0);

      setFinancialMetrics({
        totalIncome,
        totalExpenses,
        availableMoney,
        totalSavingsPercentage,
      });
    } catch (error) {
      console.error('Error calculating financial metrics:', error);
      setAlertMessage('Failed to calculate financial metrics');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const handleAddGoal = () => {
    setEditingGoal(null);
    setFormData({
      name: '',
      amount: '',
      deadline: new Date(),
      goal_saving_minimum: 20,
    });
    setModalVisible(true);
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      amount: goal.amount.toString(),
      deadline: new Date(goal.deadline),
      goal_saving_minimum: goal.goal_saving_minimum,
    });
    setModalVisible(true);
  };

  const handleDeleteGoal = async () => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalToDelete.id);

      if (error) throw error;

      setAlertMessage('Goal deleted successfully');
      setAlertType('success');
      setShowAlert(true);
      await fetchGoals(userId);
    } catch (error) {
      console.error('Error deleting goal:', error);
      setAlertMessage('Error deleting goal');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setDeleteModalVisible(false);
    }
  };

  const confirmDeleteGoal = (goal) => {
    setGoalToDelete(goal);
    setDeleteModalVisible(true);
  };

  const handleSaveGoal = async () => {
    try {
      if (!formData.name || !formData.amount || !formData.deadline) {
        setAlertMessage('Please fill in all fields');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        setAlertMessage('Please enter a valid amount');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      // Calculate new total savings percentage
      const { data: userGoals, error: goalsError } = await supabase
        .from('goals')
        .select('id, goal_saving_minimum')
        .eq('user_id', userId);

      if (goalsError) throw goalsError;

      const currentTotalPercentage = userGoals.reduce((sum, goal) => {
        // Ignora a meta atual ao editar
        if (editingGoal && String(goal.id) === String(editingGoal.id)) return sum;
        return sum + (goal.goal_saving_minimum || 0);
      }, 0);

      const newTotalPercentage = currentTotalPercentage + formData.goal_saving_minimum;

      if (newTotalPercentage > 100) {
        setAlertMessage(`Cannot add goal. Total savings percentage would exceed 100% (currently using ${currentTotalPercentage}%)`);
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      // Calcule o status REAL usando calculateGoalStatus
      let statusValue = 1; // default
      const statusResult = await calculateGoalStatus({
        ...formData,
        amount: parseFloat(formData.amount),
        deadline: formData.deadline,
        goal_saving_minimum: formData.goal_saving_minimum,
        user_id: userId
      });
      if (statusResult?.status === 'success') statusValue = 1;
      else if (statusResult?.status === 'info') statusValue = 2;
      else if (statusResult?.status === 'error') statusValue = 3;

      const payload = {
        name: formData.name,
        amount: amount,
        deadline: formData.deadline.toISOString().split('T')[0],
        goal_saving_minimum: formData.goal_saving_minimum,
        user_id: userId,
        status: statusValue
      };

      let error;
      if (editingGoal) {
        await supabase.from('goals').update(payload).eq('id', editingGoal.id);
      } else {
        await supabase.from('goals').insert([payload]);
      }

      setAlertMessage(`Goal ${editingGoal ? 'updated' : 'added'} successfully!`);
      setAlertType('success');
      setShowAlert(true);
      setModalVisible(false);
      
      // Update goals and metrics
      await fetchGoals(userId);
      await calculateFinancialMetrics(userId);
    } catch (error) {
      console.error('Error saving goal:', error);
      setAlertMessage(error.message || 'Error saving goal');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const handleGoalPress = (goal) => {
    setSelectedGoal(goal);
    setDetailsModalVisible(true);
  };

  const renderDatePicker = () => {
    if (Platform.OS === 'web') {
      return (
        <>
          <Text style={styles.modalInputLabel}>Deadline Date:</Text>
          <input
            type="date"
            style={{
              padding: 12,
              borderRadius: 8,
              border: '1px solid #DFE6E9',
              fontSize: 16,
              color: '#2D3436',
              backgroundColor: '#F8F9FA',
              width: '100%',
              marginBottom: 8,
            }}
            value={formData.deadline ? new Date(formData.deadline).toISOString().split('T')[0] : ''}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => {
              setFormData(prev => ({
                ...prev,
                deadline: new Date(e.target.value)
              }));
            }}
          />
        </>
      );
    }

    if (Platform.OS === 'ios') {
      return (
        <>
          <Text style={styles.modalInputLabel}>Deadline Date:</Text>
          <DateTimePicker
            value={formData.deadline}
            mode="date"
            display="spinner"
            onChange={(event, selectedDate) => {
              if (selectedDate) {
                setFormData(prev => ({ ...prev, deadline: selectedDate }));
              }
            }}
            minimumDate={new Date()}
            style={{ height: 200 }}
          />
        </>
      );
    }

    // Android
    return (
      <>
        <Text style={styles.modalInputLabel}>Deadline Date:</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.datePickerButtonText}>
            {formData.deadline.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={formData.deadline}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setFormData(prev => ({ ...prev, deadline: selectedDate }));
              }
            }}
            minimumDate={new Date()}
          />
        )}
      </>
    );
  };

  const calculateGoalProgress = (goal) => {
    const daysUntilDeadline = calculateDaysUntilDeadline(goal.deadline);
    const totalDays = Math.ceil((new Date(goal.deadline) - new Date(goal.created_at)) / (1000 * 60 * 60 * 24));
    const daysPassed = totalDays - daysUntilDeadline;
    return Math.min((daysPassed / totalDays) * 100, 100);
  };

  const getStatusInfo = (status) => {
    const statusConfig = {
      success: {
        icon: <Ionicons name="checkmark-circle" size={28} color="#00B894" />,
        title: 'Meta Alcançável',
        textColor: '#00B894',
        backgroundColor: '#00B89420'
      },
      info: {
        icon: <Ionicons name="warning" size={28} color="#FDCB6E" />,
        title: 'Meta Possível com Ajustes',
        textColor: '#FDCB6E',
        backgroundColor: '#FDCB6E20'
      },
      error: {
        icon: <Ionicons name="close-circle" size={28} color="#E74C3C" />,
        title: 'Meta Não Alcançável',
        textColor: '#E74C3C',
        backgroundColor: '#E74C3C20'
      }
    };

    return statusConfig[status?.status] || {
      icon: null,
      title: 'Status da Meta',
      textColor: '#2D3436',
      backgroundColor: '#DFE6E920'
    };
  };

  const calculateDailySaving = (amount, deadline) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntilDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    return amount / daysUntilDeadline;
  };

  const calculateDaysRemaining = (deadline, amount, currentAmount) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const creationDate = new Date(selectedGoal?.created_at || today);
    
    // Calcula os dias desejados (da criação até o deadline)
    const desiredDays = Math.ceil((deadlineDate - creationDate) / (1000 * 60 * 60 * 24));
    
    // Usa a data prevista do status original
    const status = goalStatuses[selectedGoal?.id];
    const possibleDate = status?.originalSettings?.reachDate ? new Date(status.originalSettings.reachDate) : null;
    
    return {
      daysRemaining: desiredDays,
      daysNeeded: possibleDate ? Math.ceil((possibleDate - today) / (1000 * 60 * 60 * 24)) : 0,
      possibleDate,
      isPossible: possibleDate && possibleDate <= deadlineDate
    };
  };

  const renderGoalItem = ({ item }) => {
    const status = goalStatuses[item.id];
    const creationDate = new Date(item.created_at);
    const deadlineDate = new Date(item.deadline);
    const today = new Date();
    
    // Se a meta for alcançável, usa os dias até o deadline
    let predictedDays = null;
    if (status?.status === 'success') {
      predictedDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    } else if (status?.originalSettings?.reachDate) {
      const [day, month, year] = status.originalSettings.reachDate.split('/');
      const reachDate = new Date(`${year}-${month}-${day}`);
      predictedDays = Math.ceil((reachDate - today) / (1000 * 60 * 60 * 24));
    }
    
    const desiredDays = Math.ceil((deadlineDate - creationDate) / (1000 * 60 * 60 * 24));
    const progressPercentage = calculateTimeProgress(item);

    // Ícone e cor
    let statusIcon = 'checkmark-circle';
    let statusColor = '#00B894';
    if (status?.status === 'info') {
      statusIcon = 'warning';
      statusColor = '#FDCB6E';
    } else if (status?.status === 'error') {
      statusIcon = 'alert-circle';
      statusColor = '#E74C3C';
    }

    return (
      <TouchableOpacity
        style={styles.goalItem}
        onPress={() => handleGoalPress(item)}
      >
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleContainer}>
            <Ionicons name={statusIcon} size={24} color={statusColor} style={styles.warningIcon} />
            <Text style={styles.goalTitle}>{item.name}</Text>
          </View>
          <Text style={styles.goalAmount}>
            {new Intl.NumberFormat('pt-PT', {
              style: 'currency',
              currency: 'EUR',
            }).format(item.amount || 0)}
          </Text>
        </View>
        <View style={styles.goalProgressContainer}>
          <View
            style={[
              styles.goalProgressBar,
              { width: `${progressPercentage}%`, backgroundColor: statusColor }
            ]}
          />
        </View>
        <View style={styles.goalDeadlineContainer}>
          <View style={styles.deadlineRow}>
            <Text style={styles.goalDeadline}>
              Dias para meta: {predictedDays !== null && !isNaN(predictedDays) ? predictedDays : '--'} dias (Deadline: {desiredDays} dias)
            </Text>
            <Text style={[styles.progressPercentage, { color: statusColor }]}>
              {progressPercentage.toFixed(1)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGoalDetails = () => {
    if (!selectedGoal) return null;
    const status = goalStatuses[selectedGoal.id];
    const { icon, title, textColor, backgroundColor } = getStatusInfo(status);
    const progress = calculateTimeProgress(selectedGoal);

    return (
      <Modal visible={isDetailsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderContainer}>
                <Text style={styles.modalHeader}>{selectedGoal.name}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setDetailsModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#7F8C8D" />
                </TouchableOpacity>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailsRow}>
                  <View style={styles.detailsItem}>
                    <Text style={styles.detailsLabel}>Progresso</Text>
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { width: `${progress}%` }]} />
                      <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailsItem}>
                    <Text style={styles.detailsLabel}>Savings</Text>
                    <Text style={styles.detailsValue}>
                      {selectedGoal.goal_saving_minimum}%
                    </Text>
                  </View>

                  <View style={styles.detailsItem}>
                    <Text style={styles.detailsLabel}>Deadline</Text>
                    <Text style={styles.detailsValue}>
                      {new Date(selectedGoal.deadline).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailsItem}>
                    <Text style={styles.detailsLabel}>Target Amount</Text>
                    <Text style={styles.detailsValue}>
                      {new Intl.NumberFormat('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(selectedGoal.amount)}
                    </Text>
                  </View>
                </View>
              </View>

              {status && (
                <View style={[styles.statusContainer, { backgroundColor }]}>
                  <View style={styles.statusHeader}>
                    <View style={styles.statusIcon}>{icon}</View>
                    <Text style={[styles.statusTitle, { color: textColor }]}>
                      {title}
                    </Text>
                  </View>
                  <Text style={[styles.statusText, { color: textColor }]}>
                    {status.message}
                  </Text>
                  {status.originalSettings && status.status !== 'success' && (
                    <View>
                      <Text style={styles.originalSettingsText}>
                        Com as configurações atuais:
                      </Text>
                      <Text style={styles.originalSettingsValue}>
                        {typeof status.originalSettings.monthsNeeded === 'number' && isFinite(status.originalSettings.monthsNeeded) && status.originalSettings.monthsNeeded > 0
                          ? (status.originalSettings.monthsNeeded === 1
                            ? `Este mês para a meta. Data prevista: ${status.originalSettings.reachDate || ''}`
                            : `${status.originalSettings.monthsNeeded} meses para a meta. Data prevista: ${status.originalSettings.reachDate || ''}`)
                          : 'Não é possível estimar o tempo para atingir a meta.'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.detailsActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    handleEditGoal(selectedGoal);
                  }}
                >
                  <Ionicons name="pencil" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    confirmDeleteGoal(selectedGoal);
                  }}
                >
                  <Ionicons name="trash" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="flag" size={64} color="#7F8C8D" />
      <Text style={styles.emptyStateText}>
        Start by creating your first financial goal!
      </Text>
    </View>
  );

  const renderFinancialMetrics = () => (
    <View style={styles.financialMetricsContainer}>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Monthly Income</Text>
        <Text style={[styles.metricValue, styles.availableMoney]}>
          {new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
          }).format(financialMetrics.totalIncome)}
        </Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Monthly Expenses</Text>
        <Text style={[styles.metricValue, styles.availableMoney]}>
          {new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
          }).format(financialMetrics.totalExpenses)}
        </Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Available Money</Text>
        <Text style={[styles.metricValue, styles.availableMoney]}>
          {new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
          }).format(financialMetrics.availableMoney)}
        </Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Savings Allocated</Text>
        <Text style={[styles.metricValue, { color: getSavingsColor(financialMetrics.totalSavingsPercentage) }]}>
          {financialMetrics.totalSavingsPercentage}%
        </Text>
      </View>
    </View>
  );

  // Funções auxiliares para cálculos de goals
  const calculateDaysUntilDeadline = (deadline) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateOptimalDistribution = () => {
    const totalAmount = goals.reduce((sum, goal) => sum + goal.amount, 0);
    const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
    const remainingAmount = totalAmount - totalCurrentAmount;
    const today = new Date();
    
    return goals.map(goal => {
      const remainingGoalAmount = goal.amount - goal.current_amount;
      const percentage = (remainingGoalAmount / remainingAmount) * 100;
      const dailySaving = calculateDailySaving(goal.amount, goal.deadline);
      const daysNeeded = Math.ceil(remainingGoalAmount / dailySaving);
      const possibleDate = new Date(today);
      possibleDate.setDate(today.getDate() + daysNeeded);
      
      return {
        ...goal,
        percentage,
        possibleDate,
        isPossible: daysNeeded <= Math.ceil((new Date(goal.deadline) - today) / (1000 * 60 * 60 * 24))
      };
    });
  };

  const calculateOptimalStrategy = async (goal) => {
    if (!userId) return null;

    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Busca receitas e despesas
      const { data: incomes, error: incomeError } = await supabase
        .from('income')
        .select('*, frequencies(days)')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('*, frequencies(days), priority')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (incomeError || expenseError) throw incomeError || expenseError;

      // Calcula receita total
      const totalIncome = incomes.reduce((sum, income) => {
        const days = income.frequencies?.days || 30;
        return sum + (income.amount * 30) / days;
      }, 0);

      // Calcula despesas totais
      const totalExpenses = expenses.reduce((sum, expense) => {
        const days = expense.frequencies?.days || 30;
        return sum + (expense.amount * 30) / days;
      }, 0);

      const availableMoney = totalIncome - totalExpenses;
      const daysUntilDeadline = calculateDaysUntilDeadline(goal.deadline);
      const monthlyRequired = goal.amount / (daysUntilDeadline / 30);
      const requiredPercentage = (monthlyRequired / availableMoney) * 100;

      // Estratégias possíveis
      const strategies = [];

      // 1. Apenas aumentar a porcentagem
      if (requiredPercentage <= 100) {
        strategies.push({
          type: 'increase_percentage',
          percentage: requiredPercentage,
          message: `A Meta é alcançável dentro do tempo definido se aumentar para ${Math.ceil(requiredPercentage)}%.`
        });
      }

      // 2. Remover despesas de baixa prioridade
      const priority1Expenses = expenses
        .filter(e => e.priority === 1)
        .sort((a, b) => a.amount - b.amount);

      for (const expense of priority1Expenses) {
        const expenseMonthly = (expense.amount * 30) / (expense.frequencies?.days || 30);
        const newAvailableMoney = availableMoney + expenseMonthly;
        const newRequiredPercentage = (monthlyRequired / newAvailableMoney) * 100;

        if (newRequiredPercentage <= 100) {
          strategies.push({
            type: 'remove_expense',
            expense,
            percentage: newRequiredPercentage,
            message: `A Meta é alcançável dentro do tempo definido se remover a despesa '${expense.name}' e aumentar para ${Math.ceil(newRequiredPercentage)}%.`
          });
        }
      }

      // 3. Combinar estratégias
      if (strategies.length > 1) {
        const bestStrategy = strategies.reduce((best, current) => {
          return current.percentage < best.percentage ? current : best;
        });

        if (bestStrategy.type === 'remove_expense') {
          const increaseOnly = strategies.find(s => s.type === 'increase_percentage');
          if (increaseOnly) {
            bestStrategy.message += `\nAlternativamente, você pode aumentar para ${Math.ceil(increaseOnly.percentage)}% sem remover despesas.`;
          }
        }

        return {
          status: 'info',
          message: bestStrategy.message,
          monthlySaving: monthlyRequired,
          monthsNeeded: daysUntilDeadline / 30,
          reachDate: new Date(today.getTime() + daysUntilDeadline * 24 * 60 * 60 * 1000).toLocaleDateString(),
          originalSettings: {
            monthsNeeded: daysUntilDeadline / 30,
            monthlySaving: monthlyRequired,
            reachDate: new Date(today.getTime() + daysUntilDeadline * 24 * 60 * 60 * 1000).toLocaleDateString(),
            savingPercentage: goal.goal_saving_minimum
          }
        };
      }

      // Se nenhuma estratégia for possível
      return {
        status: 'error',
        message: 'Meta não alcançável com as configurações atuais.',
        monthlySaving: 0,
        monthsNeeded: null,
        reachDate: null,
        originalSettings: {
          monthsNeeded: null,
          monthlySaving: 0,
          reachDate: null,
          savingPercentage: goal.goal_saving_minimum
        }
      };

    } catch (error) {
      console.error('Error calculating optimal strategy:', error);
      return {
        status: 'error',
        message: 'Erro ao calcular estratégia ótima',
      };
    }
  };

  const renderDeleteModal = () => {
    if (!selectedGoal) return null;

    return (
      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning" size={32} color="#E74C3C" />
              <Text style={styles.deleteModalTitle}>Delete Goal</Text>
            </View>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete "{selectedGoal.name}"?
            </Text>
            <Text style={styles.deleteModalSubtext}>
              This action cannot be undone. All progress and data associated with this goal will be permanently deleted.
            </Text>
            <View style={styles.deleteModalButtonsContainer}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalCancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={[styles.deleteModalButtonText, styles.deleteModalCancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalConfirmButton]}
                onPress={handleDeleteGoal}
              >
                <Text style={styles.deleteModalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderStatusContainer = () => {
    const optimalDistribution = calculateOptimalDistribution();
    const hasImpossibleGoals = optimalDistribution.some(goal => !goal.isPossible);

    if (!hasImpossibleGoals) return null;

    return (
      <View style={styles.statusContainer}>
        <View style={styles.statusHeader}>
          <Ionicons name="information-circle" size={24} color="#FDCB6E" style={styles.statusIcon} />
          <Text style={styles.statusTitle}>Current Settings</Text>
        </View>
        <Text style={styles.statusText}>
          Based on your current savings rate, some goals may not be achievable by their deadlines. Here's the optimal distribution:
        </Text>
        {optimalDistribution.map(goal => (
          <View key={goal.id} style={styles.originalSettingsValue}>
            <Text>
              {goal.name}: {goal.percentage.toFixed(1)}% of remaining savings
              {!goal.isPossible && ` (Possible by ${goal.possibleDate.toLocaleDateString()})`}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Função para calcular progresso linear baseado no tempo
  const calculateTimeProgress = (goal) => {
    const creationDate = new Date(goal.created_at);
    const deadlineDate = new Date(goal.deadline);
    const today = new Date();

    // Calcula o total de dias entre criação e deadline
    const totalDays = Math.max(Math.ceil((deadlineDate - creationDate) / (1000 * 60 * 60 * 24)), 1);
    
    // Calcula quantos dias já se passaram desde a criação
    const daysPassed = Math.floor((today - creationDate) / (1000 * 60 * 60 * 24));
    
    // Calcula a porcentagem que cada dia representa
    const percentagePerDay = 100 / totalDays;
    
    // Calcula o progresso atual
    let progress = daysPassed * percentagePerDay;
    
    // Limita o progresso entre 0 e 100
    if (today >= deadlineDate) return 100;
    if (daysPassed < 0) return 0;
    return Math.min(progress, 99.99);
  };

  // Savings color helper
  const getSavingsColor = (percentage) => {
    if (percentage < 50) return '#00B894'; // verde
    if (percentage < 95) return '#FDCB6E'; // amarelo
    return '#E74C3C'; // vermelho
  };

  return (
    <View style={styles.container}>
      {(!isModalVisible && !isDeleteModalVisible && !isDetailsModalVisible && showAlert) && (
        <View style={styles.alertContainer}>
          <AlertComponent
            type={alertType}
            message={alertMessage}
            onClose={() => setShowAlert(false)}
          />
        </View>
      )}

      <Text style={styles.header}>Financial Goals</Text>

      {renderFinancialMetrics()}

      <TouchableOpacity style={styles.addButton} onPress={handleAddGoal}>
        <Ionicons name="add-circle" size={24} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add New Goal</Text>
      </TouchableOpacity>

      <View style={styles.listWrapper}>
        <FlatList
          data={goals}
          renderItem={renderGoalItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.listContainer}
        />
      </View>

      {renderGoalDetails()}

      {/* Add/Edit Goal Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContainer}>
              {showAlert && (
                <View style={styles.alertContainer}>
                  <AlertComponent
                    type={alertType}
                    message={alertMessage}
                    onClose={() => setShowAlert(false)}
                  />
                </View>
              )}
              <Text style={styles.modalHeader}>
                {editingGoal ? 'Edit Goal' : 'Add New Goal'}
              </Text>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Goal Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter goal name"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Amount</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  value={formData.amount}
                  onChangeText={(text) => setFormData({ ...formData, amount: text })}
                />
              </View>

              <View style={styles.modalInputContainer}>
                {renderDatePicker()}
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Savings Percentage</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter percentage"
                  keyboardType="numeric"
                  value={formData.goal_saving_minimum.toString()}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      goal_saving_minimum: parseInt(text) || 0,
                    })
                  }
                />
                <Text style={styles.savingsDescription}>
                  This percentage will be taken from your available money after expenses
                </Text>
              </View>

              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveGoal}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {renderDeleteModal()}
    </View>
  );
};

export default GoalsPage;
