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

// Sistema de log centralizado para evitar repetições
const logManager = {
  lastLogs: {},
  debounceTimeouts: {},
  logCount: {},
  
  // Log com controle de repetição
  log: function(key, message, force = false) {
    const now = Date.now();
    const lastTime = this.lastLogs[key] || 0;
    const count = this.logCount[key] || 0;
    
    // Evitar logs repetidos em menos de 2 segundos
    if (force || now - lastTime > 2000) {
      // Se houve logs repetidos suprimidos, mostrar o contador
      if (count > 0) {
        console.log(`[${key}] Mensagem anterior repetida ${count} vezes`);
        this.logCount[key] = 0;
      }
      
      console.log(`[${key}] ${message}`);
      this.lastLogs[key] = now;
    } else {
      // Incrementar contador de logs suprimidos
      this.logCount[key] = count + 1;
    }
  },
  
  // Log com debounce (agrupa logs em um intervalo)
  debounce: function(key, message, delay = 300) {
    clearTimeout(this.debounceTimeouts[key]);
    this.debounceTimeouts[key] = setTimeout(() => {
      console.log(`[${key}] ${message}`);
    }, delay);
  },
  
  // Log de erro sempre exibido
  error: function(key, message, error) {
    console.error(`[ERRO - ${key}] ${message}`, error);
  }
};

const MainMenuPage = ({ navigation }) => {
  // Estados para armazenar dados do dashboard
  const [okCount, setOkCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [availableMoney, setAvailableMoney] = useState(0);
  const [usagePercentage, setUsagePercentage] = useState(0); // Iniciar com 0%
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
  
  // Rastreador de operações para evitar chamadas duplicadas
  const operationsInProgress = useRef(new Set()).current;

  // Add new state for modal accessibility
  const [modalAccessibility, setModalAccessibility] = useState({
    isVisible: false,
    shouldHideContent: false
  });

  // Add data caching
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const CACHE_DURATION = 30000; // 30 seconds cache

  // Layout sections para renderizar na FlatList
  const sections = [
    { key: 'netIncome', type: 'netIncome' },
    { key: 'goalStatus', type: 'goalStatus' }
  ];

  // Efeito para carregar dados ao montar o componente e garantir que a moeda correta seja usada
  useEffect(() => {
    // Identificador único para esta instância do componente
    const componentId = `MainMenu_${Date.now()}`;
    logManager.log('Lifecycle', `Componente montado [ID: ${componentId}]`, true);
    
    // Inicialização de dados com controle para evitar chamadas duplicadas
    const loadData = async () => {
      if (operationsInProgress.has('initialLoad')) {
        logManager.log('Inicialização', 'Carregamento inicial já em andamento, ignorando chamada duplicada');
        return;
      }
      
      operationsInProgress.add('initialLoad');
      logManager.log('Inicialização', 'Iniciando carregamento inicial de dados', true);
      
      try {
        await loadSavedCurrency();
        await loadDashboardData(true); // true indica carregamento inicial
      } catch (error) {
        logManager.error('Inicialização', 'Erro ao inicializar moeda', error);
        loadDashboardData(true);
      } finally {
        operationsInProgress.delete('initialLoad');
      }
    };
    
    loadData();
    
    // Carregar moeda do usuário diretamente da base de dados
    const loadUserCurrency = async () => {
      if (operationsInProgress.has('loadCurrency')) {
        logManager.log('Moeda', 'Carregamento de moeda já em andamento');
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
            logManager.log('Moeda', `Moeda carregada diretamente da base: ${currencyInfo.code}`, true);
          }
        }
      } catch (error) {
        logManager.error('Moeda', 'Erro ao carregar moeda do usuário', error);
      } finally {
        operationsInProgress.delete('loadCurrency');
      }
    };
    
    loadUserCurrency();
    
    // Adicionar listener para mudanças de moeda
    const handleCurrencyChange = (newCurrency) => {
      if (!newCurrency) return;
      
      logManager.log('Moeda', `Moeda alterada para: ${newCurrency.code}`, true);
      setUserCurrency(newCurrency);
      setRefreshKey(prev => prev + 1);
    };
    
    // Registrar listener de moeda
    addCurrencyChangeListener(handleCurrencyChange);
    
    // Adicionar listener de foco com debounce para evitar recarregamentos excessivos
    let focusDebounceTimeout;
    const unsubscribe = navigation.addListener('focus', () => {
      clearTimeout(focusDebounceTimeout);
      focusDebounceTimeout = setTimeout(() => {
        if (!loading && !operationsInProgress.has('loadDashboard')) {
          logManager.log('Navegação', 'Tela recebeu foco, recarregando dados', true);
          loadDashboardData();
        } else {
          logManager.log('Navegação', 'Tela recebeu foco, mas dados já estão sendo carregados');
        }
      }, 300); // Debounce de 300ms para evitar múltiplas chamadas
    });
    
    // Remover listeners ao desmontar
    return () => {
      logManager.log('Lifecycle', `Componente desmontado [ID: ${componentId}]`, true);
      unsubscribe();
      removeCurrencyChangeListener(handleCurrencyChange);
      clearTimeout(focusDebounceTimeout);
    };
  }, [navigation]);

  // Função principal para carregar todos os dados do dashboard
  const loadDashboardData = async (isInitialLoad = false) => {
    // Check if cache is still valid
    const now = Date.now();
    if (!isInitialLoad && now - lastLoadTime < CACHE_DURATION && !loading) {
      logManager.log('Dashboard', 'Using cached data (less than 30s old)', true);
      return;
    }
    
    if (loading || operationsInProgress.has('loadDashboard')) {
      logManager.log('Dashboard', 'Já está carregando dados, ignorando chamada duplicada');
      return;
    }
    
    operationsInProgress.add('loadDashboard');
    setLoading(true);
    setError(null);
    
    const loadStartTime = Date.now();
    logManager.log('Dashboard', `${isInitialLoad ? 'Carregamento inicial' : 'Atualizando'} dados do dashboard`, true);
    
    // Reduce safety timeout to 5 seconds
    const safetyTimeout = setTimeout(() => {
      logManager.log('Dashboard', 'Tempo limite de carregamento atingido (5s), forçando reset', true);
      setLoading(false);
      setError('Tempo limite de carregamento excedido');
      operationsInProgress.delete('loadDashboard');
    }, 5000);
    
    try {
      // 1. Verificar autenticação usando a função de MainQueries - use Promise.all for parallel loading
      const sessionPromise = getSession();
      
      // Start loading goals and financial data in parallel when possible
      const session = await sessionPromise;
      if (!session || !session.session?.user) {
        logManager.log('Autenticação', 'Usuário não autenticado', true);
        setError('Usuário não autenticado');
        return;
      }
      
      const userId = session.session.user.id;
      logManager.debounce('Autenticação', `Usuário autenticado: ${userId.substr(0, 8)}...`);
      
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
      logManager.log('Dashboard', `Carregamento concluído em ${loadTime.toFixed(2)}s`, true);
      
      // Update cache timestamp
      setLastLoadTime(now);
      
      // Incrementar refreshKey para forçar atualização do componente GaugeChart
      setRefreshKey(prevKey => prevKey + 1);
      
    } catch (error) {
      logManager.error('Dashboard', 'Erro ao carregar dados do dashboard', error);
      setError(`Erro ao carregar dados: ${error.message}`);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
      operationsInProgress.delete('loadDashboard');
    }
  };
  
  // Função para carregar goals e calcular estatísticas
  const loadGoals = async (userId) => {
    try {
      if (operationsInProgress.has('loadGoals')) {
        logManager.log('Goals', 'Carregamento de goals já em andamento');
        return [];
      }
      
      operationsInProgress.add('loadGoals');
      logManager.log('Goals', 'Carregando goals');
      
      // Usar a função centralizada de consulta em vez da consulta direta
      const goals = await fetchGoalsByUser(userId);
      
      if (!goals) {
        logManager.log('Goals', 'Nenhum goal encontrado ou ocorreu um erro');
        setGoals([]);
        return [];
      }
      
      setGoals(goals);
      logManager.log('Goals', `${goals.length} goals carregados`);
      
      // Calcular contadores de status
      let ok = 0, warnings = 0, problems = 0, today = 0;
      
      if (goals.length > 0) {
        goals.forEach(goal => {
          const status = Number(goal.status) || 0;
          if (status === 4) today++;
          else if (status === 3) problems++;
          else if (status === 2) warnings++;
          else if (status === 1) ok++;
        });
        
        logManager.debounce('Goals', `Distribuição: ${ok} ok, ${warnings} avisos, ${problems} problemas, ${today} hoje`);
      }
      
      // Atualizar contadores
      setOkCount(ok);
      setWarningCount(warnings);
      setProblemCount(problems);
      setTodayCount(today);
      
      // Determinar status dominante
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
      logManager.debounce('Goals', `Status dominante: ${dominantStatus}`);
      
      return goals;
    } catch (error) {
      logManager.error('Goals', 'Erro ao carregar goals', error);
      setError(`Erro ao carregar metas: ${error.message}`);
      return [];
    } finally {
      operationsInProgress.delete('loadGoals');
    }
  };
  
  // Função para carregar dados financeiros
  const loadFinancialData = async (userId, userCurrency, goalsData) => {
    try {
      if (operationsInProgress.has('loadFinancial')) {
        logManager.log('Financial', 'Carregamento financeiro já em andamento');
        return { income: 0, expenses: 0 };
      }
      
      operationsInProgress.add('loadFinancial');
      logManager.log('Financial', 'Carregando dados financeiros');
      
      // Load income and expenses in parallel
      const [incomes, expenses] = await Promise.all([
        fetchIncomesByUser(userId),
        fetchExpensesByUser(userId)
      ]);
      
      if (!incomes) {
        logManager.log('Financial', 'Nenhum income encontrado');
      } else {
        logManager.debounce('Financial', `${incomes.length} incomes carregados`);
      }
      
      if (!expenses) {
        logManager.log('Financial', 'Nenhum expense encontrado');
      } else {
        logManager.debounce('Financial', `${expenses.length} expenses carregados`);
      }
      
      // 3. Calcular valores financeiros
      let incomeSum = 0;
      let expenseSum = 0;
      
      // Processar incomes
      if (incomes && incomes.length > 0) {
        incomeSum = incomes.reduce((sum, income) => {
          // Obter o valor e a frequência
          let amount = Number(income.amount) || 0;
          const days = income.frequencies?.days || 30;
          
          // Calcular valor mensal
          const monthlyAmount = (amount * 30) / days;
          
          return sum + monthlyAmount;
        }, 0);
        
        // Log resumido no final
        logManager.debounce('Financial', `Income total: ${incomeSum.toFixed(2)} ${userCurrency?.symbol}/mês`);
      }
      
      // Processar expenses
      if (expenses && expenses.length > 0) {
        expenseSum = expenses.reduce((sum, expense) => {
          // Obter o valor e a frequência
          let amount = Number(expense.amount) || 0;
          const days = expense.frequencies?.days || 30;
          
          // Calcular valor mensal
          const monthlyAmount = (amount * 30) / days;
          
          return sum + monthlyAmount;
        }, 0);
        
        // Log resumido no final
        logManager.debounce('Financial', `Expense total: ${expenseSum.toFixed(2)} ${userCurrency?.symbol}/mês`);
      }
      
      // Calcular balanço e economias
      const balance = incomeSum - expenseSum;
      const savings = balance > 0 ? balance : 0;
      
      // Atualizar estados financeiros
      setTotalIncome(incomeSum);
      setTotalExpenses(expenseSum);
      setAvailableMoney(balance);
      setSavingsAmount(savings);
      
      logManager.log('Financial', `Resumo financeiro: 
  Income: ${incomeSum.toFixed(2)} ${userCurrency?.symbol}
  Expenses: ${expenseSum.toFixed(2)} ${userCurrency?.symbol}
  Balance: ${balance.toFixed(2)} ${userCurrency?.symbol}
  Savings: ${savings.toFixed(2)} ${userCurrency?.symbol}`);
      
      // Calcular porcentagem de economia alocada para goals
      await calculateSavingsAllocation(savings, goalsData || [], userId);
      
      return { income: incomeSum, expenses: expenseSum };
    } catch (error) {
      logManager.error('Financial', 'Erro ao carregar dados financeiros', error);
      throw error;
    } finally {
      operationsInProgress.delete('loadFinancial');
    }
  };
  
  // Função para calcular a porcentagem de alocação de economias
  const calculateSavingsAllocation = async (savings, goalsData = [], userId) => {
    try {
      if (operationsInProgress.has('calculateAllocation')) {
        logManager.log('Allocation', 'Cálculo de alocação já em andamento');
        return;
      }
      
      operationsInProgress.add('calculateAllocation');
      logManager.log('Allocation', 'Calculando porcentagem de alocação de economias');
      
      // Se tem goals, soma suas porcentagens de alocação
      if (goalsData && goalsData.length > 0) {
        // Calcular a soma das porcentagens mínimas de economia de todos os goals
        const totalAllocation = goalsData.reduce((sum, goal) => {
          return sum + (Number(goal.goal_saving_minimum) || 0);
        }, 0);
        
        // Limitar a 100% no máximo
        const finalPercentage = Math.min(totalAllocation, 100);
        setUsagePercentage(finalPercentage);
        
        logManager.log('Allocation', `Porcentagem de alocação calculada: ${finalPercentage}% (${goalsData.length} goals)`);
      } else {
        // Se não tem goals, a alocação é 0%
        setUsagePercentage(0);
        logManager.log('Allocation', 'Sem goals definidos, alocação 0%');
      }
    } catch (error) {
      logManager.error('Allocation', 'Erro ao calcular alocação de economias', error);
      // Se ocorrer erro, alocação é 0%
      setUsagePercentage(0);
    } finally {
      operationsInProgress.delete('calculateAllocation');
    }
  };

  // Define cores com base nos status dos goals
  const statusColors = {
    achievable: '#00B894',  // Verde
    adjustments: '#FDCB6E', // Amarelo
    impossible: '#E74C3C',  // Vermelho
    dueToday: '#0984e3'     // Azul
  };

  // Determinar a cor do gauge com base no status dominante dos goals
  const getGaugeColor = () => {
    // Se tiver status dominante de goals e ele for válido, usa essa cor
    if (dominantGoalStatus && statusColors[dominantGoalStatus]) {
      return statusColors[dominantGoalStatus];
    }
    
    // Fallback para o comportamento baseado na porcentagem
    if (typeof usagePercentage !== 'number' || isNaN(usagePercentage)) {
      return statusColors.achievable; // Verde como cor padrão
    }
    
    if (usagePercentage <= 50) {
      return statusColors.achievable; // Verde
    } else if (usagePercentage <= 80) {
      return statusColors.adjustments; // Amarelo
    } else if (usagePercentage <= 100) {
      return statusColors.impossible; // Vermelho
    } else {
      return statusColors.dueToday; // Azul
    }
  };

  // Mostrar detalhes financeiros ao clicar no gauge
  const handleGaugePress = () => {
    setModalVisible(true);
  };

  // Navegar para a página de goals ao clicar na seção de goals
  const navigateToGoals = () => {
    navigation.navigate('GoalsPage');
  };

  // Navegar para o mercado de moedas
  const navigateToCurrencyMarket = () => {
    navigation.navigate('CurrencyMarketPage');
  };
  
  // Função para atualizar os dados manualmente
  const refreshDashboard = () => {
    loadDashboardData();
  };

  // Modify modal visibility handling
  const handleModalVisibility = (visible) => {
    setModalVisible(visible);
    setModalAccessibility({
      isVisible: visible,
      shouldHideContent: visible
    });
  };

  // Função para renderizar os itens na FlatList
  const renderItem = ({ item }) => {
    switch (item.type) {
      case 'netIncome':
        return (
          <View style={styles.dashboardSection}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="wallet-outline" size={20} color="#FF9800" style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Net Income</Text>
              
              {/* Botão para navegação rápida ao Currency Market */}
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
                  <Text style={cardStyles.retryText}>Tentar Novamente</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={cardStyles.card}>
                <View style={cardStyles.moneyContainer}>
                  <View style={cardStyles.moneyTextContainer}>
                    <Text style={cardStyles.moneyLabel}>Net Income (Receita Líquida)</Text>
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
              Detalhes Financeiros
            </Text>
            <View style={styles.financialModal.summaryBox}>
              <View style={styles.financialModal.summaryItem}>
                <Ionicons name="arrow-down-circle" size={20} color="#00B894" style={styles.financialModal.icon} />
                <Text style={styles.financialModal.summaryLabel}>Receitas</Text>
                <Text style={styles.financialModal.summaryValue}>{formatCurrency(totalIncome, userCurrency?.symbol)}</Text>
              </View>
              
              <View style={styles.financialModal.summaryDivider} />
              
              <View style={styles.financialModal.summaryItem}>
                <Ionicons name="arrow-up-circle" size={20} color="#E74C3C" style={styles.financialModal.icon} />
                <Text style={styles.financialModal.summaryLabel}>Despesas</Text>
                <Text style={styles.financialModal.summaryValue}>{formatCurrency(totalExpenses, userCurrency?.symbol)}</Text>
              </View>
            </View>
            
            <View style={styles.financialModal.contentContainer}>
              <View style={styles.financialModal.balanceSection}>
                <Text style={styles.financialModal.sectionTitle}>Balanço Mensal</Text>
                
                <View style={styles.financialModal.balanceCard}>
                  <Text style={styles.financialModal.balanceLabel}>Disponível</Text>
                  <Text style={[
                    styles.financialModal.balanceValue, 
                    { color: availableMoney >= 0 ? '#00B894' : '#E74C3C' }
                  ]}>{formatCurrency(availableMoney, userCurrency?.symbol)}</Text>
                </View>
              </View>
              
              <View style={styles.financialModal.allocationSection}>
                <Text style={styles.financialModal.sectionTitle}>Alocação de Economias</Text>
                
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
                      'Excelente! Você está economizando de forma sustentável.' : 
                      usagePercentage <= 80 ? 
                      'Bom! Sua taxa de economia está adequada.' : 
                      usagePercentage <= 100 ? 
                      'Atenção! Você está economizando todo o seu disponível.' : 
                      'Cuidado! Suas metas de economia excedem seu disponível.'}
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
                <Text style={styles.financialModal.okButtonText}>Fechar</Text>
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