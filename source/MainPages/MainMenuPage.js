import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet, Modal, Animated, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../Styles/MainPageStyles/MainMenuPageStyle';
import { supabase } from '../../Supabase';
import { GoalOverviewSkeleton, NetIncomeSkeleton } from '../Utility/SkeletonLoading';
import { GaugeChart } from '../Utility/Chart';
import { formatCurrency, calculateAllocationValue } from './Manage/GoalsCalc';
import Header from '../Utility/Header';
import { LinearGradient } from 'expo-linear-gradient';
import { setCurrentCurrency, loadSavedCurrency, addCurrencyChangeListener, removeCurrencyChangeListener, shouldConvertCurrencyValues } from '../Utility/FetchCountries';
import { convertValueToCurrentCurrency } from '../Utility/CurrencyConverter';
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
  const [modalVisible, setModalVisible] = useState(false);
  const [originalCurrency, setOriginalCurrency] = useState('EUR'); // Moeda original do sistema
  const [originalIncome, setOriginalIncome] = useState(0); // Valores originais
  const [originalExpenses, setOriginalExpenses] = useState(0);
  const [originalSavings, setOriginalSavings] = useState(0);

  // Layout sections para renderizar na FlatList
  const sections = [
    { key: 'netIncome', type: 'netIncome' },
    { key: 'goalStatus', type: 'goalStatus' }
  ];

  // Carregar a moeda original salva do usuário
  const loadOriginalCurrency = async () => {
    try {
      const savedCurrency = await AsyncStorage.getItem('original_app_currency');
      if (savedCurrency) {
        console.log('[MainMenuPage] Moeda original carregada:', savedCurrency);
        setOriginalCurrency(savedCurrency);
        return savedCurrency;
      } else {
        // Se não tiver sido salva ainda, salvar a moeda atual como original
        const currentCurrency = await loadSavedCurrency();
        const currencyCode = currentCurrency?.code || 'EUR';
        console.log('[MainMenuPage] Definindo moeda original:', currencyCode);
        await AsyncStorage.setItem('original_app_currency', currencyCode);
        setOriginalCurrency(currencyCode);
        return currencyCode;
      }
    } catch (error) {
      console.error('[MainMenuPage] Erro ao carregar moeda original:', error);
      // Usar EUR como fallback se houver erro
      setOriginalCurrency('EUR');
      return 'EUR';
    }
  };

  // Define cores com base nos status dos goals
  const statusColors = {
    achievable: '#00B894',  // Verde
    adjustments: '#FDCB6E', // Amarelo
    impossible: '#E74C3C',  // Vermelho
    dueToday: '#0984e3'     // Azul
  };

  // Função para converter valores financeiros quando a moeda mudar
  const convertFinancialValues = async (income, expenses, savings, origCurrency) => {
    try {
      const sourceCurrency = origCurrency || originalCurrency || 'EUR';
      console.log(`[MainMenuPage] Convertendo valores financeiros de ${sourceCurrency}`);
      
      // Verificar se devemos converter ou apenas exibir na nova moeda
      const shouldConvert = shouldConvertCurrencyValues();
      console.log(`[MainMenuPage] Converter valores? ${shouldConvert ? 'SIM' : 'NÃO'}`);
      
      if (shouldConvert) {
        // Converter os valores
        console.log(`[MainMenuPage] Convertendo: Income=${income}, Expenses=${expenses}, Savings=${savings}`);
        
        const convertedIncome = await convertValueToCurrentCurrency(income, sourceCurrency);
        const convertedExpenses = await convertValueToCurrentCurrency(expenses, sourceCurrency);
        const convertedSavings = await convertValueToCurrentCurrency(savings, sourceCurrency);
        
        console.log(`[MainMenuPage] Valores convertidos: Income=${convertedIncome}, Expenses=${convertedExpenses}, Savings=${convertedSavings}`);
        
        // Atualizar os estados com os valores convertidos
        setTotalIncome(convertedIncome);
        setTotalExpenses(convertedExpenses);
        setSavingsAmount(convertedSavings);
        setAvailableMoney(convertedSavings);
      }
      
      // Forçar atualização da interface
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('[MainMenuPage] Erro ao converter valores financeiros:', error);
      // Manter os valores originais em caso de erro
    }
  };

  // Ouvinte para mudanças na moeda
  const handleCurrencyChange = async (newCurrency) => {
    try {
      console.log('[MainMenuPage] Moeda alterada:', newCurrency);
      await convertFinancialValues(originalIncome, originalExpenses, originalSavings, originalCurrency);
    } catch (error) {
      console.error('[MainMenuPage] Erro ao lidar com mudança de moeda:', error);
    }
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

      // Carregar a moeda original
      const origCurrency = await loadOriginalCurrency();

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
      
      // Calculate monthly expenses
      let expenseSum = 0;
      if (expenses && expenses.length > 0) {
        expenseSum = expenses.reduce((sum, expense) => {
          const days = expense.frequencies?.days || 30;
          return sum + (expense.amount * 30) / days;
        }, 0);
      }
      
      // Calculate available money and savings
      const savings = incomeSum - expenseSum;
      
      // Armazenar os valores originais
      setOriginalIncome(incomeSum);
      setOriginalExpenses(expenseSum);
      setOriginalSavings(savings > 0 ? savings : 0);
      
      // Atualizar os valores da UI (possivelmente convertendo)
      setTotalIncome(incomeSum);
      setTotalExpenses(expenseSum);
      setAvailableMoney(savings);
      setSavingsAmount(savings > 0 ? savings : 0);
      
      // Converter valores para a moeda atual, se necessário
      await convertFinancialValues(incomeSum, expenseSum, savings > 0 ? savings : 0, origCurrency);
      
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
    // Replace alert with modal
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
                <Text style={styles.financialModal.summaryValue}>{formatCurrency(totalIncome)}</Text>
              </View>
              
              <View style={styles.financialModal.summaryDivider} />
              
              <View style={styles.financialModal.summaryItem}>
                <Ionicons name="arrow-up-circle" size={20} color="#E74C3C" style={styles.financialModal.icon} />
                <Text style={styles.financialModal.summaryLabel}>Despesas</Text>
                <Text style={styles.financialModal.summaryValue}>{formatCurrency(totalExpenses)}</Text>
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
                  ]}>{formatCurrency(availableMoney)}</Text>
                </View>
              </View>
              
              <View style={styles.financialModal.allocationSection}>
                <Text style={styles.financialModal.sectionTitle}>Alocação de Economias</Text>
                
                <View style={styles.financialModal.allocationCard}>
                  <View style={styles.financialModal.allocationHeader}>
                    <Text style={styles.financialModal.allocationAmount}>{formatCurrency(savingsAmount)}</Text>
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