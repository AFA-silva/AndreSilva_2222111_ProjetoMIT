import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../Styles/MainPageStyles/MainMenuPageStyle';
import { supabase } from '../../Supabase';
import { GoalOverviewSkeleton, NetIncomeSkeleton } from '../Utility/SkeletonLoading';
import { GaugeChart } from '../Utility/Chart';
import Header from '../Utility/Header';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentCurrency, formatCurrency, loadSavedCurrency, addCurrencyChangeListener, removeCurrencyChangeListener } from '../Utility/FetchCountries';
import { 
  fetchGoalsByUser, 
  fetchIncomesByUser, 
  fetchExpensesByUser,
  fetchUserSettings,
  getSession,
  fetchUserCurrencyPreference
} from '../Utility/MainQueries';

// Centralized log system to avoid repetitions
const logManager = {
  lastLogs: {},
  debounceTimeouts: {},
  logCount: {},
  
  // Log with repetition control
  log: function(key, message, force = false) {
    const now = Date.now();
    const lastTime = this.lastLogs[key] || 0;
    const count = this.logCount[key] || 0;
    
    // Avoid repeated logs in less than 2 seconds
    if (force || now - lastTime > 2000) {
      // If there were suppressed repeated logs, show the counter
      if (count > 0) {
        console.log(`[${key}] Previous message repeated ${count} times`);
        this.logCount[key] = 0;
      }
      
      console.log(`[${key}] ${message}`);
      this.lastLogs[key] = now;
    } else {
      // Increment suppressed logs counter
      this.logCount[key] = count + 1;
    }
  },
  
  // Log with debounce (groups logs in an interval)
  debounce: function(key, message, delay = 300) {
    clearTimeout(this.debounceTimeouts[key]);
    this.debounceTimeouts[key] = setTimeout(() => {
      console.log(`[${key}] ${message}`);
    }, delay);
  },
  
  // Error log always displayed
  error: function(key, message, error) {
    console.error(`[ERROR - ${key}] ${message}`, error);
  }
};

const MainMenuPage = ({ navigation }) => {
  // States to store dashboard data
  const [okCount, setOkCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [availableMoney, setAvailableMoney] = useState(0);
  const [usagePercentage, setUsagePercentage] = useState(0); // Start with 0%
  const [savingsAmount, setSavingsAmount] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dominantGoalStatus, setDominantGoalStatus] = useState('achievable');
  const [refreshKey, setRefreshKey] = useState(0);
  const [goals, setGoals] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [userCurrency, setUserCurrency] = useState(null);
  const [error, setError] = useState(null);
  
  // Operations tracker to avoid duplicate calls
  const operationsInProgress = useRef(new Set()).current;

  // Add new state for modal accessibility
  const [modalAccessibility, setModalAccessibility] = useState({
    isVisible: false,
    shouldHideContent: false
  });

  // Add data caching
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const CACHE_DURATION = 30000; // 30 seconds cache

  // Layout sections to render in FlatList
  const sections = [
    { key: 'netIncome', type: 'netIncome' },
    { key: 'goalStatus', type: 'goalStatus' }
  ];

  // Effect to load data when component mounts and ensure the correct currency is used
  useEffect(() => {
    // Unique identifier for this component instance
    const componentId = `MainMenu_${Date.now()}`;
    logManager.log('Lifecycle', `Component mounted [ID: ${componentId}]`, true);
    
    // Data initialization with control to avoid duplicate calls
    const loadData = async () => {
      if (operationsInProgress.has('initialLoad')) {
        logManager.log('Initialization', 'Initial loading already in progress, ignoring duplicate call');
        return;
      }
      
      operationsInProgress.add('initialLoad');
      logManager.log('Initialization', 'Starting initial data loading', true);
      
      try {
        await loadSavedCurrency();
        await loadDashboardData(true); // true indicates initial loading
      } catch (error) {
        logManager.error('Initialization', 'Error initializing currency', error);
        loadDashboardData(true);
      } finally {
        operationsInProgress.delete('initialLoad');
      }
    };
    
    loadData();
    
    // Load user currency directly from the database
    const loadUserCurrency = async () => {
      if (operationsInProgress.has('loadCurrency')) {
        logManager.log('Currency', 'Currency loading already in progress');
        return;
      }
      
      operationsInProgress.add('loadCurrency');
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const { data, error } = await supabase
            .from('user_currency_preferences')
            .select('actual_currency')
            .eq('user_id', session.user.id)
            .single();
            
          if (!error && data) {
            const currencyInfo = {
              code: data.actual_currency,
              symbol: data.actual_currency,
              name: data.actual_currency
            };
            setUserCurrency(currencyInfo);
            logManager.log('Currency', `Currency loaded directly from database: ${currencyInfo.code}`, true);
          }
        }
      } catch (error) {
        logManager.error('Currency', 'Error loading user currency', error);
      } finally {
        operationsInProgress.delete('loadCurrency');
      }
    };
    
    loadUserCurrency();
    
    // Add listener for currency changes
    const handleCurrencyChange = (newCurrency) => {
      if (!newCurrency) return;
      
      logManager.log('Currency', `Currency changed to: ${newCurrency.code}`, true);
      setUserCurrency(newCurrency);
      setRefreshKey(prev => prev + 1);
    };
    
    // Register currency listener
    addCurrencyChangeListener(handleCurrencyChange);
    
    // Add focus listener with debounce to avoid excessive reloads
    let focusDebounceTimeout;
    const unsubscribe = navigation.addListener('focus', () => {
      clearTimeout(focusDebounceTimeout);
      focusDebounceTimeout = setTimeout(() => {
        if (!loading && !operationsInProgress.has('loadDashboard')) {
          logManager.log('Navigation', 'Screen received focus, reloading data', true);
          loadDashboardData();
        } else {
          logManager.log('Navigation', 'Screen received focus, but data is already being loaded');
        }
      }, 300); // 300ms debounce to avoid multiple calls
    });
    
    // Remove listeners when unmounting
    return () => {
      logManager.log('Lifecycle', `Component unmounted [ID: ${componentId}]`, true);
      unsubscribe();
      removeCurrencyChangeListener(handleCurrencyChange);
      clearTimeout(focusDebounceTimeout);
    };
  }, [navigation]);

  // Main function to load all dashboard data
  const loadDashboardData = async (isInitialLoad = false, retryCount = 0) => {
    // Check if cache is still valid
    const now = Date.now();
    if (!isInitialLoad && now - lastLoadTime < CACHE_DURATION && !loading) {
      logManager.log('Dashboard', 'Using cached data (less than 30s old)', true);
      return;
    }
    
    if (loading || operationsInProgress.has('loadDashboard')) {
      logManager.log('Dashboard', 'Data is already being loaded, ignoring duplicate call');
      return;
    }
    
    operationsInProgress.add('loadDashboard');
    setLoading(true);
    setError(null);
    
    const loadStartTime = Date.now();
    logManager.log('Dashboard', `${isInitialLoad ? 'Initial loading' : 'Updating'} dashboard data`, true);
    
    // Set safety timeout to 10 seconds for better user experience
    const safetyTimeout = setTimeout(async () => {
      logManager.log('Dashboard', 'Timeout reached (10s)', true);
      
      // If this is the first timeout and we haven't retried yet, try once more
      if (retryCount === 0) {
        logManager.log('Dashboard', 'Attempting automatic retry (1/1)', true);
        operationsInProgress.delete('loadDashboard');
        setLoading(false);
        
        // Wait a brief moment then retry
        setTimeout(() => {
          loadDashboardData(isInitialLoad, 1);
        }, 1000);
      } else {
        // If we've already retried, show the error
        logManager.log('Dashboard', 'Max retries reached, showing error', true);
        setLoading(false);
        setError('Connection timeout. Please check your internet and try again.');
        operationsInProgress.delete('loadDashboard');
      }
    }, 10000);
    
    try {
      // 1. Verify authentication using the MainQueries function - use Promise.all for parallel loading
      const sessionPromise = getSession();
      
      // Start loading goals and financial data in parallel when possible
      const session = await sessionPromise;
      if (!session || !session.session?.user) {
        logManager.log('Authentication', 'User not authenticated', true);
        setError('User not authenticated');
        return;
      }
      
      const userId = session.session.user.id;
      logManager.debounce('Authentication', `User authenticated: ${userId.substr(0, 8)}...`);
      
      // 2. Load goals and financial data in parallel
      const [goalsData, currencyData] = await Promise.all([
        loadGoals(userId),
        supabase
          .from('user_currency_preferences')
          .select('actual_currency')
          .eq('user_id', userId)
          .single()
      ]);
      
      // Process currency data
      if (!currencyData.data || !currencyData.data.actual_currency) {
        logManager.log('Financial', 'No currency preference found, will use default');
      } else {
        logManager.log('Financial', `Currency loaded: ${currencyData.data.actual_currency}`);
      }
      
      // 4. Load financial data with the currency we have
      await loadFinancialData(userId, userCurrency, goalsData);
      
      const loadEndTime = Date.now();
      const loadTime = (loadEndTime - loadStartTime) / 1000;
      logManager.log('Dashboard', `Loading completed in ${loadTime.toFixed(2)}s`, true);
      
      // Update cache timestamp
      setLastLoadTime(now);
      
      // Increment refreshKey to force GaugeChart update
      setRefreshKey(prevKey => prevKey + 1);
      
    } catch (error) {
      logManager.error('Dashboard', 'Error loading dashboard data', error);
      setError(`Error loading data: ${error.message}`);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
      operationsInProgress.delete('loadDashboard');
    }
  };
  
  // Function to load goals and calculate statistics
  const loadGoals = async (userId) => {
    try {
      if (operationsInProgress.has('loadGoals')) {
        logManager.log('Goals', 'Loading goals already in progress');
        return [];
      }
      
      operationsInProgress.add('loadGoals');
      logManager.log('Goals', 'Loading goals');
      
      // Use the centralized query function instead of direct query
      const goals = await fetchGoalsByUser(userId);
      
      if (!goals) {
        logManager.log('Goals', 'No goal found or error occurred');
        setGoals([]);
        return [];
      }
      
      setGoals(goals);
      logManager.log('Goals', `${goals.length} goals loaded`);
      
      // Calculate status counters
      let ok = 0, warnings = 0, problems = 0, today = 0;
      
      if (goals.length > 0) {
        goals.forEach(goal => {
          const status = Number(goal.status) || 0;
          if (status === 4) today++;
          else if (status === 3) problems++;
          else if (status === 2) warnings++;
          else if (status === 1) ok++;
        });
        
        logManager.debounce('Goals', `Distribution: ${ok} ok, ${warnings} warnings, ${problems} problems, ${today} today`);
      }
      
      // Update counters
      setOkCount(ok);
      setWarningCount(warnings);
      setProblemCount(problems);
      setTodayCount(today);
      
      // Determine dominant status
      let dominantStatus = 'achievable'; // Default
      
      if (problems > 0) {
        dominantStatus = 'impossible';
      } else if (warnings > 0) {
        dominantStatus = 'adjustments';
      } else if (today > 0) {
        dominantStatus = 'dueToday';
      } else if (ok > 0) {
        dominantStatus = 'achievable';
      }
      
      setDominantGoalStatus(dominantStatus);
      logManager.debounce('Goals', `Dominant status: ${dominantStatus}`);
      
      return goals;
    } catch (error) {
      logManager.error('Goals', 'Error loading goals', error);
      setError(`Error loading goals: ${error.message}`);
      return [];
    } finally {
      operationsInProgress.delete('loadGoals');
    }
  };
  
  // Function to load financial data
  const loadFinancialData = async (userId, userCurrency, goalsData) => {
    try {
      if (operationsInProgress.has('loadFinancial')) {
        logManager.log('Financial', 'Financial loading already in progress');
        return { income: 0, expenses: 0 };
      }
      
      operationsInProgress.add('loadFinancial');
      logManager.log('Financial', 'Loading financial data');
      
      // Load income and expenses in parallel
      const [incomes, expenses] = await Promise.all([
        fetchIncomesByUser(userId),
        fetchExpensesByUser(userId)
      ]);
      
      if (!incomes) {
        logManager.log('Financial', 'No income found');
      } else {
        logManager.debounce('Financial', `${incomes.length} incomes loaded`);
      }
      
      if (!expenses) {
        logManager.log('Financial', 'No expense found');
      } else {
        logManager.debounce('Financial', `${expenses.length} expenses loaded`);
      }
      
      // 3. Calculate financial values
      let incomeSum = 0;
      let expenseSum = 0;
      
      // Process incomes
      if (incomes && incomes.length > 0) {
        incomeSum = incomes.reduce((sum, income) => {
          // Get value and frequency
          let amount = Number(income.amount) || 0;
          const days = income.frequencies?.days || 30;
          
          // Calculate monthly value
          const monthlyAmount = (amount * 30) / days;
          
          return sum + monthlyAmount;
        }, 0);
        
        // Log summarized at the end
        logManager.debounce('Financial', `Income total: ${incomeSum.toFixed(2)} ${userCurrency?.symbol}/month`);
      }
      
      // Process expenses
      if (expenses && expenses.length > 0) {
        expenseSum = expenses.reduce((sum, expense) => {
          // Get value and frequency
          let amount = Number(expense.amount) || 0;
          const days = expense.frequencies?.days || 30;
          
          // Calculate monthly value
          const monthlyAmount = (amount * 30) / days;
          
          return sum + monthlyAmount;
        }, 0);
        
        // Log summarized at the end
        logManager.debounce('Financial', `Expense total: ${expenseSum.toFixed(2)} ${userCurrency?.symbol}/month`);
      }
      
      // Calculate balance and savings
      const balance = incomeSum - expenseSum;
      const savings = balance > 0 ? balance : 0;
      
      // Update financial states
      setTotalIncome(incomeSum);
      setTotalExpenses(expenseSum);
      setAvailableMoney(balance);
      setSavingsAmount(savings);
      
      logManager.log('Financial', `Financial summary: 
  Income: ${incomeSum.toFixed(2)} ${userCurrency?.symbol}
  Expenses: ${expenseSum.toFixed(2)} ${userCurrency?.symbol}
  Balance: ${balance.toFixed(2)} ${userCurrency?.symbol}
  Savings: ${savings.toFixed(2)} ${userCurrency?.symbol}`);
      
      // Calculate savings allocation percentage
      await calculateSavingsAllocation(savings, goalsData || [], userId);
      
      return { income: incomeSum, expenses: expenseSum };
    } catch (error) {
      logManager.error('Financial', 'Error loading financial data', error);
      throw error;
    } finally {
      operationsInProgress.delete('loadFinancial');
    }
  };
  
  // Function to calculate savings allocation percentage
  const calculateSavingsAllocation = async (savings, goalsData = [], userId) => {
    try {
      if (operationsInProgress.has('calculateAllocation')) {
        logManager.log('Allocation', 'Allocation calculation already in progress');
        return;
      }
      
      operationsInProgress.add('calculateAllocation');
      logManager.log('Allocation', 'Calculating savings allocation percentage');
      
      // If there are goals, sum their savings percentages
      if (goalsData && goalsData.length > 0) {
        // Calculate the sum of minimum savings percentages of all goals
        const totalAllocation = goalsData.reduce((sum, goal) => {
          return sum + (Number(goal.goal_saving_minimum) || 0);
        }, 0);
        
        // Limit to 100% maximum
        const finalPercentage = Math.min(totalAllocation, 100);
        setUsagePercentage(finalPercentage);
        
        logManager.log('Allocation', `Calculated allocation percentage: ${finalPercentage}% (${goalsData.length} goals)`);
      } else {
        // If there are no goals, allocation is 0%
        setUsagePercentage(0);
        logManager.log('Allocation', 'No goals defined, allocation 0%');
      }
    } catch (error) {
      logManager.error('Allocation', 'Error calculating savings allocation', error);
      // If error occurs, allocation is 0%
      setUsagePercentage(0);
    } finally {
      operationsInProgress.delete('calculateAllocation');
    }
  };

  // Define colors based on goals status
  const statusColors = {
    achievable: '#00B894',  // Green
    adjustments: '#FDCB6E', // Yellow
    impossible: '#E74C3C',  // Red
    dueToday: '#0984e3'     // Blue
  };

  // Determine gauge color based on dominant goals status
  const getGaugeColor = () => {
    // If there is a dominant goal status and it is valid, use this color
    if (dominantGoalStatus && statusColors[dominantGoalStatus]) {
      return statusColors[dominantGoalStatus];
    }
    
    // Fallback for behavior based on percentage
    if (typeof usagePercentage !== 'number' || isNaN(usagePercentage)) {
      return statusColors.achievable; // Green as default color
    }
    
    if (usagePercentage <= 50) {
      return statusColors.achievable; // Green
    } else if (usagePercentage <= 80) {
      return statusColors.adjustments; // Yellow
    } else if (usagePercentage <= 100) {
      return statusColors.impossible; // Red
    } else {
      return statusColors.dueToday; // Blue
    }
  };

  // Show financial details when gauge is clicked
  const handleGaugePress = () => {
    setModalVisible(true);
  };

  // Navigate to goals page when goals section is clicked
  const navigateToGoals = () => {
    navigation.navigate('GoalsPage');
  };

  // Navigate to currency market
  const navigateToCurrencyMarket = () => {
    navigation.navigate('CurrencyMarketPage');
  };
  
  // Function to manually update data
  const refreshDashboard = () => {
    setRefreshKey(prevKey => prevKey + 1);
    loadDashboardData(false, 0); // Reset retry count on manual refresh
  };

  // Modify modal visibility handling
  const handleModalVisibility = (visible) => {
    setModalVisible(visible);
    setModalAccessibility({
      isVisible: visible,
      shouldHideContent: visible
    });
  };

  // Function to render items in FlatList
  const renderItem = ({ item }) => {
    switch (item.type) {
      case 'netIncome':
        return (
          <View style={styles.dashboardSection}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="wallet-outline" size={20} color="#FF9800" style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Net Income</Text>
              
              {/* Quick navigation button to Currency Market */}
              <TouchableOpacity 
                style={styles.currencyButton}
                onPress={navigateToCurrencyMarket}
              >
                <Ionicons name="globe-outline" size={16} color="#FF9800" />
                <Text style={styles.currencyButtonText}>Change Currency</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <NetIncomeSkeleton />
            ) : error ? (
              <View style={cardStyles.errorCard}>
                <Ionicons name="alert-circle-outline" size={40} color="#E74C3C" />
                <Text style={cardStyles.errorText}>{error}</Text>
                <TouchableOpacity style={cardStyles.retryButton} onPress={refreshDashboard}>
                  <Text style={cardStyles.retryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={cardStyles.card}>
                <View style={cardStyles.moneyContainer}>
                  <View style={cardStyles.moneyTextContainer}>
                    <Text style={cardStyles.moneyLabel}>Net Income (Net Receipt)</Text>
                    <Text style={[
                      cardStyles.moneyValue, 
                      {color: availableMoney >= 0 ? statusColors.achievable : statusColors.impossible}
                    ]}>
                      {formatCurrency(availableMoney, userCurrency?.symbol)}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={cardStyles.gaugeContainer}
                  onPress={handleGaugePress}
                  activeOpacity={0.7}
                >
                  <GaugeChart 
                    key={`gauge-${refreshKey}-${dominantGoalStatus}`}
                    value={typeof usagePercentage === 'number' && !isNaN(usagePercentage) ? usagePercentage : 20}
                    width={200}
                    height={100}
                    startAngle={-90}
                    endAngle={90}
                    formatText={({ value }) => `${Math.round(value)}%`}
                    gaugeColors={{
                      valueArc: getGaugeColor(),
                      referenceArc: '#F7F9FC',
                      valueText: '#2D3748'
                    }}
                    textFontSize={22}
                  />
                  <Text style={cardStyles.gaugeLabel}>
                    Savings Allocation (%)
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      case 'goalStatus':
        return (
          <View style={styles.dashboardSection}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="flag-outline" size={20} color="#FF9800" style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Goal Status</Text>
            </View>
            {loading ? (
              <GoalOverviewSkeleton />
            ) : error ? (
              <View style={cardStyles.errorCard}>
                <Ionicons name="alert-circle-outline" size={40} color="#E74C3C" />
                <Text style={cardStyles.errorText}>{error}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 24,
                  boxShadow: '0px 3px 8px rgba(26, 54, 93, 0.1)',
                  elevation: 4,
                }}
                onPress={navigateToGoals}
                activeOpacity={0.85}
              >
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#2D3748' }}>Goals Overview</Text>
                  <Ionicons name="chevron-forward" size={22} color="#CBD5E0" />
                </View>
                
                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}>
                  <View style={{ width: '48%', marginBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 184, 148, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                      <Ionicons name="checkmark-circle" size={22} color={statusColors.achievable} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, color: '#718096', marginBottom: 2 }}>Achievable</Text>
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: statusColors.achievable }}>{okCount}</Text>
                    </View>
                  </View>
                  
                  <View style={{ width: '48%', marginBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(253, 203, 110, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                      <Ionicons name="warning" size={22} color={statusColors.adjustments} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, color: '#718096', marginBottom: 2 }}>Adjustments</Text>
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: statusColors.adjustments }}>{warningCount}</Text>
                    </View>
                  </View>
                  
                  <View style={{ width: '48%', marginBottom: 4, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(231, 76, 60, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                      <Ionicons name="close-circle" size={22} color={statusColors.impossible} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, color: '#718096', marginBottom: 2 }}>Impossible</Text>
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: statusColors.impossible }}>{problemCount}</Text>
                    </View>
                  </View>
                  
                  <View style={{ width: '48%', marginBottom: 4, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(9, 132, 227, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                      <Ionicons name="information-circle" size={22} color={statusColors.dueToday} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, color: '#718096', marginBottom: 2 }}>Due Today</Text>
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: statusColors.dueToday }}>{todayCount}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  // Use memoization for expensive calculations
  const financialSummary = useMemo(() => {
    // Calculate any expensive values here that depend on financial data
    return {
      availablePercentage: usagePercentage,
      savingsPercentage: totalIncome > 0 ? (savingsAmount / totalIncome) * 100 : 0,
      netIncomeLabel: `${formatCurrency(availableMoney)}`
    };
  }, [availableMoney, usagePercentage, savingsAmount, totalIncome]);

  return (
    <View style={styles.mainContainer}>
      <Header title="Dashboard" />
      
      <FlatList
        style={styles.container}
        data={sections}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 24}}
        refreshing={loading}
        onRefresh={refreshDashboard}
      />

      {/* Modal with proper accessibility */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => handleModalVisibility(false)}
      >
        <View style={styles.modalOverlay}>
          <View 
            style={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Modal content */}
            <Text id="modal-title" style={styles.modalTitle}>
              Financial Details
            </Text>
            <View style={styles.financialModal.summaryBox}>
              <View style={styles.financialModal.summaryItem}>
                <Ionicons name="arrow-down-circle" size={20} color="#00B894" style={styles.financialModal.icon} />
                <Text style={styles.financialModal.summaryLabel}>Incomes</Text>
                <Text style={styles.financialModal.summaryValue}>{formatCurrency(totalIncome, userCurrency?.symbol)}</Text>
              </View>
              
              <View style={styles.financialModal.summaryDivider} />
              
              <View style={styles.financialModal.summaryItem}>
                <Ionicons name="arrow-up-circle" size={20} color="#E74C3C" style={styles.financialModal.icon} />
                <Text style={styles.financialModal.summaryLabel}>Expenses</Text>
                <Text style={styles.financialModal.summaryValue}>{formatCurrency(totalExpenses, userCurrency?.symbol)}</Text>
              </View>
            </View>
            
            <View style={styles.financialModal.contentContainer}>
              <View style={styles.financialModal.balanceSection}>
                <Text style={styles.financialModal.sectionTitle}>Monthly Balance</Text>
                
                <View style={styles.financialModal.balanceCard}>
                  <Text style={styles.financialModal.balanceLabel}>Available</Text>
                  <Text style={[
                    styles.financialModal.balanceValue, 
                    { color: availableMoney >= 0 ? '#00B894' : '#E74C3C' }
                  ]}>{formatCurrency(availableMoney, userCurrency?.symbol)}</Text>
                </View>
              </View>
              
              <View style={styles.financialModal.allocationSection}>
                <Text style={styles.financialModal.sectionTitle}>Savings Allocation</Text>
                
                <View style={styles.financialModal.allocationCard}>
                  <View style={styles.financialModal.allocationHeader}>
                    <Text style={styles.financialModal.allocationAmount}>{formatCurrency(savingsAmount, userCurrency?.symbol)}</Text>
                    <View style={styles.financialModal.percentageBadge}>
                      <Text style={styles.financialModal.percentageText}>{Math.round(usagePercentage)}%</Text>
                    </View>
                  </View>
                  
                  <View style={styles.financialModal.progressBarContainer}>
                    <View style={[
                      styles.financialModal.progressBar, 
                      { 
                        width: `${Math.min(100, usagePercentage)}%`,
                        backgroundColor: getGaugeColor()
                      }
                    ]} />
                  </View>
                  
                  <Text style={styles.financialModal.allocationDescription}>
                    {usagePercentage <= 50 ? 
                      'Excellent! You are saving sustainably.' : 
                      usagePercentage <= 80 ? 
                      'Good! Your savings rate is adequate.' : 
                      usagePercentage <= 100 ? 
                      'Attention! You are saving all your available.' : 
                      'Careful! Your savings goals exceed your available.'}
                  </Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.financialModal.okButton}
              onPress={() => handleModalVisibility(false)}
            >
              <LinearGradient
                colors={['#FF9800', '#F57C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.financialModal.buttonGradient}
              >
                <Text style={styles.financialModal.okButtonText}>Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    boxShadow: '0px 4px 10px rgba(26, 54, 93, 0.12)',
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  errorCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 10px rgba(26, 54, 93, 0.12)',
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.2)',
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  moneyContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#FCFCFD',
  },
  moneyTextContainer: {
    alignItems: 'center',
  },
  moneyLabel: {
    fontSize: 15,
    color: '#4A5568',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  moneyValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  allocatedLabel: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  allocatedValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#00B894',
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  allocatedAmount: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: 'normal',
  },
  gaugeContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  gaugeLabel: {
    marginTop: 8,
    fontSize: 13,
    color: '#4A5568',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

export default MainMenuPage;