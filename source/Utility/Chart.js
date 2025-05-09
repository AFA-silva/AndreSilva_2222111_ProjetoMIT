import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const Chart = ({ incomes, categories, frequencies }) => {
  const [chartType, setChartType] = useState('bar'); // Estado inicial: BarChart

  // Dados mock para os gráficos
  const mockData = [50, 100, 75, 200];
  const mockLabels = ['Jan', 'Feb', 'Mar', 'Apr'];

  const defaultChartConfig = {
    backgroundColor: '#FFF',
    backgroundGradientFrom: '#F57C00',
    backgroundGradientTo: '#FFA726',
    decimalPlaces: 2,
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
  };

  const predefinedColors = [
    '#FFA07A', // Laranja salmão
    '#F57C00', // Laranja escuro
    '#FFD700', // Amarelo dourado
    '#00BFFF', // Azul claro
    '#32CD32', // Verde limão
  ];

  const calculateMonthlyIncomes = () => {
    if (!incomes || !categories || !frequencies) return [];

    return categories.map((category, index) => {
      const totalByCategory = incomes
        .filter((income) => income.category_id === category.id)
        .reduce((sum, income) => {
          const frequency = frequencies.find((freq) => freq.id === income.frequency_id);
          const days = frequency?.days || 30; // Padrão: 30 dias se ausente
          const monthlyAmount = income.amount * (30 / days); // Converter para mensal
          return sum + monthlyAmount;
        }, 0);

      return {
        name: category.name,
        population: totalByCategory,
        color: predefinedColors[index % predefinedColors.length], // Usa cores predefinidas
        legendFontColor: '#333333',
        legendFontSize: 12,
      };
    });
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart
            data={{
              labels: mockLabels,
              datasets: [{ data: mockData }],
            }}
            width={300}
            height={200}
            chartConfig={{
              ...defaultChartConfig,
              barPercentage: 0.7,
            }}
            style={styles.chart}
          />
        );
      case 'pie':
        const pieData = calculateMonthlyIncomes();
        if (!pieData || pieData.length === 0) {
          return <Text>No data available for Pie chart</Text>;
        }
        return (
          <PieChart
            data={pieData}
            width={300}
            height={200}
            chartConfig={defaultChartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        );
      case 'line':
        return (
          <LineChart
            data={{
              labels: mockLabels,
              datasets: [{ data: mockData }],
            }}
            width={300}
            height={200}
            chartConfig={{
              ...defaultChartConfig,
              propsForBackgroundLines: { strokeDasharray: '' },
              propsForDots: { r: '5', fill: '#FFFFFF' },
            }}
            bezier
            style={styles.chart}
          />
        );
      default:
        return <Text>No chart selected</Text>;
    }
  };

  return (
    <View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, chartType === 'bar' && styles.activeButton]}
          onPress={() => setChartType('bar')}
        >
          <Text style={styles.buttonText}>Bar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, chartType === 'pie' && styles.activeButton]}
          onPress={() => setChartType('pie')}
        >
          <Text style={styles.buttonText}>Pie</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, chartType === 'line' && styles.activeButton]}
          onPress={() => setChartType('line')}
        >
          <Text style={styles.buttonText}>Line</Text>
        </TouchableOpacity>
      </View>
      {renderChart()}
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFA726',
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: '#F57C00',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default Chart;