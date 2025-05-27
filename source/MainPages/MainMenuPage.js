import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../Styles/MainPageStyles/MainMenuPageStyle';
import { supabase } from '../../Supabase';
import { GoalOverviewSkeleton, NetIncomeSkeleton } from '../Utility/SkeletonLoading';
import { GaugeChart } from '../Utility/Chart';
import { formatCurrency, calculateAllocationValue } from './Manage/GoalsCalc';
import Header from '../Utility/Header';
import { LinearGradient } from 'expo-linear-gradient';
import { setCurrentCurrency, loadSavedCurrency, addCurrencyChangeListener, removeCurrencyChangeListener } from '../Utility/FetchCountries';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MainMenuPage = ({ navigation }) => {
  const [okCount, setOkCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [availableMoney, setAvailableMoney] = useState(null);
  const [usagePercentage, setUsagePercentage] = useState(0);
  const [savingsAmount, setSavingsAmount] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dominantGoalStatus, setDominantGoalStatus] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Chave para forçar re-render
  const [goals, setGoals] = useState([]);
  const [currentCurrency, setCurrentCurrency] = useState(null);

  // Define cores com base nos status dos goals
  const statusColors = {
    achievable: '#00B894',  // Verde
    adjustments: '#FDCB6E', // Amarelo
    impossible: '#E74C3C',  // Vermelho
    dueToday: '#0984e3'     // Azul
  };

  // Função para buscar dados do dashboard
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Carregar a moeda global salva
      try {
        // Primeiro, tentar carregar da configuração global
        const savedCurrency = await loadSavedCurrency();
        
        if (!savedCurrency) {
          // Se não encontrar na configuração global, buscar do AsyncStorage diretamente
          const storedCurrency = await AsyncStorage.getItem('user_preferred_currency');
          
          if (storedCurrency) {
            // Buscar a região do usuário para definir a moeda
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('region')
              .eq('id', user.id)
              .single();
            
            if (!userError && userData && userData.region) {
              // Define a moeda com base na região do usuário
              await setCurrentCurrency(userData.region);
              console.log(`Moeda definida para a região: ${userData.region}`);
            } else {
              // Define o Euro como moeda padrão se não encontrar região
              await setCurrentCurrency('EUR');
              console.log('Moeda definida para o padrão: Euro');
            }
          }
        } else {
          // Usar a moeda global carregada
          console.log(`Usando moeda global: ${savedCurrency.code}`);
        }
      } catch (currencyError) {
        console.error('Erro ao carregar moeda:', currencyError);
      }
      
      // Goals status
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id, name, amount, deadline, status, created_at, goal_saving_minimum')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
        setLoading(false);
        return;
      }
      
      setGoals(goals || []);
      
      if (goals && goals.length > 0) {
        let ok = 0, warnings = 0, problems = 0, today = 0;
        // Contar metas por status
        for (const goal of goals) {
          const status = Number(goal.status) || 0;
          if (status === 4) today++;
          else if (status === 3) problems++;
          else if (status === 2) warnings++;
          else if (status === 1) ok++;
        }
        
        setOkCount(ok);
        setWarningCount(warnings);
        setProblemCount(problems);
        setTodayCount(today);
        
        // Determinar status dominante para definir a cor do gauge
        if (warnings > 0) {
          setDominantGoalStatus('adjustments');
        } else if (problems > 0) {
          setDominantGoalStatus('impossible');
        } else if (today > 0) {
          setDominantGoalStatus('dueToday');
        } else if (ok > 0) {
          setDominantGoalStatus('achievable');
        } else {
          setDominantGoalStatus(null);
        }
      } else {
        // Reset counters if no goals found
        setOkCount(0);
        setWarningCount(0);
        setProblemCount(0);
        setTodayCount(0);
        setDominantGoalStatus(null);
      }
      
      // Income and Expenses for Savings calculation
      const { data: incomes, error: incomesError } = await supabase
        .from('income')
        .select('amount, frequencies(days)')
        .eq('user_id', user.id);
      
      if (incomesError) {
        console.error('Error fetching incomes:', incomesError);
        setLoading(false);
        return;
      }
      
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, frequencies(days)')
        .eq('user_id', user.id);
      
      if (expensesError) {
        console.error('Error fetching expenses:', expensesError);
        setLoading(false);
        return;
      }
      
      // Calculate monthly income
      let incomeSum = 0;
      if (incomes && incomes.length > 0) {
        incomeSum = incomes.reduce((sum, income) => {
          const days = income.frequencies?.days || 30;
          return sum + (income.amount * 30) / days;
        }, 0);
      }
      setTotalIncome(incomeSum);
      
      // Calculate monthly expenses
      let expenseSum = 0;
      if (expenses && expenses.length > 0) {
        expenseSum = expenses.reduce((sum, expense) => {
          const days = expense.frequencies?.days || 30;
          return sum + (expense.amount * 30) / days;
        }, 0);
      }
      setTotalExpenses(expenseSum);
      
      // Calculate available money and savings
      const savings = incomeSum - expenseSum;
      setAvailableMoney(savings);
      setSavingsAmount(savings > 0 ? savings : 0);
      
      // Calcular a porcentagem baseada nos goals
      if (goals && goals.length > 0 && incomeSum > 0) {
        // Calcular alocação com base nos goals
        const allocation = calculateAllocationValue(goals, savings);
        setUsagePercentage(allocation.totalPercentage);
      } else {
        // Fallback para 20% se não houver goals
        setUsagePercentage(20);
      }
      
      // Forçar atualização da interface
      setRefreshKey(prev => prev + 1);
      
      setLoading(false);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setLoading(false);
    }
  };

  // Listener para alterações na moeda
  const handleCurrencyChange = (currency) => {
    console.log('Moeda global alterada:', currency);
    setCurrentCurrency(currency);
    // Não chame fetchDashboardData aqui, pois isso cria um loop infinito
    // Em vez disso, apenas atualizar o estado
  };

  useEffect(() => {
    // Initial fetch
    fetchDashboardData();
    
    // Adicionar listener para alterações na moeda global
    addCurrencyChangeListener(handleCurrencyChange);
    
    // Limpar listener quando o componente for desmontado
    return () => {
      removeCurrencyChangeListener(handleCurrencyChange);
    };
  }, []);

  // Adicionar um listener de foco para atualizar quando a tela receber foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardData();
    });
    
    return unsubscribe;
  }, [navigation]);

  // Reagir apenas quando a moeda for alterada
  useEffect(() => {
    if (currentCurrency) {
      // Atualizar a tela quando a moeda for alterada
      fetchDashboardData();
    }
  }, [currentCurrency]);

  // Determinar a cor do gauge com base no status dominante dos goals
  const getGaugeColor = () => {
    // Se tiver status dominante de goals, usa essa cor
    if (dominantGoalStatus) {
      return statusColors[dominantGoalStatus];
    }
    
    // Fallback para o comportamento baseado na porcentagem
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
    // Mostrar um popup ou alerta com detalhes financeiros
    alert(`Detalhes Financeiros:
Receita Mensal: ${formatCurrency(totalIncome)}
Despesas Mensais: ${formatCurrency(totalExpenses)}
Disponível: ${formatCurrency(availableMoney)}
Economias Alocadas: ${formatCurrency(savingsAmount)} (${Math.round(usagePercentage)}%)`);
  };

  // Navegar para a página de goals ao clicar na seção de goals
  const navigateToGoals = () => {
    navigation.navigate('GoalsPage');
  };

  // Navegar para o mercado de moedas
  const navigateToCurrencyMarket = () => {
    navigation.navigate('CurrencyMarketPage');
  };

  return (
    <View style={styles.mainContainer}>
      <Header title="Dashboard" />
      
      <View style={styles.container}>
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
          ) : (
            <View style={cardStyles.card}>
              <View style={cardStyles.moneyContainer}>
                <View style={cardStyles.moneyTextContainer}>
                  <Text style={cardStyles.moneyLabel}>Net Income (Receita Líquida)</Text>
                  <Text style={[
                    cardStyles.moneyValue, 
                    {color: availableMoney >= 0 ? statusColors.achievable : statusColors.impossible}
                  ]}>
                    {formatCurrency(availableMoney)}
                  </Text>
                  <Text style={cardStyles.allocatedLabel}>
                    Savings Allocated <Text style={cardStyles.allocatedValue}>{usagePercentage.toFixed(2)}%</Text>
                    <Text style={cardStyles.allocatedAmount}>
                      ({formatCurrency(savingsAmount)})
                    </Text>
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
                  value={usagePercentage}
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

        <View style={styles.dashboardSection}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="flag-outline" size={20} color="#FF9800" style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Goal Status</Text>
          </View>
          {loading ? (
            <GoalOverviewSkeleton />
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
      </View>
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