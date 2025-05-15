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
  const [totalIncome, setTotalIncome] = useState(null);
  const [totalExpenses, setTotalExpenses] = useState(null);
  const [availableMoney, setAvailableMoney] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Goals status
      const { data: goals } = await supabase
        .from('goals')
        .select('status')
        .eq('user_id', user.id);
      if (goals) {
        let ok = 0, warnings = 0, problems = 0;
        for (const goal of goals) {
          if (goal.status === 3) problems++;
          else if (goal.status === 2) warnings++;
          else if (goal.status === 1) ok++;
        }
        setOkCount(ok);
        setWarningCount(warnings);
        setProblemCount(problems);
      }
      // Income
      const { data: incomes } = await supabase
        .from('income')
        .select('amount, frequencies(days)')
        .eq('user_id', user.id);
      let incomeSum = 0;
      if (incomes) {
        incomeSum = incomes.reduce((sum, income) => {
          const days = income.frequencies?.days || 30;
          return sum + (income.amount * 30) / days;
        }, 0);
      }
      setTotalIncome(incomeSum);
      // Expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, frequencies(days)')
        .eq('user_id', user.id);
      let expenseSum = 0;
      if (expenses) {
        expenseSum = expenses.reduce((sum, expense) => {
          const days = expense.frequencies?.days || 30;
          return sum + (expense.amount * 30) / days;
        }, 0);
      }
      setTotalExpenses(expenseSum);
      setAvailableMoney(incomeSum - expenseSum);
    };
    fetchDashboardData();
  }, []);

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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={36} color="#00B894" />
              <Text style={{ fontSize: 22, color: '#00B894', fontWeight: 'bold', marginTop: 2 }}>{okCount}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="warning" size={36} color="#FDCB6E" />
              <Text style={{ fontSize: 22, color: '#FDCB6E', fontWeight: 'bold', marginTop: 2 }}>{warningCount}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="alert-circle" size={36} color="#E74C3C" />
              <Text style={{ fontSize: 22, color: '#E74C3C', fontWeight: 'bold', marginTop: 2 }}>{problemCount}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {/* Income Card */}
        <View style={{ ...cardStyle, borderColor: '#00B894', borderWidth: 2 }}>
          <Ionicons name="trending-up" size={34} color="#00B894" style={{ marginBottom: 6 }} />
          <Text style={{ color: '#2D3436', fontWeight: 'bold', fontSize: 15, marginBottom: 2, textAlign: 'center' }}>Rendimento Mensal</Text>
          <Text style={{ fontSize: 20, color: '#00B894', fontWeight: 'bold', textAlign: 'center' }}>
            {totalIncome !== null ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(totalIncome) : '--'}
          </Text>
        </View>
        {/* Expenses Card */}
        <View style={{ ...cardStyle, borderColor: '#E74C3C', borderWidth: 2 }}>
          <Ionicons name="trending-down" size={34} color="#E74C3C" style={{ marginBottom: 6 }} />
          <Text style={{ color: '#2D3436', fontWeight: 'bold', fontSize: 15, marginBottom: 2, textAlign: 'center' }}>Despesas Mensais</Text>
          <Text style={{ fontSize: 20, color: '#E74C3C', fontWeight: 'bold', textAlign: 'center' }}>
            {totalExpenses !== null ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(totalExpenses) : '--'}
          </Text>
        </View>
        {/* Available Money Card */}
        <View style={{ ...cardStyle, borderColor: '#FDCB6E', borderWidth: 2 }}>
          <Ionicons name="wallet" size={34} color="#FDCB6E" style={{ marginBottom: 6 }} />
          <Text style={{ color: '#2D3436', fontWeight: 'bold', fontSize: 15, marginBottom: 2, textAlign: 'center' }}>Dinheiro Disponível</Text>
          <Text style={{ fontSize: 20, color: '#00B894', fontWeight: 'bold', textAlign: 'center' }}>
            {availableMoney !== null ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(availableMoney) : '--'}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default MainMenuPage;