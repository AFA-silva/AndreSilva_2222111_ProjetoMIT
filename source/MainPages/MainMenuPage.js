import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../Styles/MainPageStyles/MainMenuPageStyle';
import { supabase } from '../../Supabase';

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
          .select('id, name, amount, deadline, status, created_at')
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.dashboardSection}>
        <Text style={styles.sectionTitle}>Financial Overview</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Income</Text>
            <Text style={[styles.statsValue, { color: '#00B894' }]}>
              {totalIncome !== null ? formatCurrency(totalIncome) : '--'}
            </Text>
          </View>
          
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Expenses</Text>
            <Text style={[styles.statsValue, { color: '#E74C3C' }]}>
              {totalExpenses !== null ? formatCurrency(totalExpenses) : '--'}
            </Text>
          </View>
          
          <View style={[styles.statsCard, { width: '100%' }]}>
            <Text style={styles.statsLabel}>Available Money</Text>
            <Text style={[styles.statsValue, { color: availableMoney >= 0 ? '#00B894' : '#E74C3C' }]}>
              {availableMoney !== null ? formatCurrency(availableMoney) : '--'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.dashboardSection}>
        <Text style={styles.sectionTitle}>Goal Status</Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            shadowColor: '#1A365D',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={() => navigation.navigate('GoalsPage')}
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
                <Ionicons name="checkmark-circle" size={22} color="#00B894" />
              </View>
              <View>
                <Text style={{ fontSize: 14, color: '#718096', marginBottom: 2 }}>Achievable</Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#00B894' }}>{okCount}</Text>
              </View>
            </View>
            
            <View style={{ width: '48%', marginBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(253, 203, 110, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Ionicons name="warning" size={22} color="#FDCB6E" />
              </View>
              <View>
                <Text style={{ fontSize: 14, color: '#718096', marginBottom: 2 }}>Adjustments</Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FDCB6E' }}>{warningCount}</Text>
              </View>
            </View>
            
            <View style={{ width: '48%', marginBottom: 4, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(231, 76, 60, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Ionicons name="close-circle" size={22} color="#E74C3C" />
              </View>
              <View>
                <Text style={{ fontSize: 14, color: '#718096', marginBottom: 2 }}>Impossible</Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#E74C3C' }}>{problemCount}</Text>
              </View>
            </View>
            
            <View style={{ width: '48%', marginBottom: 4, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(9, 132, 227, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Ionicons name="information-circle" size={22} color="#0984e3" />
              </View>
              <View>
                <Text style={{ fontSize: 14, color: '#718096', marginBottom: 2 }}>Due Today</Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0984e3' }}>{todayCount}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MainMenuPage;