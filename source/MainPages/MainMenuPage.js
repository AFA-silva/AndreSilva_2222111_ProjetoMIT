import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../Styles/MainPageStyles/MainMenuPageStyle';
import { supabase } from '../../Supabase';

const CARD_WIDTH = (Dimensions.get('window').width - 48) / 2; // 2 cards por linha, 24px padding de cada lado

const MainMenuPage = ({ navigation }) => {
  const [okCount, setOkCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [totalIncome, setTotalIncome] = useState(null);
  const [totalExpenses, setTotalExpenses] = useState(null);
  const [availableMoney, setAvailableMoney] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Goals status
        const { data: goals, error: goalsError } = await supabase
          .from('goals')
          .select('id, name, amount, deadline, status, status_message, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (goalsError) {
          console.error('Error fetching goals:', goalsError);
          return;
        }
        
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
        } else {
          // Reset counters if no goals found
          setOkCount(0);
          setWarningCount(0);
          setProblemCount(0);
          setTodayCount(0);
        }
        
        // Income
        const { data: incomes, error: incomesError } = await supabase
          .from('income')
          .select('amount, frequencies(days)')
          .eq('user_id', user.id);
        
        if (incomesError) {
          console.error('Error fetching incomes:', incomesError);
          return;
        }
        
        let incomeSum = 0;
        if (incomes && incomes.length > 0) {
          incomeSum = incomes.reduce((sum, income) => {
            const days = income.frequencies?.days || 30;
            return sum + (income.amount * 30) / days;
          }, 0);
        }
        setTotalIncome(incomeSum);
        
        // Expenses
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('amount, frequencies(days)')
          .eq('user_id', user.id);
        
        if (expensesError) {
          console.error('Error fetching expenses:', expensesError);
          return;
        }
        
        let expenseSum = 0;
        if (expenses && expenses.length > 0) {
          expenseSum = expenses.reduce((sum, expense) => {
            const days = expense.frequencies?.days || 30;
            return sum + (expense.amount * 30) / days;
          }, 0);
        }
        
        setTotalExpenses(expenseSum);
        setAvailableMoney(incomeSum - expenseSum);
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
      }
    };
    
    // Initial fetch
    fetchDashboardData();
    
    // Atualizar os dados a cada 30 segundos
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value);
  };

  const cardStyle = {
    backgroundColor: '#FFF',
    borderRadius: 22,
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 10,
    marginBottom: 18,
    flexBasis: '48%',
    maxWidth: '48%',
    minWidth: 160,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10 }}>
        {/* Goals Info Card */}
        <TouchableOpacity
          style={{ ...cardStyle, borderColor: '#FDCB6E', borderWidth: 2 }}
          onPress={() => navigation.navigate('GoalsPage')}
          activeOpacity={0.85}
        >
          <Text style={{ fontWeight: 'bold', color: '#2D3436', fontSize: 18, marginBottom: 12, letterSpacing: 0.5, textAlign: 'center' }}>Goals Info</Text>
          
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-around',
            width: '100%', 
            paddingHorizontal: 10
          }}>
            <View style={{ alignItems: 'center', width: '45%', marginBottom: 10 }}>
              <Ionicons name="checkmark-circle" size={30} color="#00B894" />
              <Text style={{ fontSize: 18, color: '#00B894', fontWeight: 'bold', marginTop: 2 }}>{okCount}</Text>
            </View>
            <View style={{ alignItems: 'center', width: '45%', marginBottom: 10 }}>
              <Ionicons name="warning" size={30} color="#FDCB6E" />
              <Text style={{ fontSize: 18, color: '#FDCB6E', fontWeight: 'bold', marginTop: 2 }}>{warningCount}</Text>
            </View>
            <View style={{ alignItems: 'center', width: '45%', marginBottom: 5 }}>
              <Ionicons name="close-circle" size={30} color="#E74C3C" />
              <Text style={{ fontSize: 18, color: '#E74C3C', fontWeight: 'bold', marginTop: 2 }}>{problemCount}</Text>
            </View>
            <View style={{ alignItems: 'center', width: '45%', marginBottom: 5 }}>
              <Ionicons name="information-circle" size={30} color="#0984e3" />
              <Text style={{ fontSize: 18, color: '#0984e3', fontWeight: 'bold', marginTop: 2 }}>{todayCount}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {/* Income Card */}
        <View style={{ ...cardStyle, borderColor: '#00B894', borderWidth: 2 }}>
          <Ionicons name="trending-up" size={34} color="#00B894" style={{ marginBottom: 6 }} />
          <Text style={{ color: '#2D3436', fontWeight: 'bold', fontSize: 15, marginBottom: 2, textAlign: 'center' }}>Rendimento Mensal</Text>
          <Text style={{ fontSize: 20, color: '#00B894', fontWeight: 'bold', textAlign: 'center' }}>
            {totalIncome !== null ? formatCurrency(totalIncome) : '--'}
          </Text>
        </View>
        {/* Expenses Card */}
        <View style={{ ...cardStyle, borderColor: '#E74C3C', borderWidth: 2 }}>
          <Ionicons name="trending-down" size={34} color="#E74C3C" style={{ marginBottom: 6 }} />
          <Text style={{ color: '#2D3436', fontWeight: 'bold', fontSize: 15, marginBottom: 2, textAlign: 'center' }}>Despesas Mensais</Text>
          <Text style={{ fontSize: 20, color: '#E74C3C', fontWeight: 'bold', textAlign: 'center' }}>
            {totalExpenses !== null ? formatCurrency(totalExpenses) : '--'}
          </Text>
        </View>
        {/* Available Money Card */}
        <View style={{ ...cardStyle, borderColor: '#FDCB6E', borderWidth: 2 }}>
          <Ionicons name="wallet" size={34} color="#FDCB6E" style={{ marginBottom: 6 }} />
          <Text style={{ color: '#2D3436', fontWeight: 'bold', fontSize: 15, marginBottom: 2, textAlign: 'center' }}>Dinheiro Disponível</Text>
          <Text style={{ fontSize: 20, color: '#00B894', fontWeight: 'bold', textAlign: 'center' }}>
            {availableMoney !== null ? formatCurrency(availableMoney) : '--'}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default MainMenuPage;