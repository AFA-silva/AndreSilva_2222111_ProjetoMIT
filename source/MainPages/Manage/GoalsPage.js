import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../../Supabase';
import styles from '../../Styles/Manage/GoalsPageStyle';
import AlertComponent from '../../Utility/Alerts';
import { useFocusEffect } from '@react-navigation/native';
import { formatCurrency, calculateGoalProgress, calculateGoalStatus, calculateAllocationValue } from './GoalsCalc';
import Header from '../../Utility/Header';
import { LinearGradient } from 'expo-linear-gradient';
import { incrementGoalsCreated } from '../../Utility/StatisticsService';
import SkeletonLoading, { CardSkeleton, TextRowSkeleton } from '../../Utility/SkeletonLoading';

// Helper functions

const getStatusInfo = (status) => {
  const statusValue = status?.status || status;
  const statusConfig = {
    1: {
      icon: <Ionicons name="checkmark-circle" size={28} color="#00B894" />,
      title: 'Achievable Goal',
      textColor: '#00B894',
      backgroundColor: '#00B89420',
      message: 'This goal is achievable with current savings.'
    },
    2: {
      icon: <Ionicons name="warning" size={28} color="#FDCB6E" />,
      title: 'Possible with Adjustments',
      textColor: '#FDCB6E',
      backgroundColor: '#FDCB6E20',
      message: 'This goal is possible if you make savings adjustments.'
    },
    3: {
      icon: <Ionicons name="close-circle" size={28} color="#E74C3C" />,
      title: 'Goal Not Achievable',
      textColor: '#E74C3C',
      backgroundColor: '#E74C3C20',
      message: 'This goal is not achievable with current settings.'
    },
    4: {
      icon: <Ionicons name="information-circle" size={28} color="#0984e3" />,
      title: 'Goal Due Today!',
      textColor: '#0984e3',
      backgroundColor: '#d6eaff',
      message: 'Today is the goal deadline! Check if you\'ve reached the required amount.'
    }
  };
  return statusConfig[statusValue] || {
    icon: null,
    title: 'Goal Status',
    textColor: '#2D3436',
    backgroundColor: '#DFE6E920',
    message: 'Unknown status'
  };
};

// Progress Bar Component
const ProgressBar = ({ progress, color = '#00B894', showPercentage = true }) => (
  <View style={styles.progressContainer}>
    <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} />
    {showPercentage && <Text 
    style={styles.progressText}
    numberOfLines={1}
    adjustsFontSizeToFit={true}
  >{progress.toFixed(1)}%</Text>}
  </View>
);

// Skeleton Loading Components
const GoalItemSkeleton = () => (
  <View style={styles.goalItem}>
    <View style={styles.goalHeader}>
      <View style={styles.goalTitleContainer}>
        <SkeletonLoading variant="circular" width={24} height={24} style={{ marginRight: 8 }} />
        <SkeletonLoading variant="text" width={120} height={18} />
      </View>
      <SkeletonLoading variant="text" width={80} height={18} />
    </View>
    <SkeletonLoading variant="rounded" width="100%" height={8} style={{ marginBottom: 8 }} />
    <View style={styles.deadlineRow}>
      <SkeletonLoading variant="text" width={140} height={14} />
      <SkeletonLoading variant="text" width={40} height={14} />
    </View>
  </View>
);

const MetricsCardSkeleton = () => (
  <View style={styles.metricCard}>
    <SkeletonLoading variant="text" width={100} height={14} style={{ marginBottom: 8 }} />
    <SkeletonLoading variant="text" width={80} height={18} />
  </View>
);

const FullPageSkeleton = () => (
  <View style={styles.container}>
    <Header title="Financial Goals" />
    
    <View style={styles.actionsRow}>
      <SkeletonLoading variant="circular" width={40} height={40} />
      <SkeletonLoading variant="circular" width={40} height={40} />
    </View>

    <View style={{ marginTop: 10 }}>
      <View style={styles.financialMetricsContainer}>
        <MetricsCardSkeleton />
        <MetricsCardSkeleton />
      </View>
    </View>

    <View style={styles.listWrapper}>
      <GoalItemSkeleton />
      <GoalItemSkeleton />
    </View>
  </View>
);

// Goal Details Modal Component
const GoalDetailsModal = ({ goal, visible, onClose, onEdit, onDelete, status, financialMetrics }) => {
  if (!goal) return null;
  
  const progress = calculateGoalProgress(goal, 'time');
  const financialProgress = calculateGoalProgress(goal, 'financial', financialMetrics.availableMoney);
  
  // Calculate deadline status properly
  const today = new Date();
  const deadlineDate = new Date(goal.deadline);
  const daysToDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
  const isExpired = daysToDeadline < 0;
  const isDueToday = daysToDeadline === 0;
  
  // Determine the correct status to display
  let displayStatus = status;
  if (isDueToday && (!status || status.status !== 4)) {
    // Override with "due today" status
    displayStatus = {
      status: 4,
      message: 'Today is the goal deadline! Check if you\'ve reached the required amount.',
      scenarios: status?.scenarios
    };
  } else if (isExpired && status && status.status !== 3) {
    // For expired goals, prioritize the detailed analysis message over "expired"
    // Keep the detailed status unless it's clearly not calculated properly
    if (status.message && status.message !== 'Goal expired') {
      // Keep the existing detailed status
      displayStatus = status;
    } else {
      // Override with expired status
      displayStatus = {
        status: 3,
        message: 'This goal has already expired. Review scenarios below to adjust your approach.',
        scenarios: status?.scenarios
      };
    }
  }
  
  const { icon, title, textColor, backgroundColor } = getStatusInfo(displayStatus);
  const availableMoney = financialMetrics.availableMoney || 0;
  const fixedValue = availableMoney > 0 ? (goal.goal_saving_minimum / 100) * availableMoney : 0;

  const creationDate = new Date(goal.created_at);
  const daysPassed = Math.max(0, Math.floor((today - creationDate) / (1000 * 60 * 60 * 24)));
  const dailySaving = fixedValue / 30; // Approximation
  const accumulated = dailySaving * daysPassed;

  // Check if scenarios are available
  const hasScenarios = displayStatus && displayStatus.scenarios;

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
                  <ProgressBar progress={financialProgress} color="#00B894" />
                  <Text 
                    style={styles.detailsSubtext}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                  >
                    {formatCurrency(accumulated)} / {formatCurrency(goal.amount)}
                  </Text>
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailsItem}>
                  <Text style={styles.detailsLabel}>Savings (%)</Text>
                  <Text 
                    style={styles.detailsValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                  >
                    {Number(goal.goal_saving_minimum).toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.detailsItem}>
                  <Text style={styles.detailsLabel}>Fixed Value (€)</Text>
                  <Text 
                    style={styles.detailsValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                  >
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
                  <Text 
                    style={styles.detailsValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                  >
                    {formatCurrency(goal.amount)}
                  </Text>
                </View>
              </View>
            </View>

            {displayStatus && displayStatus.message && (
              <View style={[styles.statusContainer, { backgroundColor }]}>
                <View style={styles.statusHeader}>
                  <View style={styles.statusIcon}>{icon}</View>
                  <Text style={[styles.statusTitle, { color: textColor }]}>
                    {title}
                  </Text>
                </View>
                <Text style={[styles.statusText, { color: textColor }]}>
                  {displayStatus.message}
                </Text>
              </View>
            )}

            {/* Scenario Analysis Section - Always Show */}
            <View style={styles.scenariosContainer}>
              <View style={styles.scenariosHeader}>
                <Ionicons name="analytics" size={20} color="#00B894" />
                <Text style={styles.sectionTitle}>Scenario Analysis</Text>
              </View>
              
              <View style={styles.scenariosContent}>
                {/* Show scenarios if available, otherwise show basic info */}
                {hasScenarios ? (
                  <>
                    {/* Recommended Scenario */}
                    {displayStatus.scenarios.recommendedScenario && (
                      <ScenarioCard
                        type="recommended"
                        title={getScenarioTitle(displayStatus.scenarios.recommendedScenario)}
                        description={displayStatus.scenarios.recommendedScenario.message}
                        subDescription={displayStatus.scenarios.recommendedScenario.monthlySavings ? 
                          `Monthly Savings: ${formatCurrency(displayStatus.scenarios.recommendedScenario.monthlySavings)}` : undefined}
                        expenseDetails={displayStatus.scenarios.recommendedScenario.expenseDetails}
                        possible={displayStatus.scenarios.recommendedScenario.possible}
                      />
                    )}

                    {/* Current Scenario - Always Show First */}
                    <ScenarioCard
                      type="current"
                      title="Current Configuration"
                      description={`Saving ${goal.goal_saving_minimum}% monthly (${formatCurrency(displayStatus.scenarios.baseScenario.monthlyAmount)}/month)`}
                      subDescription={(() => {
                        if (isExpired) {
                          return `Goal expired. Consider extending deadline or adjusting target.`;
                        } else if (displayStatus.scenarios.baseScenario.possible) {
                          return `Total at deadline: ${formatCurrency(displayStatus.scenarios.baseScenario.totalSaved)}`;
                        } else {
                          return `Shortfall: ${formatCurrency(goal.amount - displayStatus.scenarios.baseScenario.totalSaved)}`;
                        }
                      })()}
                      possible={displayStatus.scenarios.baseScenario.possible}
                      remaining={displayStatus.scenarios.baseScenario.remaining}
                    />

                    {/* Show the 3 best alternative scenarios */}
                    {(() => {
                      const allScenarios = [];
                      
                      // Add percentage scenario if different from recommended
                      if (displayStatus.scenarios.percentageScenario && 
                          (!displayStatus.scenarios.recommendedScenario || 
                           displayStatus.scenarios.recommendedScenario.type !== 'percentage')) {
                        allScenarios.push({
                          ...displayStatus.scenarios.percentageScenario,
                          type: "percentage",
                          title: "Increase Savings Percentage",
                          description: `Adjust to ${displayStatus.scenarios.percentageScenario.newPercentage.toFixed(2)}% savings rate`,
                          subDescription: `Additional: ${formatCurrency(displayStatus.scenarios.percentageScenario.monthlyChange)}/month`,
                          sortKey: displayStatus.scenarios.percentageScenario.newPercentage
                        });
                      }
                      
                      // Add expense scenarios
                      displayStatus.scenarios.expenseScenarios.filter(s => 
                        s.removedExpenses > 0 && 
                        (!displayStatus.scenarios.recommendedScenario || 
                         displayStatus.scenarios.recommendedScenario.type !== 'expense' || 
                         displayStatus.scenarios.recommendedScenario.priority !== s.priority)
                      ).forEach(scenario => {
                        allScenarios.push({
                          ...scenario,
                          type: "expense",
                          title: `Remove Priority ${scenario.priority} Expenses`,
                          description: `Free up ${formatCurrency(scenario.monthlySavings)}/month`,
                          sortKey: scenario.priority
                        });
                      });
                      
                      // Add multi-priority scenarios
                      if (displayStatus.scenarios.multiPriorityScenarios) {
                        displayStatus.scenarios.multiPriorityScenarios.filter(s =>
                          s.priorities && s.priorities.length > 1 &&
                          (!displayStatus.scenarios.recommendedScenario || 
                           displayStatus.scenarios.recommendedScenario.type !== 'multiPriority' || 
                           JSON.stringify(displayStatus.scenarios.recommendedScenario.priorities) !== JSON.stringify(s.priorities))
                        ).forEach(scenario => {
                          allScenarios.push({
                            ...scenario,
                            type: "multiPriority",
                            title: `Remove Priorities ${scenario.priorities.join(', ')}`,
                            description: `Total savings: ${formatCurrency(scenario.monthlySavings)}/month`,
                            sortKey: scenario.priorities.reduce((sum, p) => sum + p, 0)
                          });
                        });
                      }
                      
                      // Add combined scenarios
                      if (displayStatus.scenarios.combinedScenarios) {
                        displayStatus.scenarios.combinedScenarios.filter(s =>
                          (!displayStatus.scenarios.recommendedScenario || 
                           displayStatus.scenarios.recommendedScenario.type !== 'combined' || 
                           displayStatus.scenarios.recommendedScenario.priority !== s.priority)
                        ).forEach(scenario => {
                          allScenarios.push({
                            ...scenario,
                            type: "combined",
                            title: `Adjust to ${scenario.newPercentage.toFixed(2)}% + Remove Priority ${scenario.priority}`,
                            description: `Combined approach: savings adjustment + expense removal`,
                            subDescription: `Free up ${formatCurrency(scenario.monthlySavings)}/month`,
                            sortKey: scenario.priority + (scenario.newPercentage / 100)
                          });
                        });
                      }
                      
                                             // Sort scenarios: possible first, then by sortKey (lower is better)
                       const sortedScenarios = allScenarios.sort((a, b) => {
                         if (a.possible && !b.possible) return -1;
                         if (!a.possible && b.possible) return 1;
                         return a.sortKey - b.sortKey;
                       });
                       
                       // For expired goals, prioritize achievable scenarios
                       const deadlineDate = new Date(goal.deadline);
                       const today = new Date();
                       const isExpired = deadlineDate < today;
                       
                       let scenariosToShow;
                       if (isExpired) {
                         // Add a special "extend deadline" scenario for expired goals
                         const extendDeadlineScenario = {
                           type: "possible",
                           title: "Extend Goal Deadline",
                           description: "Adjust your deadline to give yourself more time",
                           subDescription: `Continue with current ${goal.goal_saving_minimum}% savings rate`,
                           possible: true,
                           sortKey: 0 // Highest priority for expired goals
                         };
                         
                         // For expired goals, show extend deadline first, then possible scenarios, then closest impossible ones
                         const possibleScenarios = sortedScenarios.filter(s => s.possible);
                         const impossibleScenarios = sortedScenarios.filter(s => !s.possible);
                         scenariosToShow = [extendDeadlineScenario, ...possibleScenarios, ...impossibleScenarios].slice(0, 3);
                       } else {
                         // For non-expired goals, show up to 3 closest scenarios
                         scenariosToShow = sortedScenarios.slice(0, 3);
                       }
                       
                       return scenariosToShow.map((scenario, index) => (
                        <ScenarioCard
                          key={`scenario-${scenario.type}-${index}`}
                          type={scenario.possible ? "possible" : "impossible"}
                          title={scenario.title}
                          description={scenario.description}
                          subDescription={scenario.subDescription}
                          expenseDetails={scenario.expenseDetails}
                          possible={scenario.possible}
                        />
                      ));
                    })()}
                  </>
                ) : (
                  /* Basic scenario when detailed analysis isn't available */
                  <>
                    <ScenarioCard
                      type="current"
                      title="Current Configuration"
                      description={`Saving ${goal.goal_saving_minimum}% of available money monthly`}
                      subDescription={`Monthly amount: ${formatCurrency(fixedValue)}`}
                      possible={true}
                    />
                    
                    {/* Show basic alternative scenarios */}
                    <ScenarioCard
                      type="possible"
                      title="Increase Savings Rate"
                      description="Consider increasing your savings percentage"
                      subDescription="Adjust your monthly savings allocation"
                      possible={true}
                    />
                    
                    <ScenarioCard
                      type="possible"
                      title="Reduce Expenses"
                      description="Look for expenses to cut or optimize"
                      subDescription="Free up more money for your goal"
                      possible={true}
                    />
                    
                    <ScenarioCard
                      type="possible"
                      title="Extend Deadline"
                      description="Consider adjusting your goal timeline"
                      subDescription="Give yourself more time to reach the target"
                      possible={true}
                    />
                  </>
                )}
              </View>
            </View>

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

// Helper function to get scenario title
const getScenarioTitle = (scenario) => {
  switch (scenario.type) {
    case 'multiPriority':
      return `Remove Priority ${scenario.priorities?.join(', ')} Expenses`;
    case 'expense':
      return `Remove Priority ${scenario.priority} Expenses`;
    case 'percentage':
      return 'Increase Savings Percentage';
    case 'combined':
      return `Adjust Percentage + Remove Priority ${scenario.priority}`;
    default:
      return 'Recommended Action';
  }
};

// Modern Scenario Card Component
const ScenarioCard = ({ 
  type,
  title, 
  description, 
  subDescription, 
  expenseDetails,
  remaining,
  possible
}) => {
  const getCardStyle = () => {
    switch (type) {
      case 'recommended':
        return styles.recommendedScenarioCard;
      case 'possible':
        return styles.possibleScenarioCard;
      case 'impossible':
        return styles.impossibleScenarioCard;
      case 'current':
        return styles.currentScenarioCard;
      default:
        return styles.scenarioCard;
    }
  };

  const getIconStyle = () => {
    switch (type) {
      case 'recommended':
        return styles.recommendedIcon;
      case 'possible':
        return styles.possibleIcon;
      case 'impossible':
        return styles.impossibleIcon;
      case 'current':
        return styles.currentIcon;
      default:
        return styles.possibleIcon;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'recommended':
        return 'star';
      case 'possible':
        return 'checkmark-circle';
      case 'impossible':
        return 'close-circle';
      case 'current':
        return 'information-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <View style={[styles.scenarioCard, getCardStyle()]}>
      {type === 'recommended' && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
        </View>
      )}
      
      <View style={styles.scenarioHeader}>
        <View style={[styles.scenarioIcon, getIconStyle()]}>
          <Ionicons 
            name={getIcon()} 
            size={12} 
            color="#FFFFFF" 
          />
        </View>
        <Text style={styles.scenarioTitle}>{title}</Text>
      </View>
      
      <Text style={styles.scenarioDescription}>{description}</Text>
      
      {subDescription && (
        <Text style={styles.scenarioSubDescription}>{subDescription}</Text>
      )}
      
      {remaining && remaining > 0 && (
        <Text style={styles.scenarioRemainingValue}>
          💰 Leftover: {formatCurrency(remaining)}
        </Text>
      )}
      
      {/* Show expense details when available */}
      {expenseDetails && expenseDetails.length > 0 && (
        <View style={styles.expenseDetailsContainer}>
          <Text style={[styles.scenarioSubDescription, { fontWeight: '600', marginBottom: 4 }]}>
            Affected Expenses:
          </Text>
          {expenseDetails.slice(0, 3).map((expense, index) => (
            <Text key={index} style={styles.expenseDetailItem}>
              • {expense.name}: {formatCurrency(expense.amount)}
              {expense.priority && ` (Priority ${expense.priority})`}
            </Text>
          ))}
          {expenseDetails.length > 3 && (
            <Text style={styles.expenseDetailItem}>
              ... and {expenseDetails.length - 3} more
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const GoalsPage = ({ navigation }) => {
  // Consolidated states
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
    availableAfterAllocation: 0,
    totalSavingsPercentage: 0
  });

  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  // Helper function to fetch financial data
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

  // Function to fetch goals (optimized for speed)
  const fetchGoals = async (userId, isInitialLoad = false) => {
    if (!userId) return;
    try {
      if (isInitialLoad) {
        setInitialLoading(true);
      }
      
      // First fetch the goals
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Set goals immediately
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setAlertMessage('Failed to fetch goals');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      if (isInitialLoad) {
        setInitialLoading(false);
      }
    }
  };

  // Function to calculate financial metrics
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

      // Calculate allocated amount and available after allocation
      const allocatedAmount = (totalSavingsPercentage / 100) * availableMoney;
      const availableAfterAllocation = availableMoney - allocatedAmount;

      setFinancialMetrics({
        totalIncome,
        totalExpenses,
        availableMoney,
        availableAfterAllocation,
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
          // Load goals first (fast) - this is initial load
          await fetchGoals(user.id, true);
          // Load financial metrics in background
          setTimeout(() => calculateFinancialMetrics(user.id), 200);
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
        fetchGoals(userId, false); // Not initial load
        calculateFinancialMetrics(userId);
      }, 30000); // Increased interval to 30 seconds
      return () => clearInterval(interval);
    }
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        // Quick refresh of goals only - not initial load
        fetchGoals(userId, false);
        // Financial metrics refresh in background if needed
        setTimeout(() => calculateFinancialMetrics(userId), 300);
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
      amount: goal.amount ? goal.amount.toString() : '',
      deadline: new Date(goal.deadline),
      goal_saving_minimum: goal.goal_saving_minimum,
      fixedValue: '',
      inputType: 'percentage',
    });
  };

  const handleDeleteGoal = async () => {
    try {
      const goalId = goalState.goalToDelete.id;
      
      // Delete the goal
      const { error: goalError } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (goalError) throw goalError;

      // Delete associated calendar event
      const { error: calendarError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('event_id', goalId)
        .eq('type', 'goal');

      if (calendarError) {
        console.warn('Error deleting calendar event:', calendarError);
        // Don't throw error for calendar deletion failure
      }

      setAlertMessage('Goal deleted successfully');
      setAlertType('success');
      setShowAlert(true);
      await fetchGoals(userId, false);
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
      if (isNaN(amount) || amount <= 0 || formData.amount === '') {
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

      // Create temporary goal object for status calculation
      const tempGoal = {
        ...formData,
        amount: parseFloat(formData.amount),
        deadline: formData.deadline,
        goal_saving_minimum: allocation.validation.newPercentage,
        user_id: userId,
        created_at: goalState.editingGoal?.created_at || new Date().toISOString()
      };
      
      // Calculate complete status with scenario analysis
      const statusResult = await calculateGoalStatus(tempGoal, supabase);
      
      // Define numeric status value
      let statusValue = 1; // Default: Achievable
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
        status: statusValue
      };

      let error, insertedGoal;
      if (goalState.editingGoal) {
        ({ error } = await supabase.from('goals').update(payload).eq('id', goalState.editingGoal.id));
      } else {
        const insertResult = await supabase.from('goals').insert([payload]).select();
        error = insertResult.error;
        insertedGoal = insertResult.data && insertResult.data[0];
        // Automatically add to calendar if successfully created
        if (!error && insertedGoal) {
          await supabase.from('calendar_events').insert([
            {
              user_id: userId,
              type: 'goal',
              date: payload.deadline, // Use the deadline as the calendar event date
              event_id: insertedGoal.id,
              is_recurring: false
            }
          ]);
        }
      }

      if (error) throw error;

      // Update statistics only when adding new goal (not editing)
      if (!goalState.editingGoal) {
        await incrementGoalsCreated(userId);
        console.log('Statistics updated: goals count incremented');
      }

      setAlertMessage(goalState.editingGoal ? 'Goal updated successfully!' : 'Goal added successfully!');
      setAlertType('success');
      setShowAlert(true);
      setTimeout(() => {
        setGoalState(prev => ({
          ...prev,
          isModalVisible: false,
          editingGoal: null
        }));
      }, 2500);
      await fetchGoals(userId, false); // Not initial load
      await calculateFinancialMetrics(userId);
    } catch (error) {
      console.error('Error saving goal:', error);
      setAlertMessage(error.message || 'Error saving goal');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const handleGoalPress = async (goal) => {
    setGoalState(prev => ({
      ...prev,
      isDetailsModalVisible: true,
      selectedGoal: goal
    }));
    
    // Calculate detailed status only when opening details
    try {
      const detailedStatus = await calculateGoalStatus(goal, supabase);
      setGoalStatuses(prev => ({
        ...prev,
        [goal.id]: detailedStatus
      }));
    } catch (error) {
      console.error('Error calculating detailed status:', error);
    }
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
    const status = goalStatuses[item.id]; // Only used for detailed status when available
    const creationDate = new Date(item.created_at);
    const deadlineDate = new Date(item.deadline);
    const today = new Date();
    const daysToDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    const availableMoney = financialMetrics.availableMoney || 0;
    const financialProgress = calculateGoalProgress(item, 'financial', availableMoney);
    
    // Use stored database status as primary source
    const effectiveStatus = item.status || 1;
    
    // Set status display based on stored status
    let statusIcon = 'checkmark-circle';
    let statusColor = '#00B894';
    
    if (effectiveStatus === 4) {
      statusIcon = 'information-circle';
      statusColor = '#0984e3';
    } else if (effectiveStatus === 3) {
      statusIcon = 'close-circle';
      statusColor = '#E74C3C';
    } else if (effectiveStatus === 2) {
      statusIcon = 'warning';
      statusColor = '#FDCB6E';
    } else {
      statusIcon = 'checkmark-circle';
      statusColor = '#00B894';
    }

    // Calculate days message based on deadline
    let daysMsg = '';
    if (daysToDeadline === 0) {
      daysMsg = 'Due today!';
    } else if (daysToDeadline < 0) {
      daysMsg = 'Goal expired';
    } else if (daysToDeadline === 1) {
      daysMsg = '1 day left';
    } else {
      daysMsg = `${daysToDeadline} days left`;
    }

    return (
      <TouchableOpacity
        style={styles.goalItem}
        onPress={() => handleGoalPress(item)}
      >
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleContainer}>
            <Ionicons name={statusIcon} size={24} color={statusColor} style={styles.warningIcon} />
            <Text 
              style={styles.goalTitle}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
            >{item.name}</Text>
          </View>
          <Text 
            style={styles.goalAmount}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            {formatCurrency(item.amount || 0)}
          </Text>
        </View>
        <ProgressBar progress={financialProgress} color={statusColor} showPercentage={false} />
        <View style={styles.goalDeadlineContainer}>
          <View style={styles.deadlineRow}>
            <Text style={styles.goalDeadline}>
              {daysMsg}
            </Text>
            <Text 
              style={[styles.progressPercentage, { color: statusColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
            > 
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
        <Text 
          style={[styles.metricSubValue, { color: '#7F8C8D' }]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
        >
          After allocation: {formatCurrency(financialMetrics.availableAfterAllocation)}
        </Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Savings Allocated</Text>
        <Text 
          style={[styles.metricValue, { color: getSavingsColor(financialMetrics.totalSavingsPercentage) }]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
        > 
          {Number(financialMetrics.totalSavingsPercentage).toFixed(2)}%
        </Text>
        <Text 
          style={[styles.metricValue, { color: getSavingsColor(financialMetrics.totalSavingsPercentage) }]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
        > 
          {formatCurrency(((financialMetrics.totalSavingsPercentage / 100) * financialMetrics.availableMoney).toFixed(2))}
        </Text>
      </View>
    </View>
  );

  const renderAlert = (showAlert, alertType, alertMessage, setShowAlert, inModal = false) => {
    if (!showAlert) return null;
    
    const containerStyle = inModal ? styles.alertContainerInModal : styles.alertContainer;
    
    return (
      <View style={[containerStyle, { pointerEvents: 'box-none' }]}>
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

            <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={true}>
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
                    // Clean the text to only allow numbers and decimal point
                    const cleanedText = text.replace(/[^0-9.]/g, '');
                    
                    // Handle empty string case (when user deletes everything)
                    if (cleanedText === '') {
                      setFormData({ ...formData, amount: '' });
                      return;
                    }
                    
                    // Handle valid numbers
                    const value = parseFloat(cleanedText);
                    if (!isNaN(value)) {
                      setFormData({ ...formData, amount: cleanedText });
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
                    <Text 
                      style={[
                        styles.savingsTypeButtonText,
                        formData.inputType === 'percentage' && styles.savingsTypeButtonTextActive
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                    >Percentage (%)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.savingsTypeButton,
                      formData.inputType === 'fixed' && styles.savingsTypeButtonActive
                    ]}
                    onPress={() => handleSavingsTypeChange('fixed')}
                  >
                    <Text 
                      style={[
                        styles.savingsTypeButtonText,
                        formData.inputType === 'fixed' && styles.savingsTypeButtonTextActive
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                    >Fixed Value (€)</Text>
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
                      
                      // Handle empty string case
                      if (clean === '') {
                        setFormData({
                          ...formData,
                          fixedValue: '',
                          goal_saving_minimum: 0,
                        });
                        return;
                      }
                      
                      // Handle valid numbers
                      const value = parseFloat(clean);
                      if (!isNaN(value)) {
                        setFormData({
                          ...formData,
                          fixedValue: clean,
                          goal_saving_minimum: financialMetrics.availableMoney > 0 ? ((value / financialMetrics.availableMoney) * 100) : 0,
                        });
                      }
                    }}
                  />
                  <Text style={styles.savingsDescription}>
                    {Number.isInteger(Number(formData.fixedValue)) ? 'Integer value' : 'Decimal value'}
                  </Text>
                  <Text style={styles.savingsDescription}>
                    Enter the fixed amount you want to save monthly
                  </Text>
                  <Text 
                    style={styles.savingsDescription}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                  >
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
                      
                      // Handle empty string case
                      if (clean === '') {
                        setFormData({
                          ...formData,
                          goal_saving_minimum: 0,
                          fixedValue: '',
                        });
                        return;
                      }
                      
                      // Handle valid numbers
                      const percent = parseFloat(clean);
                      if (!isNaN(percent)) {
                        setFormData({
                          ...formData,
                          goal_saving_minimum: percent,
                          fixedValue: financialMetrics.availableMoney > 0
                            ? ((percent / 100) * financialMetrics.availableMoney).toFixed(2)
                            : '',
                        });
                      }
                    }}
                  />
                  <Text style={styles.savingsDescription}>
                    {Number.isInteger(Number(formData.goal_saving_minimum)) ? 'Integer value' : 'Decimal value'}
                  </Text>
                  <Text style={styles.savingsDescription}>
                    This percentage will be taken from your available money after expenses
                  </Text>
                  <Text 
                    style={styles.savingsDescription}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                  >
                    Fixed value: {financialMetrics.availableMoney > 0 ? formatCurrency(((formData.goal_saving_minimum / 100) * financialMetrics.availableMoney).toFixed(2)) : '--'}
                  </Text>
                </View>
              )}

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
            </ScrollView>
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

  // Close alert automatically after 2 seconds
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Show skeleton loading only for initial load when page is first opened
  if (initialLoading) {
    return <FullPageSkeleton />;
  }

  return (
    <View style={styles.container}>
      <Header title="Financial Goals" />

      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={styles.backIconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#FF8400" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.addIconButton}
          onPress={handleAddGoal}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={24} color="#FF8400" />
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 10 }}>
        {renderFinancialMetrics()}
      </View>

      <View style={styles.listWrapper}>
        <FlatList
          data={goals}
          renderItem={renderGoalItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchGoals(userId, false).finally(() => setRefreshing(false)); // Not initial load
          }}
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

