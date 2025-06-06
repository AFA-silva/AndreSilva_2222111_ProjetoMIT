import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../Styles/MainPageStyles/MainMenuPageStyle';
import { supabase } from '../../Supabase';
import { GoalOverviewSkeleton, NetIncomeSkeleton } from '../Utility/SkeletonLoading';
import { GaugeChart } from '../Utility/Chart';
import Header from '../Utility/Header';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentCurrency, fetchExchangeRates, formatCurrency, loadSavedCurrency, addCurrencyChangeListener, removeCurrencyChangeListener } from '../Utility/FetchCountries';
import { convertCurrency } from '../Utility/CurrencyService';
import { 
  fetchGoalsByUser, 
  fetchIncomesByUser, 
  fetchExpensesByUser,
  fetchUserSettings,
  getSession,
  fetchUserCurrencyPreference
} from '../Utility/MainQueries';

const MainMenuPage = ({ navigation }) => {
  // Estados para armazenar dados do dashboard
  const [okCount, setOkCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [availableMoney, setAvailableMoney] = useState(0);
  const [usagePercentage, setUsagePercentage] = useState(20);
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

  // Layout sections para renderizar na FlatList
  const sections = [
    { key: 'netIncome', type: 'netIncome' },
    { key: 'goalStatus', type: 'goalStatus' }
  ];

  // Efeito para carregar dados ao montar o componente e garantir que a moeda correta seja usada
  useEffect(() => {
    // Carregar moeda do usuário do Supabase antes de qualquer coisa
    const initializeCurrency = async () => {
      try {
        await loadSavedCurrency(); // Isso agora prioriza a moeda do Supabase
        loadDashboardData();
      } catch (error) {
        console.error('Error initializing currency:', error);
        loadDashboardData(); // Continuar mesmo se falhar
      }
    };
    
    initializeCurrency();
    
    // Adicionar listener para mudanças de moeda
    const handleCurrencyChange = (newCurrency) => {
      console.log('Currency change detected in MainMenuPage:', newCurrency?.code);
      setUserCurrency(newCurrency);
      setRefreshKey(prev => prev + 1);
      loadDashboardData();
    };
    
    // Registrar listener de moeda
    addCurrencyChangeListener(handleCurrencyChange);
    
    // Adicionar listener de foco para recarregar dados quando retornar à tela
    const unsubscribe = navigation.addListener('focus', () => {
      if (!loading) {
        console.log('Tela recebeu foco, recarregando moeda e dados...');
        initializeCurrency();
      }
    });
    
    // Remover listeners ao desmontar
    return () => {
      unsubscribe();
      removeCurrencyChangeListener(handleCurrencyChange);
    };
  }, [navigation]);

  // Função principal para carregar todos os dados do dashboard
  const loadDashboardData = async () => {
    if (loading) {
      console.log('Já está carregando dados, ignorando chamada duplicada');
      return;
    }
    
    setLoading(true);
    setError(null);
    console.log('Iniciando carregamento de dados do dashboard');
    
    // Safety timeout para evitar loading infinito
    const safetyTimeout = setTimeout(() => {
      console.log('Tempo limite de carregamento atingido, forçando reset');
      setLoading(false);
      setError('Tempo limite de carregamento excedido');
    }, 8000);
    
    try {
      // 1. Verificar autenticação usando a função de MainQueries
      const session = await getSession();
      if (!session || !session.session?.user) {
        console.log('Usuário não autenticado');
        clearTimeout(safetyTimeout);
        setLoading(false);
        setError('Usuário não autenticado');
        return;
      }
      
      const userId = session.session.user.id;

      // 2. Carregar moeda atual do usuário - agora sempre do Supabase
      // Carregar primeiro a moeda para garantir que os dados sejam mostrados corretamente
      const currency = getCurrentCurrency(); // Agora usa USD como default em vez de EUR
      setUserCurrency(currency);
      console.log('Moeda atual do usuário:', currency);
      
      // 3. Carregar goals e processar estatísticas
      const goalsData = await loadGoals(userId);
      
      // 4. Carregar dados financeiros (income e expenses)
      await loadFinancialData(userId, currency, goalsData);
      
      console.log('Carregamento de dados concluído com sucesso');
      // Incrementar refreshKey para forçar atualização do componente GaugeChart
      setRefreshKey(prevKey => prevKey + 1);
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      setError(`Erro ao carregar dados: ${error.message}`);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  };
  
  // Função para carregar goals e calcular estatísticas
  const loadGoals = async (userId) => {
    try {
      console.log('Carregando goals...');
      
      // Usar a função centralizada de consulta em vez da consulta direta
      const goals = await fetchGoalsByUser(userId);
      
      if (!goals) {
        console.log('Nenhum goal encontrado ou ocorreu um erro');
        setGoals([]);
        return [];
      }
      
      setGoals(goals);
      console.log(`${goals.length || 0} goals carregados`);
      
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
      console.log(`Status dominante: ${dominantStatus}`);
      
      return goals;
    } catch (error) {
      console.error('Erro ao carregar goals:', error);
      setError(`Erro ao carregar metas: ${error.message}`);
      return [];
    }
  };
  
  // Função para carregar dados financeiros
  const loadFinancialData = async (userId, userCurrency, goalsData) => {
    try {
      console.log('Carregando dados financeiros...');
      const baseCurrency = userCurrency?.code || 'USD'; // Default para USD em vez de EUR
      console.log(`Moeda base para cálculos: ${baseCurrency}`);
      
      // Buscar taxas de câmbio para converter valores se necessário
      let exchangeRates = null;
      try {
        exchangeRates = await fetchExchangeRates(baseCurrency);
        console.log('Taxas de câmbio carregadas com sucesso');
      } catch (ratesError) {
        console.error('Erro ao carregar taxas de câmbio:', ratesError);
        // Continuar sem conversão se falhar
      }
      
      // 1. Carregar incomes usando a função centralizada
      const incomes = await fetchIncomesByUser(userId);
      
      if (!incomes) {
        console.error('Erro ao buscar incomes ou nenhum encontrado');
        return { income: 0, expenses: 0 };
      }
      
      console.log(`${incomes.length || 0} incomes carregados`);
      
      // 2. Carregar expenses usando a função centralizada
      const expenses = await fetchExpensesByUser(userId);
      
      if (!expenses) {
        console.error('Erro ao buscar expenses ou nenhum encontrado');
        return { income: 0, expenses: 0 };
      }
      
      console.log(`${expenses.length || 0} expenses carregados`);
      
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
          console.log(`Income: ${income.amount} ${baseCurrency} a cada ${days} dias = ${monthlyAmount.toFixed(2)} ${baseCurrency} por mês`);
          
          return sum + monthlyAmount;
        }, 0);
      }
      
      // Processar expenses
      if (expenses && expenses.length > 0) {
        expenseSum = expenses.reduce((sum, expense) => {
          // Obter o valor e a frequência
          let amount = Number(expense.amount) || 0;
          const days = expense.frequencies?.days || 30;
          
          // Calcular valor mensal
          const monthlyAmount = (amount * 30) / days;
          console.log(`Expense: ${expense.amount} ${baseCurrency} a cada ${days} dias = ${monthlyAmount.toFixed(2)} ${baseCurrency} por mês`);
          
          return sum + monthlyAmount;
        }, 0);
      }
      
      // Calcular balanço e economias
      const balance = incomeSum - expenseSum;
      const savings = balance > 0 ? balance : 0;
      
      // Atualizar estados financeiros
      setTotalIncome(incomeSum);
      setTotalExpenses(expenseSum);
      setAvailableMoney(balance);
      setSavingsAmount(savings);
      
      console.log(`Dados financeiros calculados:
        Income: ${incomeSum.toFixed(2)} ${baseCurrency}
        Expenses: ${expenseSum.toFixed(2)} ${baseCurrency}
        Balance: ${balance.toFixed(2)} ${baseCurrency}
        Savings: ${savings.toFixed(2)} ${baseCurrency}`);
      
      // Calcular porcentagem de economia alocada para goals
      await calculateSavingsAllocation(savings, goalsData || [], userId);
      
      return { income: incomeSum, expenses: expenseSum };
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      setError(`Erro ao calcular dados financeiros: ${error.message}`);
      return { income: 0, expenses: 0 };
    }
  };
  
  // Função para calcular a porcentagem de alocação de economias
  const calculateSavingsAllocation = async (savings, goalsData = [], userId) => {
    try {
      // Se não há economias ou goals, buscar valor padrão do Supabase
      if (savings <= 0 || !goalsData || goalsData.length === 0) {
        // Usar a função centralizada para buscar configurações do usuário
        const userSettings = await fetchUserSettings(userId);
        
        if (userSettings && userSettings.default_allocation_percentage) {
          const defaultPercentage = Number(userSettings.default_allocation_percentage);
          setUsagePercentage(defaultPercentage);
          console.log(`Usando porcentagem de alocação padrão do usuário: ${defaultPercentage}%`);
          return;
        }
        
        // Se falhar ou não encontrar config, usar valor padrão do sistema
        setUsagePercentage(20);
        return;
      }
      
      // Calcular a soma das porcentagens mínimas de economia de todos os goals
      const totalAllocation = goalsData.reduce((sum, goal) => {
        return sum + (Number(goal.goal_saving_minimum) || 0);
      }, 0);
      
      // Limitar a 100% no máximo
      const finalPercentage = Math.min(totalAllocation, 100);
      setUsagePercentage(finalPercentage);
      
      console.log(`Porcentagem de alocação calculada: ${finalPercentage}%`);
    } catch (error) {
      console.error('Erro ao calcular alocação de economias:', error);
      
      try {
        // Usar a função centralizada para buscar configurações do usuário em caso de erro
        const userSettings = await fetchUserSettings(userId);
        
        if (userSettings && userSettings.default_allocation_percentage) {
          const defaultPercentage = Number(userSettings.default_allocation_percentage);
          setUsagePercentage(defaultPercentage);
          return;
        }
      } catch (configError) {
        console.error('Erro ao buscar configuração de alocação:', configError);
      }
      
      // Fallback para valor padrão do sistema
      setUsagePercentage(20);
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
                  shadowColor: '#1A365D',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
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

      {/* Financial Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.financialModal.centeredView}>
          <Animated.View style={styles.financialModal.modalView}>
            <LinearGradient
              colors={['#FF9800', '#F57C00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.financialModal.headerGradient}
            >
              <View style={styles.financialModal.header}>
                <Text style={styles.financialModal.headerTitle}>Detalhes Financeiros</Text>
                <TouchableOpacity 
                  style={styles.financialModal.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close-circle" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
            
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
              onPress={() => setModalVisible(false)}
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
          </Animated.View>
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
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
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
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
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