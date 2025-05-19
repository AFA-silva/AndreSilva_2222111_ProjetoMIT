import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../../Supabase';
import styles from '../../Styles/Manage/GoalsPageStyle';
import AlertComponent from '../../Utility/Alerts';
import { useFocusEffect } from '@react-navigation/native';
import { formatCurrency, calculateGoalProgress, calculateGoalStatus, calculateAllocationValue } from './GoalsCalc';

// Funções auxiliares

const getStatusInfo = (status) => {
  const statusValue = status?.status || status;
  const statusConfig = {
    1: {
      icon: <Ionicons name="checkmark-circle" size={28} color="#00B894" />,
      title: 'Meta Alcançável',
      textColor: '#00B894',
      backgroundColor: '#00B89420'
    },
    2: {
      icon: <Ionicons name="warning" size={28} color="#FDCB6E" />,
      title: 'Meta Possível com Ajustes',
      textColor: '#FDCB6E',
      backgroundColor: '#FDCB6E20'
    },
    3: {
      icon: <Ionicons name="close-circle" size={28} color="#E74C3C" />,
      title: 'Meta Não Alcançável',
      textColor: '#E74C3C',
      backgroundColor: '#E74C3C20'
    },
    4: {
      icon: <Ionicons name="information-circle" size={28} color="#0984e3" />,
      title: 'Meta no Dia!',
      textColor: '#0984e3',
      backgroundColor: '#d6eaff',
    }
  };
  return statusConfig[statusValue] || {
    icon: null,
    title: 'Status da Meta',
    textColor: '#2D3436',
    backgroundColor: '#DFE6E920'
  };
};

// Componente de Barra de Progresso
const ProgressBar = ({ progress, color = '#00B894', showPercentage = true }) => (
  <View style={styles.progressContainer}>
    <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} />
    {showPercentage && <Text style={styles.progressText}>{progress.toFixed(1)}%</Text>}
  </View>
);

// Componente de Modal de Detalhes
const GoalDetailsModal = ({ goal, visible, onClose, onEdit, onDelete, status, financialMetrics }) => {
  if (!goal) return null;
  
  const [scenariosExpanded, setScenariosExpanded] = useState(false);
  
  const progress = calculateGoalProgress(goal, 'time');
  const financialProgress = calculateGoalProgress(goal, 'financial', financialMetrics.availableMoney);
  const { icon, title, textColor, backgroundColor } = getStatusInfo(status);
  const availableMoney = financialMetrics.availableMoney || 0;
  const fixedValue = availableMoney > 0 ? (goal.goal_saving_minimum / 100) * availableMoney : 0;

  const creationDate = new Date(goal.created_at);
  const today = new Date();
  const daysPassed = Math.max(0, Math.floor((today - creationDate) / (1000 * 60 * 60 * 24)));
  const dailySaving = fixedValue / 30; // Aproximação
  const accumulated = dailySaving * daysPassed;

  // Verificar se há cenários disponíveis
  const hasScenarios = status && status.scenarios;
  
  // Função para alternar a visibilidade dos cenários
  const toggleScenarios = () => {
    setScenariosExpanded(!scenariosExpanded);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeaderContainer}>
            <Text style={styles.modalHeader}>{goal.name}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#2D3436" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <View style={styles.detailsGrid}>
              <View style={styles.detailsRow}>
                <View style={styles.detailsItem}>
                  <Text style={styles.detailsLabel}>Progress (Time)</Text>
                  <ProgressBar progress={progress} />
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailsItem}>
                  <Text style={styles.detailsLabel}>Progress (Financial)</Text>
                  <ProgressBar progress={financialProgress} color="#0984e3" />
                  <Text style={styles.detailsSubtext}>
                    {formatCurrency(accumulated)} / {formatCurrency(goal.amount)}
                  </Text>
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailsItem}>
                  <Text style={styles.detailsLabel}>Savings (%)</Text>
                  <Text style={styles.detailsValue}>
                    {Number(goal.goal_saving_minimum).toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.detailsItem}>
                  <Text style={styles.detailsLabel}>Fixed Value (€)</Text>
                  <Text style={styles.detailsValue}>
                    {formatCurrency(fixedValue)}
                  </Text>
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailsItem}>
                  <Text style={styles.detailsLabel}>Deadline</Text>
                  <Text style={styles.detailsValue}>
                    {new Date(goal.deadline).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.detailsItem}>
                  <Text style={styles.detailsLabel}>Target Amount</Text>
                  <Text style={styles.detailsValue}>
                    {formatCurrency(goal.amount)}
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
              </View>
            )}

            {/* Nova seção para mostrar cenários com botão de expansão */}
            {hasScenarios && (
              <View style={styles.scenariosContainer}>
                <TouchableOpacity 
                  style={styles.scenariosHeader}
                  onPress={toggleScenarios}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionTitle}>Análise de Cenários</Text>
                  <Ionicons 
                    name={scenariosExpanded ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color="#2D3436" 
                  />
                </TouchableOpacity>
                
                {scenariosExpanded && (
                  <View style={styles.scenariosContent}>
                    {/* Mostrar o cenário recomendado no topo, se disponível */}
                    {status.scenarios.recommendedScenario && (
                      <View style={styles.recommendedScenarioContainer}>
                        <Text style={styles.recommendedScenarioTitle}>Cenário Recomendado</Text>
                        <ScenarioItem
                          key="recommended"
                          title={status.scenarios.recommendedScenario.type === 'multiPriority' ? 
                            `Remover Prioridades ${status.scenarios.recommendedScenario.priorities?.join(', ')}` :
                            status.scenarios.recommendedScenario.type === 'expense' ?
                            `Remover Prioridade ${status.scenarios.recommendedScenario.priority}` :
                            status.scenarios.recommendedScenario.type === 'percentage' ?
                            `Ajustar Porcentagem` :
                            status.scenarios.recommendedScenario.type === 'combined' ?
                            `Ajustar Porcentagem + Prioridade ${status.scenarios.recommendedScenario.priority}` :
                            `Cenário Recomendado`
                          }
                          possible={status.scenarios.recommendedScenario.possible}
                          description={status.scenarios.recommendedScenario.message}
                          subDescription={status.scenarios.recommendedScenario.monthlySavings ? 
                            `Economia: ${formatCurrency(status.scenarios.recommendedScenario.monthlySavings)}/mês` : undefined}
                          expenseDetails={status.scenarios.recommendedScenario.expenseDetails}
                          highlighted={true}
                        />
                      </View>
                    )}

                    {/* Cenário Atual */}
                    <ScenarioItem 
                      title="Cenário Atual"
                      possible={status.scenarios.baseScenario.possible}
                      description={`Poupança atual: ${goal.goal_saving_minimum}% (${formatCurrency(status.scenarios.baseScenario.monthlyAmount)}/mês)`}
                      remaining={status.scenarios.baseScenario.remaining}
                    />

                    {/* Cenário de Ajuste de Porcentagem - só mostrar se não for o recomendado */}
                    {status.scenarios.percentageScenario && 
                     (!status.scenarios.recommendedScenario || 
                      status.scenarios.recommendedScenario.type !== 'percentage') && (
                      <ScenarioItem
                        title="Ajuste de Porcentagem"
                        possible={status.scenarios.percentageScenario.possible}
                        description={`Necessário: ${status.scenarios.percentageScenario.newPercentage.toFixed(2)}% (${formatCurrency(status.scenarios.percentageScenario.monthlyChange)} a mais/mês)`}
                      />
                    )}

                    {/* Cenários de Despesas Individuais - apenas mostrar os que não são o recomendado */}
                    {status.scenarios.expenseScenarios.map((scenario, index) => {
                      if (scenario.removedExpenses > 0 && 
                          (!status.scenarios.recommendedScenario || 
                           status.scenarios.recommendedScenario.type !== 'expense' || 
                           status.scenarios.recommendedScenario.priority !== scenario.priority)) {
                        return (
                          <ScenarioItem
                            key={`expense-${index}`}
                            title={`Remover Prioridade ${scenario.priority}`}
                            possible={scenario.possible}
                            description={`Despesas: ${formatCurrency(scenario.monthlySavings)}`}
                            subDescription={`Economia: ${formatCurrency(scenario.monthlySavings)}/mês`}
                            expenseDetails={scenario.expenseDetails}
                          />
                        );
                      }
                      return null;
                    })}

                    {/* Cenários Combinados - apenas mostrar os que não são o recomendado */}
                    {status.scenarios.combinedScenarios.map((scenario, index) => {
                      if (scenario.removedExpenses > 0 && 
                          (!status.scenarios.recommendedScenario || 
                           status.scenarios.recommendedScenario.type !== 'combined' || 
                           status.scenarios.recommendedScenario.priority !== scenario.priority)) {
                        return (
                          <ScenarioItem
                            key={`combined-${index}`}
                            title={`Porcentagem + Prioridade ${scenario.priority}`}
                            possible={scenario.possible}
                            description={`${scenario.newPercentage.toFixed(2)}% + remover despesas`}
                            subDescription={`Economia: ${formatCurrency(scenario.monthlySavings)}/mês`}
                            expenseDetails={scenario.expenseDetails}
                          />
                        );
                      }
                      return null;
                    })}
                    
                    {/* Cenários de Múltiplas Prioridades - apenas mostrar os que não são o recomendado */}
                    {status.scenarios.multiPriorityScenarios && status.scenarios.multiPriorityScenarios.map((scenario, index) => {
                      if (scenario.priorities && scenario.priorities.length > 1 && 
                          (!status.scenarios.recommendedScenario || 
                           status.scenarios.recommendedScenario.type !== 'multiPriority' || 
                           JSON.stringify(status.scenarios.recommendedScenario.priorities) !== JSON.stringify(scenario.priorities))) {
                        return (
                          <ScenarioItem
                            key={`multi-${index}`}
                            title={`Remover Prioridades ${scenario.priorities.join(', ')}`}
                            possible={scenario.possible}
                            description={`Economia total: ${formatCurrency(scenario.monthlySavings)}/mês`}
                            subDescription={`Total poupado: ${formatCurrency(scenario.newTotalSaved)}`}
                            expenseDetails={scenario.expenseDetails}
                          />
                        );
                      }
                      return null;
                    })}
                  </View>
                )}
              </View>
            )}

            <View style={styles.detailsActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={onEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={onDelete}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Componente para mostrar um cenário
const ScenarioItem = ({ 
  title, 
  possible, 
  description, 
  subDescription, 
  expenseDetails,
  remaining,
  highlighted = false 
}) => (
  <View style={[
    styles.scenarioItem, 
    highlighted && styles.highlightedScenarioItem
  ]}>
    <Ionicons 
      name={possible ? "checkmark-circle" : "close-circle"} 
      size={20} 
      color={possible ? "#00B894" : "#E74C3C"} 
    />
    <View style={styles.scenarioTextContainer}>
      <Text style={[
        styles.scenarioTitle,
        highlighted && { color: "#00B894", fontWeight: '700' }
      ]}>{title}</Text>
      <Text style={[
        styles.scenarioDescription,
        highlighted && { color: "#2D3436" }
      ]}>{description}</Text>
      {subDescription && (
        <Text style={[
          styles.scenarioSubDescription,
          highlighted && { color: "#2D3436", fontWeight: '500' }
        ]}>{subDescription}</Text>
      )}
      
      {remaining > 0 && (
        <Text style={styles.scenarioRemainingValue}>
          Sobra: {formatCurrency(remaining)}
        </Text>
      )}
      
      {/* Mostrar detalhes das despesas quando disponíveis */}
      {expenseDetails && expenseDetails.length > 0 && (
        <View style={styles.expenseDetailsContainer}>
          {expenseDetails.map((expense, index) => (
            <Text key={index} style={[
              styles.expenseDetailItem,
              highlighted && { color: "#2D3436" }
            ]}>
              • {expense.name}: {formatCurrency(expense.amount)}
              {expense.priority && ` (Prioridade ${expense.priority})`}
            </Text>
          ))}
        </View>
      )}
    </View>
  </View>
);

const GoalsPage = () => {
  // Estados consolidados
  const [goalState, setGoalState] = useState({
    isModalVisible: false,
    isDeleteModalVisible: false,
    isDetailsModalVisible: false,
    selectedGoal: null,
    goalToDelete: null,
    editingGoal: null
  });

  const [goals, setGoals] = useState([]);
  const [userId, setUserId] = useState(null);
  const [goalStatuses, setGoalStatuses] = useState({});
  const [financialMetrics, setFinancialMetrics] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    availableMoney: 0,
    totalSavingsPercentage: 0
  });

  // Alert states
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    deadline: new Date(),
    goal_saving_minimum: 20,
    fixedValue: '',
    inputType: 'percentage',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Função auxiliar para buscar dados financeiros
  const fetchFinancialData = async (userId) => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

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

      const totalIncome = incomes.reduce((sum, income) => {
        const days = income.frequencies?.days || 30;
        return sum + (income.amount * 30) / days;
      }, 0);

      const totalExpenses = expenses.reduce((sum, expense) => {
        const days = expense.frequencies?.days || 30;
        return sum + (expense.amount * 30) / days;
      }, 0);

      const availableMoney = totalIncome - totalExpenses;

      return { incomes, expenses, totalIncome, totalExpenses, availableMoney };
    } catch (error) {
      console.error('Error fetching financial data:', error);
      throw error;
    }
  };

  // Função para buscar metas
  const fetchGoals = async (userId) => {
    if (!userId) return;
    try {
      // Primeiro busca as metas
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Depois busca os dados financeiros necessários para os cálculos
      const { availableMoney } = await fetchFinancialData(userId);
      setFinancialMetrics(prev => ({
        ...prev,
        availableMoney
      }));
      
      if (data && data.length > 0) {
        // Calcular e atualizar os status de todas as metas
        const statuses = {};
        const updatePromises = [];
        
        // Para cada meta, calcula o status e atualiza no banco se necessário
        for (const goal of data) {
          try {
            const status = await calculateGoalStatus(goal, supabase);
            statuses[goal.id] = status;
            
            // Converter status para números se necessário
            const statusNum = typeof status.status === 'string' 
              ? (status.status === 'success' ? 1 : status.status === 'info' ? 2 : status.status === 'error' ? 3 : status.status === 'info-blue' ? 4 : 1)
              : status.status;
              
            // Atualizar apenas se o status for diferente do atual
            if (goal.status !== statusNum || goal.status_message !== status.message) {
              updatePromises.push(
                supabase
                  .from('goals')
                  .update({
                    status: statusNum,
                    status_message: status.message
                  })
                  .eq('id', goal.id)
              );
            }
          } catch (statusError) {
            console.error(`Error calculating status for goal ${goal.id}:`, statusError);
          }
        }
        
        // Executar todas as atualizações em paralelo
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          
          // Buscar as metas atualizadas
          const { data: updatedData } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
          if (updatedData) {
            setGoals(updatedData);
          } else {
            setGoals(data);
          }
        } else {
          setGoals(data);
        }
        
        setGoalStatuses(statuses);
      } else {
        setGoals([]);
        setGoalStatuses({});
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      setAlertMessage('Failed to fetch goals');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  // Função para calcular métricas financeiras
  const calculateFinancialMetrics = async (userId) => {
    if (!userId) return;

    try {
      const { totalIncome, totalExpenses, availableMoney } = await fetchFinancialData(userId);

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

    if (userId) {
      const interval = setInterval(() => {
        fetchGoals(userId);
        calculateFinancialMetrics(userId);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        fetchGoals(userId);
        calculateFinancialMetrics(userId);
      }
    }, [userId])
  );

  const handleAddGoal = () => {
    setGoalState(prev => ({
      ...prev,
      isModalVisible: true,
      editingGoal: null
    }));
    setFormData({
      name: '',
      amount: '',
      deadline: new Date(),
      goal_saving_minimum: 20,
      fixedValue: '',
      inputType: 'percentage',
    });
  };

  const handleEditGoal = (goal) => {
    setGoalState(prev => ({
      ...prev,
      isModalVisible: true,
      editingGoal: goal
    }));
    setFormData({
      name: goal.name,
      amount: goal.amount.toString(),
      deadline: new Date(goal.deadline),
      goal_saving_minimum: goal.goal_saving_minimum,
      fixedValue: '',
      inputType: 'percentage',
    });
  };

  const handleDeleteGoal = async () => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalState.goalToDelete.id);

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
      setGoalState(prev => ({
        ...prev,
        isDeleteModalVisible: false,
        goalToDelete: null
      }));
    }
  };

  const confirmDeleteGoal = (goal) => {
    setGoalState(prev => ({
      ...prev,
      isDeleteModalVisible: true,
      goalToDelete: goal
    }));
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

      const { data: userGoals, error: goalsError } = await supabase
        .from('goals')
        .select('id, goal_saving_minimum')
        .eq('user_id', userId);

      if (goalsError) throw goalsError;

      const allocation = calculateAllocationValue(
        userGoals,
        financialMetrics.availableMoney,
        goalState.editingGoal?.id,
        formData.goal_saving_minimum
      );

      if (!allocation.isValid) {
        setAlertMessage(allocation.message);
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      // Criar objeto de meta temporário para cálculo de status
      const tempGoal = {
        ...formData,
        amount: parseFloat(formData.amount),
        deadline: formData.deadline,
        goal_saving_minimum: allocation.validation.newPercentage,
        user_id: userId,
        created_at: goalState.editingGoal?.created_at || new Date().toISOString()
      };
      
      // Calcular status completo com análise de cenários
      const statusResult = await calculateGoalStatus(tempGoal, supabase);
      
      // Definir o valor numérico do status
      let statusValue = 1; // Padrão: Alcançável
      if (statusResult) {
        if (statusResult.status === 1 || statusResult.status === 'success') statusValue = 1;
        else if (statusResult.status === 2 || statusResult.status === 'info') statusValue = 2;
        else if (statusResult.status === 3 || statusResult.status === 'error') statusValue = 3;
        else if (statusResult.status === 4 || statusResult.status === 'info-blue') statusValue = 4;
      }

      const payload = {
        name: formData.name,
        amount: amount,
        deadline: formData.deadline.toISOString().split('T')[0],
        goal_saving_minimum: allocation.validation.newPercentage,
        user_id: userId,
        status: statusValue,
        status_message: statusResult?.message || '',
      };

      let error;
      if (goalState.editingGoal) {
        ({ error } = await supabase.from('goals').update(payload).eq('id', goalState.editingGoal.id));
      } else {
        ({ error } = await supabase.from('goals').insert([payload]));
      }

      if (error) throw error;

      setAlertMessage('Goal added successfully!');
      setAlertType('success');
      setShowAlert(true);
      setTimeout(() => {
        setGoalState(prev => ({
          ...prev,
          isModalVisible: false,
          editingGoal: null
        }));
      }, 2500);
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
    setGoalState(prev => ({
      ...prev,
      isDetailsModalVisible: true,
      selectedGoal: goal
    }));
  };

  const renderDatePicker = () => {
    if (Platform.OS === 'web') {
      return (
        <input
          type="date"
          style={{
            padding: 12,
            borderRadius: 8,
            border: '1px solid #DFE6E9',
            fontSize: 16,
            color: '#2D3436',
            backgroundColor: '#F8F9FA',
            width: '92%',
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
      );
    }

    return (
      <TouchableOpacity
        style={styles.modalInput}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.7}
      >
        <Text style={{ color: '#2D3436' }}>
          {formData.deadline ? formData.deadline.toLocaleDateString() : 'Select a date'}
        </Text>
        {showDatePicker && (
          <DateTimePicker
            value={formData.deadline}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setFormData(prev => ({ ...prev, deadline: selectedDate }));
              }
            }}
            minimumDate={new Date()}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderGoalItem = ({ item }) => {
    const status = goalStatuses[item.id];
    const creationDate = new Date(item.created_at);
    const deadlineDate = new Date(item.deadline);
    const today = new Date();
    const daysToDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    const totalDays = Math.max(1, Math.ceil((deadlineDate - creationDate) / (1000 * 60 * 60 * 24)));
    const availableMoney = financialMetrics.availableMoney || 0;
    const financialProgress = calculateGoalProgress(item, 'financial', availableMoney);
    
    // Calcular quanto já foi poupado
    const daysPassed = Math.max(0, Math.floor((today - creationDate) / (1000 * 60 * 60 * 24)));
    const fixedValue = availableMoney > 0 ? (item.goal_saving_minimum / 100) * availableMoney : 0;
    const dailySaving = fixedValue / 30; // aproximação mensal para diária
    const alreadySaved = dailySaving * daysPassed;
    
    // Calcular dias estimados para conclusão considerando valor já poupado
    const currentSaving = (item.goal_saving_minimum / 100) * availableMoney;
    const amountLeft = Math.max(0, item.amount - alreadySaved);
    const daysNeeded = currentSaving > 0 ? Math.ceil(amountLeft / (currentSaving / 30)) : Infinity;
    const daysEstimated = isFinite(daysNeeded) ? daysNeeded : 0;
    
    // Verificar se a meta será alcançada antes do prazo
    const willReachOnTime = daysEstimated <= daysToDeadline && daysEstimated > 0;

    // Usar o status do item se disponível, senão usar o calculado
    const effectiveStatus = item.status || (status ? status.status : 1);
    
    let statusIcon = 'checkmark-circle';
    let statusColor = '#00B894';
    
    // Definir o ícone e cor com base no status real da meta
    if (effectiveStatus === 4) {
      statusIcon = 'information-circle';
      statusColor = '#0984e3';
    } else if (effectiveStatus === 3) {
      statusIcon = 'close-circle';
      statusColor = '#E74C3C';
    } else if (effectiveStatus === 2) {
      statusIcon = 'warning';
      statusColor = '#FDCB6E';
    } else if (effectiveStatus === 1) {
      statusIcon = 'checkmark-circle';
      statusColor = '#00B894';
    }

    let daysMsg = '';
    if (daysToDeadline === 0) {
      daysMsg = 'Hoje!';
    } else if (daysToDeadline < 0) {
      daysMsg = 'Meta expirada';
    } else {
      // Voltar para o formato original mas incluindo a informação de dias
      daysMsg = `${daysToDeadline} dias (Deadline: ${totalDays} dias)`;
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
            {formatCurrency(item.amount || 0)}
          </Text>
        </View>
        <ProgressBar progress={financialProgress} color={statusColor} showPercentage={false} />
        <View style={styles.goalDeadlineContainer}>
          <View style={styles.deadlineRow}>
            <Text style={styles.goalDeadline}>
              Dias para meta: {daysMsg}
            </Text>
            <Text style={[styles.progressPercentage, { color: statusColor }]}> 
              {financialProgress.toFixed(1)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
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
          {formatCurrency(financialMetrics.totalIncome)}
        </Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Monthly Expenses</Text>
        <Text style={[styles.metricValue, styles.availableMoney]}>
          {formatCurrency(financialMetrics.totalExpenses)}
        </Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Available Money</Text>
        <Text style={[styles.metricValue, styles.availableMoney]}>
          {formatCurrency(financialMetrics.availableMoney)}
        </Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Savings Allocated</Text>
        <Text style={[styles.metricValue, { color: getSavingsColor(financialMetrics.totalSavingsPercentage) }]}> 
          {Number(financialMetrics.totalSavingsPercentage).toFixed(2)}% (
          {formatCurrency(((financialMetrics.totalSavingsPercentage / 100) * financialMetrics.availableMoney).toFixed(2))}
          )
        </Text>
      </View>
    </View>
  );

  const renderAlert = (showAlert, alertType, alertMessage, setShowAlert, inModal = false) => {
    if (!showAlert) return null;
    
    const containerStyle = inModal ? styles.alertContainerInModal : styles.alertContainer;
    
    return (
      <View style={containerStyle} pointerEvents="box-none">
        <AlertComponent
          type={alertType}
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      </View>
    );
  };

  const renderAddEditModal = () => {
    if (!goalState.isModalVisible) return null;

    return (
      <Modal
        visible={goalState.isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalState(prev => ({ ...prev, isModalVisible: false }))}
      >
        <View style={styles.modalOverlay}>
          {renderAlert(showAlert && goalState.isModalVisible, alertType, alertMessage, setShowAlert, true)}
          
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalHeader}>
                {goalState.editingGoal ? 'Edit Goal' : 'Add New Goal'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setGoalState(prev => ({ ...prev, isModalVisible: false }))}
              >
                <Ionicons name="close" size={24} color="#2D3436" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Goal Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter goal name"
                  placeholderTextColor="#95A5A6"
                />
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Amount</Text>
                <TextInput
                  style={styles.modalInput}
                  value={formData.amount.toString()}
                  onChangeText={(text) => {
                    const value = parseFloat(text.replace(/[^0-9.]/g, ''));
                    if (!isNaN(value)) {
                      setFormData({ ...formData, amount: value });
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="Enter amount in €"
                  placeholderTextColor="#95A5A6"
                />
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Deadline Date:</Text>
                {renderDatePicker()}
              </View>

              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>Savings Type</Text>
                <View style={styles.savingsTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.savingsTypeButton,
                      formData.inputType === 'percentage' && styles.savingsTypeButtonActive
                    ]}
                    onPress={() => handleSavingsTypeChange('percentage')}
                  >
                    <Text style={[
                      styles.savingsTypeButtonText,
                      formData.inputType === 'percentage' && styles.savingsTypeButtonTextActive
                    ]}>Percentage (%)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.savingsTypeButton,
                      formData.inputType === 'fixed' && styles.savingsTypeButtonActive
                    ]}
                    onPress={() => handleSavingsTypeChange('fixed')}
                  >
                    <Text style={[
                      styles.savingsTypeButtonText,
                      formData.inputType === 'fixed' && styles.savingsTypeButtonTextActive
                    ]}>Fixed Value (€)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {formData.inputType === 'fixed' ? (
                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Fixed Monthly Value (€)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter value in €"
                    keyboardType="decimal-pad"
                    value={formData.fixedValue.toString()}
                    onChangeText={(text) => {
                      const clean = text.replace(/[^0-9.]/g, '');
                      setFormData({
                        ...formData,
                        fixedValue: clean,
                        goal_saving_minimum: financialMetrics.availableMoney > 0 && !isNaN(parseFloat(clean)) ? ((parseFloat(clean) / financialMetrics.availableMoney) * 100) : 0,
                      });
                    }}
                  />
                  <Text style={styles.savingsDescription}>
                    {Number.isInteger(Number(formData.fixedValue)) ? 'Valor inteiro' : 'Valor decimal'}
                  </Text>
                  <Text style={styles.savingsDescription}>
                    Enter the fixed amount you want to save monthly
                  </Text>
                  <Text style={styles.savingsDescription}>
                    Percentage: {financialMetrics.availableMoney > 0 && !isNaN(parseFloat(formData.fixedValue)) ? ((parseFloat(formData.fixedValue) / financialMetrics.availableMoney) * 100).toFixed(2) + '%' : '--'}
                  </Text>
                </View>
              ) : (
                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>Savings Percentage</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter percentage"
                    keyboardType="decimal-pad"
                    value={formData.goal_saving_minimum.toString()}
                    onChangeText={(text) => {
                      const clean = text.replace(/[^0-9.]/g, '');
                      const percent = parseFloat(clean) || 0;
                      setFormData({
                        ...formData,
                        goal_saving_minimum: percent,
                        fixedValue: financialMetrics.availableMoney > 0
                          ? parseFloat(((percent / 100) * financialMetrics.availableMoney).toFixed(2))
                          : '',
                      });
                    }}
                  />
                  <Text style={styles.savingsDescription}>
                    {Number.isInteger(Number(formData.goal_saving_minimum)) ? 'Valor inteiro' : 'Valor decimal'}
                  </Text>
                  <Text style={styles.savingsDescription}>
                    This percentage will be taken from your available money after expenses
                  </Text>
                  <Text style={styles.savingsDescription}>
                    Fixed value: {financialMetrics.availableMoney > 0 ? formatCurrency(((formData.goal_saving_minimum / 100) * financialMetrics.availableMoney).toFixed(2)) : '--'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setGoalState(prev => ({ ...prev, isModalVisible: false }))}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveGoal}
              >
                <Ionicons name="save" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDeleteModal = () => {
    if (!goalState.goalToDelete) return null;

    return (
      <Modal
        visible={goalState.isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalState(prev => ({ ...prev, isDeleteModalVisible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning" size={32} color="#E74C3C" />
              <Text style={styles.deleteModalTitle}>Delete Goal</Text>
            </View>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete "{goalState.goalToDelete.name}"?
            </Text>
            <Text style={styles.deleteModalSubtext}>
              This action cannot be undone. All progress and data associated with this goal will be permanently deleted.
            </Text>
            <View style={styles.deleteModalButtonsContainer}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalCancelButton]}
                onPress={() => setGoalState(prev => ({ ...prev, isDeleteModalVisible: false }))}
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

  const handleSavingsTypeChange = (type) => {
    if (type === 'percentage' && formData.inputType === 'fixed' && financialMetrics.availableMoney > 0) {
      const percent = (parseFloat(formData.fixedValue) / financialMetrics.availableMoney) * 100;
      setFormData({
        ...formData,
        inputType: 'percentage',
        goal_saving_minimum: percent ? parseFloat(percent.toFixed(2)) : 0,
      });
    } else if (type === 'fixed' && formData.inputType === 'percentage' && financialMetrics.availableMoney > 0) {
      const fixed = (parseFloat(formData.goal_saving_minimum) / 100) * financialMetrics.availableMoney;
      setFormData({
        ...formData,
        inputType: 'fixed',
        fixedValue: fixed ? parseFloat(fixed.toFixed(2)) : 0,
      });
    } else {
      setFormData({ ...formData, inputType: type });
    }
  };

  const getSavingsColor = (percentage) => {
    if (percentage < 50) return '#00B894';
    if (percentage < 95) return '#FDCB6E';
    return '#E74C3C';
  };

  // Fecha o alerta automaticamente após 2 segundos
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  return (
    <View style={styles.container}>
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

      {renderAddEditModal()}

      {renderDeleteModal()}

      <GoalDetailsModal
        goal={goalState.selectedGoal}
        visible={goalState.isDetailsModalVisible}
        onClose={() => setGoalState(prev => ({ ...prev, isDetailsModalVisible: false }))}
        onEdit={() => {
          setGoalState(prev => ({ ...prev, isDetailsModalVisible: false }));
          handleEditGoal(goalState.selectedGoal);
        }}
        onDelete={() => {
          setGoalState(prev => ({ ...prev, isDetailsModalVisible: false }));
          confirmDeleteGoal(goalState.selectedGoal);
        }}
        status={goalState.selectedGoal ? goalStatuses[goalState.selectedGoal.id] : null}
        financialMetrics={financialMetrics}
      />

      {renderAlert(showAlert && !goalState.isModalVisible, alertType, alertMessage, setShowAlert)}
    </View>
  );
};

export default GoalsPage;

