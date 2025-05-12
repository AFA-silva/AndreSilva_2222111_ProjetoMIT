import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Platform, Dimensions, FlatList, Alert } from 'react-native';
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

      // Buscar receitas e despesas do mês atual
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

      // Calcular receita mensal total
      const totalIncome = incomes.reduce((sum, income) => {
        const days = income.frequencies?.days || 30;
        return sum + (income.amount * 30) / days;
      }, 0);

      // Calcular despesas mensais totais
      const totalExpenses = expenses.reduce((sum, expense) => {
        const days = expense.frequencies?.days || 30;
        return sum + (expense.amount * 30) / days;
      }, 0);

      // Calcular dinheiro disponível e economia mensal
      const availableMoney = totalIncome - totalExpenses;
      const monthlySaving = (availableMoney * goal.goal_saving_minimum) / 100;

      // Calcular meses necessários para atingir a meta
      const monthsNeeded = Math.ceil(goal.amount / monthlySaving);
      const deadlineDate = new Date(goal.deadline);
      const monthsUntilDeadline = (deadlineDate.getFullYear() - today.getFullYear()) * 12 + 
        (deadlineDate.getMonth() - today.getMonth());

      // Verificar se é possível atingir a meta no prazo atual
      if (monthsNeeded <= monthsUntilDeadline) {
        return {
          status: 'success',
          message: `Meta alcançável em ${monthsNeeded} meses usando ${goal.goal_saving_minimum}% do dinheiro disponível.`,
          monthlySaving,
          monthsNeeded,
          originalSettings: {
            monthsNeeded,
            monthlySaving,
            savingPercentage: goal.goal_saving_minimum
          }
        };
      }

      // Tentar diferentes combinações de cortes e porcentagens
      const scenarios = [];

      // Cenário 1: Aumentar porcentagem de economia
      for (let percentage = goal.goal_saving_minimum + 5; percentage <= 100; percentage += 5) {
        const newMonthlySaving = (availableMoney * percentage) / 100;
        const newMonthsNeeded = Math.ceil(goal.amount / newMonthlySaving);
        
        if (newMonthsNeeded <= monthsUntilDeadline) {
          scenarios.push({
            type: 'percentage',
            percentage,
            monthsNeeded: newMonthsNeeded,
            monthlySaving: newMonthlySaving,
            message: `Possível alcançar em ${newMonthsNeeded} meses aumentando para ${percentage}% do dinheiro disponível.`
          });
        }
      }

      // Cenário 2: Cortar despesas por prioridade
      const priorityExpenses = {
        1: expenses.filter(e => e.priority === 1),
        2: expenses.filter(e => e.priority === 2),
        3: expenses.filter(e => e.priority === 3)
      };

      // Calcular economia por prioridade
      const savingsByPriority = {
        1: priorityExpenses[1].reduce((sum, expense) => {
          const days = expense.frequencies?.days || 30;
          return sum + (expense.amount * 30) / days;
        }, 0),
        2: priorityExpenses[2].reduce((sum, expense) => {
          const days = expense.frequencies?.days || 30;
          return sum + (expense.amount * 30) / days;
        }, 0),
        3: priorityExpenses[3].reduce((sum, expense) => {
          const days = expense.frequencies?.days || 30;
          return sum + (expense.amount * 30) / days;
        }, 0)
      };

      // Testar diferentes combinações de cortes
      for (let priority = 1; priority <= 3; priority++) {
        const totalSavings = Object.entries(savingsByPriority)
          .filter(([p]) => parseInt(p) <= priority)
          .reduce((sum, [_, amount]) => sum + amount, 0);

        const newAvailableMoney = availableMoney + totalSavings;
        const newMonthlySaving = (newAvailableMoney * goal.goal_saving_minimum) / 100;
        const newMonthsNeeded = Math.ceil(goal.amount / newMonthlySaving);

        if (newMonthsNeeded <= monthsUntilDeadline) {
          scenarios.push({
            type: 'priority',
            priority,
            monthsNeeded: newMonthsNeeded,
            monthlySaving: newMonthlySaving,
            savings: totalSavings,
            message: `Possível alcançar em ${newMonthsNeeded} meses cortando despesas de prioridade ${priority} ou menor (economia de ${new Intl.NumberFormat('pt-PT', {
              style: 'currency',
              currency: 'EUR',
            }).format(totalSavings)}/mês).`
          });
        }
      }

      // Se encontrou cenários possíveis
      if (scenarios.length > 0) {
        // Ordenar cenários por meses necessários
        scenarios.sort((a, b) => a.monthsNeeded - b.monthsNeeded);
        const bestScenario = scenarios[0];

        return {
          status: 'warning',
          message: bestScenario.message,
          monthlySaving: bestScenario.monthlySaving,
          monthsNeeded: bestScenario.monthsNeeded,
          originalSettings: {
            monthsNeeded,
            monthlySaving,
            savingPercentage: goal.goal_saving_minimum
          },
          bestScenario
        };
      }

      // Se nenhum cenário é possível
      const earliestDate = new Date(today);
      earliestDate.setMonth(earliestDate.getMonth() + monthsNeeded);

      return {
        status: 'error',
        message: `Meta não alcançável na data desejada. Com as configurações atuais, você atingiria a meta em ${earliestDate.toLocaleDateString()}.`,
        monthlySaving,
        monthsNeeded,
        originalSettings: {
          monthsNeeded,
          monthlySaving,
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

      const payload = {
        name: formData.name,
        amount: amount,
        deadline: formData.deadline.toISOString().split('T')[0],
        goal_saving_minimum: formData.goal_saving_minimum,
        user_id: userId
      };

      let error;
      if (editingGoal) {
        const { error: updateError } = await supabase
          .from('goals')
          .update(payload)
          .eq('id', editingGoal.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('goals')
          .insert([payload])
          .select();
        error = insertError;
      }

      if (error) {
        console.error('Error details:', error);
        throw error;
      }

      setAlertMessage(`Goal ${editingGoal ? 'updated' : 'added'} successfully!`);
      setAlertType('success');
      setShowAlert(true);
      setModalVisible(false);
      
      // Atualizar a lista de metas
      await fetchGoals(userId);
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
      const formatDateForDisplay = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('pt-PT');
      };

      const handleDateChange = (text) => {
        // Remove todos os caracteres não numéricos
        const numbers = text.replace(/\D/g, '');
        
        // Formata a data enquanto o usuário digita
        let formattedDate = '';
        if (numbers.length > 0) {
          if (numbers.length <= 2) {
            formattedDate = numbers;
          } else if (numbers.length <= 4) {
            formattedDate = `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
          } else {
            formattedDate = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
          }
        }

        // Atualiza o texto formatado
        setFormData(prev => ({
          ...prev,
          deadline: formattedDate
        }));

        // Se tiver uma data completa válida, atualiza o objeto Date
        if (numbers.length === 8) {
          const day = parseInt(numbers.slice(0, 2));
          const month = parseInt(numbers.slice(2, 4)) - 1; // Mês em JS começa em 0
          const year = parseInt(numbers.slice(4, 8));
          
          const newDate = new Date(year, month, day);
          if (!isNaN(newDate.getTime()) && newDate.getFullYear() === year) {
            setFormData(prev => ({
              ...prev,
              deadline: newDate
            }));
          }
        }
      };

      return (
        <View style={styles.dateInputContainer}>
          <Text style={styles.dateInputLabel}>Deadline:</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="DD/MM/YYYY"
            value={typeof formData.deadline === 'string' ? formData.deadline : formatDateForDisplay(formData.deadline)}
            onChangeText={handleDateChange}
            maxLength={10}
            keyboardType="numeric"
          />
        </View>
      );
    }

    return (
      <>
        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.datePickerText}>
            Deadline: {formData.deadline.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={formData.deadline}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setFormData({ ...formData, deadline: selectedDate });
              }
            }}
            minimumDate={new Date()}
            style={Platform.OS === 'ios' ? { width: '100%', height: 200 } : undefined}
          />
        )}
      </>
    );
  };

  const renderGoalItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.goalItem}
        onPress={() => handleGoalPress(item)}
      >
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>{item.name}</Text>
          <Text style={styles.goalAmount}>
            {new Intl.NumberFormat('pt-PT', {
              style: 'currency',
              currency: 'EUR',
            }).format(item.amount)}
          </Text>
        </View>
        <Text style={styles.goalDeadline}>
          Deadline: {new Date(item.deadline).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderGoalDetails = () => {
    if (!selectedGoal) return null;
    const status = goalStatuses[selectedGoal.id];

    const getStatusIcon = () => {
      switch (status?.status) {
        case 'success':
          return <Ionicons name="checkmark-circle" size={28} color="#00B894" />;
        case 'warning':
          return <Ionicons name="warning" size={28} color="#FDCB6E" />;
        case 'error':
          return <Ionicons name="close-circle" size={28} color="#E74C3C" />;
        default:
          return null;
      }
    };

    const getStatusTitle = () => {
      switch (status?.status) {
        case 'success':
          return 'Meta Alcançável';
        case 'warning':
          return 'Meta Possível com Ajustes';
        case 'error':
          return 'Meta Não Alcançável';
        default:
          return 'Status da Meta';
      }
    };

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
                <View style={styles.statusContainer}>
                  <View style={styles.statusHeader}>
                    <View style={styles.statusIcon}>{getStatusIcon()}</View>
                    <Text style={[styles.statusTitle, styles[`status${status.status.charAt(0).toUpperCase() + status.status.slice(1)}`]]}>
                      {getStatusTitle()}
                    </Text>
                  </View>
                  <Text style={[styles.statusText, styles[`status${status.status.charAt(0).toUpperCase() + status.status.slice(1)}`]]}>
                    {status.message}
                  </Text>
                  {status.originalSettings && status.status !== 'success' && (
                    <View>
                      <Text style={styles.originalSettingsText}>
                        Com as configurações atuais:
                      </Text>
                      <Text style={styles.originalSettingsValue}>
                        {status.originalSettings.monthsNeeded} meses para a meta.
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

  return (
    <View style={styles.container}>
      {showAlert && (
        <AlertComponent
          type={alertType}
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      )}

      <Text style={styles.header}>Financial Goals</Text>

      <TouchableOpacity style={styles.addButton} onPress={handleAddGoal}>
        <Ionicons name="add-circle" size={24} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add New Goal</Text>
      </TouchableOpacity>

      <FlatList
        data={goals}
        renderItem={renderGoalItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      {renderGoalDetails()}

      {/* Add/Edit Goal Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalHeader}>
                {editingGoal ? 'Edit Goal' : 'Add New Goal'}
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Goal Name"
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

              {renderDatePicker()}

              <View style={styles.percentageContainer}>
                <Text style={styles.percentageLabel}>Save</Text>
                <TextInput
                  style={styles.percentageInput}
                  placeholder="Percentage"
                  keyboardType="numeric"
                  value={formData.goal_saving_minimum.toString()}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      goal_saving_minimum: parseInt(text) || 0,
                    })
                  }
                />
                <Text style={styles.percentageLabel}>% of remaining money</Text>
              </View>

              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveGoal}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#7F8C8D" />
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 400 }]}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning" size={32} color="#FF6B6B" />
              <Text style={styles.deleteModalTitle}>Delete Goal</Text>
            </View>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete "{goalToDelete?.name}"?
            </Text>
            <Text style={styles.deleteModalSubtext}>
              This action cannot be undone.
            </Text>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.deleteButton, { flex: 1, marginRight: 8 }]}
                onPress={handleDeleteGoal}
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
    </View>
  );
};

export default GoalsPage;
