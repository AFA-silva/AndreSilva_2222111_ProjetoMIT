import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const Chart = ({ incomes, categories, frequencies }) => {
  const [chartType, setChartType] = useState('bar');
  const [renderKey, setRenderKey] = useState(0);
  const [isChartReady, setIsChartReady] = useState(false);
  const [period, setPeriod] = useState('month'); // 'day', 'week', 'month'
  const screenWidth = Dimensions.get('window').width;

  // Forçar re-render após um pequeno delay para garantir que o SVG seja renderizado corretamente
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChartReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [chartType]);

  useFocusEffect(
    useCallback(() => {
      setRenderKey(prev => prev + 1);
      setIsChartReady(false);
      const timer = setTimeout(() => {
        setIsChartReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  const defaultChartConfig = {
    backgroundGradientFrom: '#FFA726',
    backgroundGradientTo: '#FFB74D',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#FFA726',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: 'rgba(255, 255, 255, 0.2)',
    },
  };

  const calculateTopCategoriesByPeriod = () => {
    if (!incomes || !categories || !frequencies) return { labels: [], data: [] };

    const today = new Date();
    let categoryTotals = {};

    // Inicializar totais para cada categoria
    categories.forEach(category => {
      categoryTotals[category.id] = {
        name: category.name,
        total: 0
      };
    });

    // Calcular totais baseado no período selecionado
    incomes.forEach(income => {
      const incomeDate = new Date(income.created_at);
      const frequency = frequencies.find(f => f.id === income.frequency_id);
      const days = frequency?.days || 30;
      let shouldInclude = false;
      let convertedAmount = income.amount;
      switch (period) {
        case 'day':
          convertedAmount = income.amount / days;
          const dayDiff = Math.floor((today - incomeDate) / (1000 * 60 * 60 * 24));
          shouldInclude = dayDiff < 7;
          break;
        case 'week':
          convertedAmount = income.amount * (7 / days);
          const weekDiff = Math.floor((today - incomeDate) / (1000 * 60 * 60 * 24 * 7));
          shouldInclude = weekDiff < 4;
          break;
        case 'month':
          convertedAmount = income.amount * (30 / days);
          const monthDiff = (today.getMonth() - incomeDate.getMonth() + 
            (today.getFullYear() - incomeDate.getFullYear()) * 12);
          shouldInclude = monthDiff < 6;
          break;
      }
      // Só soma se a categoria existir
      if (shouldInclude && categoryTotals[income.category_id]) {
        categoryTotals[income.category_id].total += convertedAmount;
      }
    });

    // Converter para array e ordenar
    const sortedCategories = Object.values(categoryTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);

    const labels = sortedCategories.map(cat => cat.name.slice(0, 3));
    const data = sortedCategories.map(cat => Math.round(cat.total));

    return { labels, data };
  };

  const calculatePieChartData = () => {
    if (!incomes || !categories) return [];

    const categoryTotals = categories.map((category) => {
      const total = incomes
        .filter((income) => income.category_id === category.id)
        .reduce((sum, income) => sum + income.amount, 0);
      return { name: category.name, total };
    });

    const totalSum = categoryTotals.reduce((sum, cat) => sum + cat.total, 0);
    const colors = ['#FFA726', '#FFB74D', '#FFCC80', '#FFE0B2', '#FFECB3'];

    return categoryTotals
      .filter((cat) => cat.total > 0)
      .map((cat, index) => {
        const percentage = Math.round((cat.total / totalSum) * 100);
        return {
          name: `% ${cat.name}`,
          value: percentage,
          color: colors[index % colors.length],
          legendFontColor: '#333333',
          legendFontSize: 14,
        };
      });
  };

  const calculateLineChartData = () => {
    if (!incomes || !frequencies) return { labels: [], data: [] };

    const today = new Date();
    let labels = [];
    let data = [];

    switch (period) {
      case 'day':
        // Últimos 7 dias
        labels = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(date.getDate() - (6 - i));
          return date.toLocaleDateString('en-US', { weekday: 'short' });
        });
        data = Array(7).fill(0);
        break;

      case 'week':
        // Últimas 4 semanas
        labels = Array.from({ length: 4 }, (_, i) => `Week ${4 - i}`);
        data = Array(4).fill(0);
        break;

      case 'month':
        // Últimos 6 meses
        labels = Array.from({ length: 6 }, (_, i) => {
          const date = new Date(today);
          date.setMonth(date.getMonth() - (5 - i));
          return date.toLocaleDateString('en-US', { month: 'short' });
        });
        data = Array(6).fill(0);
        break;
    }

    // Calcular totais por período
    incomes.forEach(income => {
      const incomeDate = new Date(income.created_at);
      const frequency = frequencies.find(f => f.id === income.frequency_id);
      const days = frequency?.days || 30;

      switch (period) {
        case 'day':
          const dayIndex = 6 - Math.floor((today - incomeDate) / (1000 * 60 * 60 * 24));
          if (dayIndex >= 0 && dayIndex < 7) {
            data[dayIndex] += income.amount;
          }
          break;

        case 'week':
          const weekIndex = 3 - Math.floor((today - incomeDate) / (1000 * 60 * 60 * 24 * 7));
          if (weekIndex >= 0 && weekIndex < 4) {
            data[weekIndex] += income.amount;
          }
          break;

        case 'month':
          const monthIndex = 5 - Math.floor((today.getMonth() - incomeDate.getMonth() + 
            (today.getFullYear() - incomeDate.getFullYear()) * 12));
          if (monthIndex >= 0 && monthIndex < 6) {
            data[monthIndex] += income.amount;
          }
          break;
      }
    });

    return { labels, data: data.map(value => Math.round(value)) };
  };

  const renderChart = () => {
    if (!isChartReady) {
      return (
        <View style={[styles.chartBackground, styles.loadingContainer]}>
          <Text style={styles.loadingText}>Loading chart...</Text>
        </View>
      );
    }

    const { labels, data } = calculateTopCategoriesByPeriod();

    if (!labels || !data || labels.length === 0 || data.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available for the chart.</Text>
        </View>
      );
    }

    if (chartType === 'bar') {
      return (
        <View style={styles.chartBackground}>
          <BarChart
            key={`bar-${renderKey}`}
            data={{
              labels,
              datasets: [{ data }],
            }}
            width={300}
            height={160}
            fromZero={true}
            chartConfig={{
              ...defaultChartConfig,
              backgroundGradientFromOpacity: 0,
              backgroundGradientToOpacity: 0,
              backgroundColor: 'transparent',
              barPercentage: 0.7,
            }}
            style={styles.chart}
            showValuesOnTopOfBars={true}
            withInnerLines={false}
            segments={4}
          />
        </View>
      );
    }

    if (chartType === 'pie') {
      const pieData = calculatePieChartData();
      if (pieData.length === 0) {
        return (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No data available for Pie chart.</Text>
          </View>
        );
      }

      return (
        <PieChart
          data={pieData}
          width={300}
          height={160}
          chartConfig={{
            ...defaultChartConfig,
            backgroundGradientFromOpacity: 0,
            backgroundGradientToOpacity: 0,
            backgroundColor: 'transparent',
          }}
          accessor="value"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
          absolute
        />
      );
    }

    if (chartType === 'line') {
      const { labels: lineLabels, data: lineData } = calculateLineChartData();
      return (
        <LinearGradient
          colors={['#FFA726', '#FFB74D']}
          style={styles.chartBackground}
        >
          <LineChart
            data={{
              labels: lineLabels,
              datasets: [{ data: lineData }],
            }}
            width={300}
            height={160}
            chartConfig={{
              ...defaultChartConfig,
              backgroundGradientFromOpacity: 0,
              backgroundGradientToOpacity: 0,
              backgroundColor: 'transparent',
              propsForBackgroundLines: { strokeDasharray: '', stroke: 'rgba(255, 255, 255, 0.2)' },
              propsForDots: { r: '6', strokeWidth: '2', stroke: '#FFFFFF' },
            }}
            bezier
            style={styles.chart}
            withInnerLines={false}
          />
        </LinearGradient>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.periodContainer}>
        <TouchableOpacity
          style={[styles.periodButton, period === 'day' && styles.activePeriodButton]}
          onPress={() => setPeriod('day')}
        >
          <Text style={[styles.periodButtonText, period === 'day' && styles.activePeriodButtonText]}>Day</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === 'week' && styles.activePeriodButton]}
          onPress={() => setPeriod('week')}
        >
          <Text style={[styles.periodButtonText, period === 'week' && styles.activePeriodButtonText]}>Week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === 'month' && styles.activePeriodButton]}
          onPress={() => setPeriod('month')}
        >
          <Text style={[styles.periodButtonText, period === 'month' && styles.activePeriodButtonText]}>Month</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, chartType === 'bar' && styles.activeButton]}
          onPress={() => setChartType('bar')}
        >
          <Text style={[styles.buttonText, chartType === 'bar' && styles.activeButtonText]}>Bar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, chartType === 'pie' && styles.activeButton]}
          onPress={() => setChartType('pie')}
        >
          <Text style={[styles.buttonText, chartType === 'pie' && styles.activeButtonText]}>Pie</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, chartType === 'line' && styles.activeButton]}
          onPress={() => setChartType('line')}
        >
          <Text style={[styles.buttonText, chartType === 'line' && styles.activeButtonText]}>Line</Text>
        </TouchableOpacity>
      </View>

      {renderChart()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  periodContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFE0B2',
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activePeriodButton: {
    backgroundColor: '#FFA726',
  },
  periodButtonText: {
    color: '#FFA726',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFE0B2',
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeButton: {
    backgroundColor: '#FFA726',
  },
  buttonText: {
    color: '#FFA726',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeButtonText: {
    color: '#FFFFFF',
  },
  chartBackground: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#FFA726',
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  noDataContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  noDataText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Chart;