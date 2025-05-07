import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const Chart = ({ incomes, categories, frequencies }) => {
  const [chartType, setChartType] = useState('line'); // Estado para alternar o tipo de gráfico

  // Dados falsos (mock) para line e bar charts
  const mockData = [50, 100, 75, 200];
  const mockLabels = ['Jan', 'Feb', 'Mar', 'Apr'];

  const defaultChartConfig = {
    backgroundColor: '#FFF',
    backgroundGradientFrom: '#F57C00', // Gradiente laranja inicial
    backgroundGradientTo: '#FFA726',   // Gradiente laranja final
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, // Texto branco
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

  const calculateMonthlyIncomes = () => {
    if (!incomes || !categories || !frequencies) return [];

    return categories.map((category) => {
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
        color: [
          '#FFA07A', // Laranja salmão
          '#F57C00', // Laranja escuro
          '#FFD700', // Amarelo dourado
          '#FF6F61', // Vermelho claro
        ][category.id % 4], // Ciclo de cores baseado no ID da categoria
        legendFontColor: '#333333',
        legendFontSize: 12,
      };
    });
  };

  const renderChart = () => {
    if (chartType !== 'pie') {
      // Use dados mock para gráficos de linha e barra
      switch (chartType) {
        case 'line':
          return (
            <LineChart
              data={{
                labels: mockLabels,
                datasets: [{ data: mockData }],
              }}
              width={300} // Tamanho ajustado: largura
              height={200} // Tamanho ajustado: altura
              chartConfig={{
                ...defaultChartConfig,
                propsForBackgroundLines: { strokeDasharray: '' },
                propsForDots: { r: '5', fill: '#FFFFFF' }, // Bolinhas brancas
              }}
              bezier // Para suavizar a linha
              style={styles.chart}
            />
          );
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
                barPercentage: 0.7, // Largura das barras
              }}
              style={styles.chart}
            />
          );
        default:
          return <Text>No chart available</Text>;
      }
    } else {
      // Use dados reais para o gráfico de pizza
      const pieData = calculateMonthlyIncomes();
      if (!pieData || pieData.length === 0) {
        return <Text>No data available for Pie chart</Text>;
      }

      return (
        <PieChart
          data={pieData}
          width={250} // Tamanho ajustado
          height={180} // Tamanho ajustado
          chartConfig={{
            ...defaultChartConfig,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.pieChart} // Estilo específico para o Pie Chart
        />
      );
    }
  };

  return (
    <View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, chartType === 'line' && styles.activeButton]}
          onPress={() => setChartType('line')}
        >
          <Text style={styles.buttonText}>Line</Text>
        </TouchableOpacity>
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
    backgroundColor: '#F57C00', // Fundo mais escuro para o botão ativo
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
  pieChart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default Chart;