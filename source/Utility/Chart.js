import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { 
  G, 
  Path, 
  Circle, 
  Text as SvgText,
  Rect,
  Line,
  LinearGradient as SvgGradient,
  Stop,
  Defs 
} from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  useAnimatedStyle,
  withTiming,
  Easing 
} from 'react-native-reanimated';

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
  
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(centerX, centerY) * 0.9;
  
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

  const angleRange = endAngle - startAngle;
  const valueAngle = startAngle + (angleRange * valuePercentage);

  const createArc = (startAngle, endAngle) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    
    const startX = centerX + outerRadiusValue * Math.cos(startRad);
    const startY = centerY + outerRadiusValue * Math.sin(startRad);
    const endX = centerX + outerRadiusValue * Math.cos(endRad);
    const endY = centerY + outerRadiusValue * Math.sin(endRad);
    
    const innerStartX = centerX + innerRadiusValue * Math.cos(startRad);
    const innerStartY = centerY + innerRadiusValue * Math.sin(startRad);
    const innerEndX = centerX + innerRadiusValue * Math.cos(endRad);
    const innerEndY = centerY + innerRadiusValue * Math.sin(endRad);
    
    const largeArcFlag = Math.abs(endAngle - startAngle) >= 180 ? 1 : 0;
    
    return `
      M ${startX} ${startY}
      A ${outerRadiusValue} ${outerRadiusValue} 0 ${largeArcFlag} 1 ${endX} ${endY}
      L ${innerEndX} ${innerEndY}
      A ${innerRadiusValue} ${innerRadiusValue} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}
      Z
    `;
  };

  const formattedText = formatText 
    ? formatText({ value: normalizedValue, valueMin, valueMax }) 
    : Math.round(normalizedValue).toString();

  return (
    <View style={[styles.gaugeContainer, { width, height }]}>
      <Svg width={width} height={height}>
        <G>
          <Path
            d={createArc(startAngle, endAngle)}
            fill={gaugeColors.referenceArc}
          />
          <Path
            d={createArc(startAngle, valueAngle)}
            fill={gaugeColors.valueArc}
          />
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

// Crie um AnimatedRect para animar a altura da barra
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const AnimatedPath = Animated.createAnimatedComponent(Path);

const AnimatedText = Animated.createAnimatedComponent(SvgText);

const AnimatedBar3D = ({
  x,
  y,
  width,
  height,
  colors,
  value,
  label,
  index,
  depthEffect = 8,
  topEffect = 4,
  delay = 0,
  isTextOnly = false,
}) => {
  const animatedHeight = useSharedValue(0);

  useEffect(() => {
    animatedHeight.value = 0;

    const timeout = setTimeout(() => {
      animatedHeight.value = withTiming(height, { 
        duration: 1000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });
    }, delay);

    return () => {
      clearTimeout(timeout);
      animatedHeight.value = 0;
    };
  }, [height, delay]);

  // Estilo animado para o texto
  const animatedTextStyle = useAnimatedStyle(() => {
    const currentY = y + (height - animatedHeight.value) - 25;
    return {
      position: 'absolute',
      left: x + width / 2 - 15,
      top: currentY,
      width: 30,
      alignItems: 'center',
      backgroundColor: 'transparent',
    };
  });

  const sideAnimatedProps = useAnimatedProps(() => {
    const currentY = y + (height - animatedHeight.value);
    return {
      d: `
        M ${x + width} ${currentY + animatedHeight.value}
        l ${depthEffect} ${-depthEffect}
        l 0 ${-animatedHeight.value + topEffect}
        l ${-depthEffect} ${depthEffect}
        Z
      `,
    };
  });

  const frontAnimatedProps = useAnimatedProps(() => ({
    height: animatedHeight.value,
    y: y + (height - animatedHeight.value),
  }));

  const topAnimatedProps = useAnimatedProps(() => {
    const currentY = y + (height - animatedHeight.value);
    return {
      d: `
        M ${x} ${currentY}
        l ${width} 0
        l ${depthEffect} ${-depthEffect}
        l ${-width} 0
        Z
      `,
    };
  });

  if (isTextOnly) {
    return (
      <Animated.View style={animatedTextStyle}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            backgroundColor: 'transparent',
          }}
        >
          {Math.round(value)}
        </Text>
      </Animated.View>
    );
  }

  return (
    <G key={index}>
      <Defs>
        <SvgGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors[0]} stopOpacity="1" />
          <Stop offset="1" stopColor={colors[1]} stopOpacity="0.8" />
        </SvgGradient>
        <SvgGradient id={`gradient-top-${index}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors[0]} stopOpacity="1" />
          <Stop offset="1" stopColor={colors[1]} stopOpacity="0.9" />
        </SvgGradient>
        <SvgGradient id={`gradient-side-${index}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors[1]} stopOpacity="0.4" />
          <Stop offset="1" stopColor={colors[1]} stopOpacity="0.1" />
        </SvgGradient>
      </Defs>

      <AnimatedPath
        animatedProps={sideAnimatedProps}
        fill={`url(#gradient-side-${index})`}
      />

      <AnimatedRect
        x={x}
        width={width}
        rx={4}
        ry={4}
        fill={`url(#gradient-${index})`}
        animatedProps={frontAnimatedProps}
      />

      <AnimatedPath
        animatedProps={topAnimatedProps}
        fill={`url(#gradient-top-${index})`}
      />

      <SvgText
        x={x + width / 2}
        y={y + height + 16}
        fontSize="11"
        fill="#666"
        textAnchor="middle"
      >
        {label}
      </SvgText>
    </G>
  );
};

const renderCustomBarChart = ({
  labels,
  data,
  width,
  height,
  style,
}) => {
  const barCount = data.length;
  const maxValue = Math.max(...data, 1);
  const barWidth = Math.max((width - 80) / (barCount * 1.5), 30);
  const chartHeight = height - 50;
  
  const barColors = [
    ['#4CAF50', '#81C784'],
    ['#2196F3', '#64B5F6'],
    ['#9C27B0', '#BA68C8'],
    ['#FF9800', '#FFB74D'],
    ['#F44336', '#E57373'],
  ];

  return (
    <View style={[styles.customBarChartWrapper, style]}>
      <View style={{ position: 'relative', height: height + 30 }}>
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 1000,
        }}>
          {data.map((value, i) => {
            const barHeight = (value / maxValue) * (chartHeight - 40);
            const x = 50 + i * (barWidth * 1.5);
            const y = chartHeight - barHeight;
            
            return (
              <AnimatedBar3D
                key={`text-${i}`}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                colors={barColors[i % barColors.length]}
                value={Math.round(value)}
                label={labels[i]}
                index={i}
                isTextOnly={true}
              />
            );
          })}
        </View>

        <Svg width={width} height={height}>
          {[...Array(5)].map((_, i) => {
            const y = chartHeight - (chartHeight * (i / 4));
            return (
              <Line
                key={i}
                x1="40"
                y1={y}
                x2={width - 20}
                y2={y}
                stroke="#E0E0E0"
                strokeWidth="1"
                strokeDasharray="5,5"
              />
            );
          })}

          {data.map((value, i) => {
            const barHeight = (value / maxValue) * (chartHeight - 40);
            const x = 50 + i * (barWidth * 1.5);
            const y = chartHeight - barHeight;
            
            return (
              <G key={i}>
                {renderCustomBar3D({
                  x,
                  y,
                  width: barWidth,
                  height: barHeight,
                  colors: barColors[i % barColors.length],
                  value: Math.round(value),
                  label: labels[i],
                  index: i,
                  isTextOnly: false
                })}
              </G>
            );
          })}
        </Svg>
      </View>
    </View>
  );
};

const renderCustomBar3D = (props) => <AnimatedBar3D {...props} delay={props.index * 120} />;

const Chart = ({ incomes, categories, frequencies, processData, chartTypes = ['Bar', 'Pie', 'Line'] }) => {
  const [chartType, setChartType] = useState(chartTypes[0].toLowerCase());
  const [renderKey, setRenderKey] = useState(0);
  const [isChartReady, setIsChartReady] = useState(false);
  const [period, setPeriod] = useState('month');
  const screenWidth = Dimensions.get('window').width;

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

    categories.forEach(category => {
      categoryTotals[category.id] = {
        name: category.name,
        total: 0
      };
    });

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

      if (shouldInclude && categoryTotals[income.category_id]) {
        categoryTotals[income.category_id].total += convertedAmount;
      }
    });

    const sortedCategories = Object.values(categoryTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);

    const labels = sortedCategories.map(cat => cat.name.slice(0, 3));
    const data = sortedCategories.map(cat => Math.round(cat.total));

    return { labels, data };
  };

  const calculatePieChartData = () => {
    if (!incomes || !categories || !frequencies) return [];

    const categoryTotals = categories.map((category) => {
      const total = incomes
        .filter((income) => income.category_id === category.id)
        .reduce((sum, income) => {
          const frequency = frequencies.find((freq) => freq.id === income.frequency_id);
          const days = frequency?.days || 30;
          const monthlyAmount = income.amount * (30 / days);
          return sum + monthlyAmount;
        }, 0);
      return { name: category.name, total };
    });

    const totalSum = categoryTotals.reduce((sum, cat) => sum + cat.total, 0);
    const colors = ['#FFA726', '#FFD54F', '#FF8A65', '#FFB300', '#FFECB3'];

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
        labels = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(date.getDate() - (6 - i));
          return date.toLocaleDateString('en-US', { weekday: 'short' });
        });
        data = Array(7).fill(0);
        break;

      case 'week':
        labels = Array.from({ length: 4 }, (_, i) => `Week ${4 - i}`);
        data = Array(4).fill(0);
        break;

      case 'month':
        labels = Array.from({ length: 6 }, (_, i) => {
          const date = new Date(today);
          date.setMonth(date.getMonth() - (5 - i));
          return date.toLocaleDateString('en-US', { month: 'short' });
        });
        data = Array(6).fill(0);
        break;
    }

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
        <View style={[styles.chartBackground, { backgroundColor: '#FFF', padding: 8 }]}>
          {renderCustomBarChart({
            labels: chartData.labels,
            data: chartData.data,
            width: screenWidth - 48,
            height: 220,
            style: { backgroundColor: 'transparent' }
          })}
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
  customBarChartWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    minHeight: 200,
    paddingTop: 20,
    paddingBottom: 16,
  },
});

export { GaugeChart };
export default Chart;