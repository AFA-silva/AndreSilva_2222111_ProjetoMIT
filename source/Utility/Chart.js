import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';

const GaugeChart = ({ 
  value = 0, 
  valueMin = 0, 
  valueMax = 100, 
  width = 200, 
  height = 150, 
  startAngle = -90, 
  endAngle = 90, 
  innerRadius = '80%', 
  outerRadius = '100%', 
  cornerRadius = 0,
  textFontSize = 16,
  textDx = 0,
  textDy = 0,
  formatText,
  gaugeColors = {
    valueArc: '#FF9800',
    referenceArc: '#FFE0B2',
    valueText: '#2D3748'
  },
}) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <View style={[styles.gaugeContainer, { width, height }]}>
        <Text style={styles.loadingText}>Loading gauge...</Text>
      </View>
    );
  }

  const normalizedValue = Math.min(Math.max(value, valueMin), valueMax);
  const valuePercentage = (normalizedValue - valueMin) / (valueMax - valueMin);
  
  // Calculate coordinates and dimensions
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(centerX, centerY) * 0.9;
  
  // Parse radius values
  const getRadiusValue = (radius, maxRadius) => {
    if (typeof radius === 'string' && radius.endsWith('%')) {
      return maxRadius * (parseFloat(radius) / 100);
    }
    return radius;
  };

  const outerRadiusValue = getRadiusValue(outerRadius, maxRadius);
  const innerRadiusValue = getRadiusValue(innerRadius, maxRadius);
  const cornerRadiusValue = typeof cornerRadius === 'string' && cornerRadius.endsWith('%') 
    ? (outerRadiusValue - innerRadiusValue) * (parseFloat(cornerRadius) / 100)
    : cornerRadius;

  // Calculate angles
  const angleRange = endAngle - startAngle;
  const valueAngle = startAngle + (angleRange * valuePercentage);

  // Create arcs
  const createArc = (startAngle, endAngle) => {
    // Convert angles from degrees to radians
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    
    // Calculate start and end points
    const startX = centerX + outerRadiusValue * Math.cos(startRad);
    const startY = centerY + outerRadiusValue * Math.sin(startRad);
    const endX = centerX + outerRadiusValue * Math.cos(endRad);
    const endY = centerY + outerRadiusValue * Math.sin(endRad);
    
    // Calculate inner points
    const innerStartX = centerX + innerRadiusValue * Math.cos(startRad);
    const innerStartY = centerY + innerRadiusValue * Math.sin(startRad);
    const innerEndX = centerX + innerRadiusValue * Math.cos(endRad);
    const innerEndY = centerY + innerRadiusValue * Math.sin(endRad);
    
    // Determine if the arc is larger than 180 degrees
    const largeArcFlag = Math.abs(endAngle - startAngle) >= 180 ? 1 : 0;
    
    // Create path
    return `
      M ${startX} ${startY}
      A ${outerRadiusValue} ${outerRadiusValue} 0 ${largeArcFlag} 1 ${endX} ${endY}
      L ${innerEndX} ${innerEndY}
      A ${innerRadiusValue} ${innerRadiusValue} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}
      Z
    `;
  };

  // Format the displayed text
  const formattedText = formatText 
    ? formatText({ value: normalizedValue, valueMin, valueMax }) 
    : Math.round(normalizedValue).toString();

  return (
    <View style={[styles.gaugeContainer, { width, height }]}>
      <Svg width={width} height={height}>
        <G>
          {/* Reference Arc (background) */}
          <Path
            d={createArc(startAngle, endAngle)}
            fill={gaugeColors.referenceArc}
          />
          
          {/* Value Arc */}
          <Path
            d={createArc(startAngle, valueAngle)}
            fill={gaugeColors.valueArc}
          />
          
          {/* Center Text */}
          <SvgText
            x={centerX + textDx}
            y={centerY + textDy}
            textAnchor="middle"
            alignmentBaseline="middle"
            fill={gaugeColors.valueText}
            fontSize={textFontSize}
            fontWeight="bold"
          >
            {formattedText}
          </SvgText>
        </G>
      </Svg>
    </View>
  );
};

const Chart = ({ incomes, categories, frequencies, processData, chartTypes = ['Bar', 'Pie', 'Line'] }) => {
  const [chartType, setChartType] = useState(chartTypes[0].toLowerCase());
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
    if (!incomes || !categories || !frequencies) return [];

    // Calcule o total mensal por categoria
    const categoryTotals = categories.map((category) => {
      const total = incomes
        .filter((income) => income.category_id === category.id)
        .reduce((sum, income) => {
          const frequency = frequencies.find((freq) => freq.id === income.frequency_id);
          const days = frequency?.days || 30;
          // Converter para valor mensal
          const monthlyAmount = income.amount * (30 / days);
          return sum + monthlyAmount;
        }, 0);
      return { name: category.name, total };
    });

    const totalSum = categoryTotals.reduce((sum, cat) => sum + cat.total, 0);
    const colors = ['#FFA726', '#FFB74D', '#FFCC80', '#FFE0B2', '#FFECB3'];

    return categoryTotals
      .filter((cat) => cat.total > 0)
      .map((cat, index) => {
        const percentage = totalSum > 0 ? Math.round((cat.total / totalSum) * 100) : 0;
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

  const calculateChartData = () => {
    if (!incomes || !processData) {
      // Fallback to original calculations for Income page
      if (chartType === 'bar') {
        const { labels, data } = calculateTopCategoriesByPeriod();
        return { labels, data };
      }
      if (chartType === 'pie') {
        return calculatePieChartData();
      }
      if (chartType === 'line') {
        const { labels, data } = calculateLineChartData();
        return { labels, data };
      }
      return { labels: [], data: [] };
    }

    // Process data for Expenses page
    const processedData = processData(incomes, period);
    if (!processedData) return { labels: [], data: [] };

    switch (chartType) {
      case 'categories':
        return {
          labels: processedData.categoryData.map(cat => cat.name.slice(0, 3)),
          data: processedData.categoryData.map(cat => Math.round(cat.amount)),
        };
      case 'priority':
        return processedData.priorityData;
      case 'status':
        return processedData.statusData;
      default:
        // Fallback to original calculations
        if (chartType === 'bar') {
          const { labels, data } = calculateTopCategoriesByPeriod();
          return { labels, data };
        }
        if (chartType === 'pie') {
          return calculatePieChartData();
        }
        if (chartType === 'line') {
          const { labels, data } = calculateLineChartData();
          return { labels, data };
        }
        return { labels: [], data: [] };
    }
  };

  const renderChart = () => {
    if (!isChartReady) {
      return (
        <View style={[styles.chartBackground, styles.loadingContainer]}>
          <Text style={styles.loadingText}>Loading chart...</Text>
        </View>
      );
    }

    const chartData = calculateChartData();

    if (!chartData || (Array.isArray(chartData) && chartData.length === 0) || 
        (!Array.isArray(chartData) && (!chartData.labels || !chartData.data))) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available for the selected period.</Text>
        </View>
      );
    }

    if (chartType === 'bar' || chartType === 'categories') {
      return (
        <View style={styles.chartBackground}>
          <BarChart
            key={`bar-${renderKey}`}
            data={{
              labels: chartData.labels,
              datasets: [{ data: chartData.data }],
            }}
            width={screenWidth - 48}
            height={180}
            fromZero={true}
            chartConfig={{
              ...defaultChartConfig,
              backgroundGradientFromOpacity: 0,
              backgroundGradientToOpacity: 0,
              backgroundColor: 'transparent',
              barPercentage: 0.7,
              decimalPlaces: 0,
            }}
            style={styles.chart}
            showValuesOnTopOfBars={true}
            withInnerLines={false}
            segments={4}
          />
        </View>
      );
    }

    if (chartType === 'pie' || chartType === 'priority' || chartType === 'status') {
      return (
        <PieChart
          data={Array.isArray(chartData) ? chartData : [chartData]}
          width={screenWidth - 48}
          height={180}
          chartConfig={{
            ...defaultChartConfig,
            backgroundGradientFromOpacity: 0,
            backgroundGradientToOpacity: 0,
            backgroundColor: 'transparent',
          }}
          accessor={chartType === 'priority' || chartType === 'status' ? "amount" : "value"}
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
          absolute
        />
      );
    }

    if (chartType === 'line') {
      return (
        <LinearGradient
          colors={['#FFA726', '#FFB74D']}
          style={styles.chartBackground}
        >
          <LineChart
            data={{
              labels: chartData.labels,
              datasets: [{ data: chartData.data }],
            }}
            width={screenWidth - 48}
            height={180}
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
        {chartTypes.map((type) => {
          const typeLower = type.toLowerCase();
          return (
            <TouchableOpacity
              key={type}
              style={[styles.button, chartType === typeLower && styles.activeButton]}
              onPress={() => setChartType(typeLower)}
            >
              <Text style={[styles.buttonText, chartType === typeLower && styles.activeButtonText]}>
                {type}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
});

export { GaugeChart };
export default Chart;