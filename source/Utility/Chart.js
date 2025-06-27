import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, Animated as RNAnimated, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Svg, { 
  G, 
  Path, 
  Circle, 
  Text as SvgText,
  Rect,
  Line,
  LinearGradient,
  RadialGradient,
  Stop,
  Defs 
} from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  Extrapolate,
  runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import SkeletonLoading from './SkeletonLoading';

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
    valueText: '#333333'
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

// Componente AnimatedView para animações do contenedor do gráfico
const AnimatedView = Animated.createAnimatedComponent(View);

// Componente simplificado com interatividade de clique
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
  periodKey = "default",
  onBarPress = () => {},
  isSelected = false,
}) => {
  const animatedHeight = useSharedValue(0);
  const scaleValue = useSharedValue(1);

  useEffect(() => {
    animatedHeight.value = 0;

    const timeout = setTimeout(() => {
      animatedHeight.value = withTiming(height, { 
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });
    }, delay);

    return () => {
      clearTimeout(timeout);
      animatedHeight.value = 0;
    };
  }, [height, delay, periodKey]);

  // Animação de seleção
  useEffect(() => {
    scaleValue.value = withTiming(isSelected ? 1.05 : 1, {
      duration: 200,
      easing: Easing.out(Easing.quad)
    });
  }, [isSelected]);

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
      transform: [{ scale: scaleValue.value }],
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

  // Função para lidar com o clique
  const handlePress = () => {
    onBarPress(label, index);
  };

  if (isTextOnly) {
    return (
      <Animated.View style={animatedTextStyle}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: isSelected ? '#FF6F00' : '#4A5568',
            textAlign: 'center',
            backgroundColor: 'transparent',
            textShadowColor: 'rgba(255,255,255,0.8)',
            textShadowOffset: {width: 0, height: 1},
            textShadowRadius: 1,
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
        <LinearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors[0]} stopOpacity={isSelected ? "1" : "0.9"} />
          <Stop offset="1" stopColor={colors[1]} stopOpacity={isSelected ? "0.9" : "0.7"} />
        </LinearGradient>
        <LinearGradient id={`gradient-top-${index}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors[0]} stopOpacity={isSelected ? "1" : "0.9"} />
          <Stop offset="1" stopColor={colors[1]} stopOpacity={isSelected ? "0.95" : "0.8"} />
        </LinearGradient>
        <LinearGradient id={`gradient-side-${index}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors[1]} stopOpacity={isSelected ? "0.6" : "0.4"} />
          <Stop offset="1" stopColor={colors[1]} stopOpacity={isSelected ? "0.3" : "0.1"} />
        </LinearGradient>
      </Defs>

      <AnimatedPath
        animatedProps={sideAnimatedProps}
        fill={`url(#gradient-side-${index})`}
        onPress={handlePress}
      />

      <AnimatedRect
        x={x}
        width={width}
        rx={4}
        ry={4}
        fill={`url(#gradient-${index})`}
        animatedProps={frontAnimatedProps}
        onPress={handlePress}
      />

      <AnimatedPath
        animatedProps={topAnimatedProps}
        fill={`url(#gradient-top-${index})`}
        onPress={handlePress}
      />

      {/* Label da categoria com estilo melhorado */}
      <G onPress={handlePress}>
        {/* Fundo do label */}
        <Rect
          x={x + width / 2 - 20}
          y={y + height + 8}
          width={40}
          height={20}
          rx={10}
          ry={10}
          fill={isSelected ? colors[0] : '#FFFFFF'}
          stroke={isSelected ? '#FFFFFF' : colors[0]}
          strokeWidth={1.5}
          opacity={0.95}
        />
        
        {/* Texto do label */}
        <SvgText
          x={x + width / 2}
          y={y + height + 20}
          fontSize="10"
          fill={isSelected ? '#FFFFFF' : colors[0]}
          textAnchor="middle"
          fontWeight={isSelected ? "bold" : "600"}
        >
          {label}
        </SvgText>
      </G>
    </G>
  );
};

const renderCustomBarChart = ({
  labels,
  data,
  width,
  height,
  style,
  periodKey,
  onCategorySelect = () => {},
  selectedCategory = null,
}) => {
  const barCount = data.length;
  const maxValue = Math.max(...data, 1);
  // Fixed bar width - consistent regardless of number of categories
  const maxBarWidth = 45; // Maximum width for bars
  const minBarWidth = 30; // Minimum width for bars
  const calculatedWidth = (width - 80) / (barCount * 1.5);
  const barWidth = Math.min(Math.max(calculatedWidth, minBarWidth), maxBarWidth);
  const chartHeight = height - 50;
  
  const barColors = [
    ['#FF9800', '#FFB74D'], // Laranja
    ['#F44336', '#EF5350'], // Vermelho 
    ['#FFC107', '#FFD54F'], // Amarelo
    ['#FF5722', '#FF8A65'], // Vermelho-laranja profundo
    ['#FF6F00', '#FFA726'], // Âmbar escuro
    ['#D84315', '#FF7043'], // Vermelho tijolo
  ];

  // Função para lidar com clique na barra
  const handleBarPress = (label, index) => {
    const categoryData = {
      name: label,
      index: index,
      value: data[index]
    };
    onCategorySelect(categoryData);
  };

  return (
    <View style={[styles.customBarChartWrapper, style]}>
      <View style={{ position: 'relative', height: height + 20 }}>
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          {data.map((value, i) => {
            const barHeight = (value / maxValue) * (chartHeight - 40);
            // Calculate spacing to center bars when there are fewer categories
            const totalBarsWidth = barCount * barWidth + (barCount - 1) * (barWidth * 0.5);
            const startX = (width - totalBarsWidth) / 2;
            const x = startX + i * (barWidth * 1.5);
            const y = chartHeight - barHeight;
            const isSelected = selectedCategory && selectedCategory.index === i;
            
            return (
              <AnimatedBar3D
                key={`text-${i}-${periodKey}`}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                colors={barColors[i % barColors.length]}
                value={Math.round(value)}
                label={labels[i]}
                index={i}
                isTextOnly={true}
                periodKey={periodKey}
                onBarPress={handleBarPress}
                isSelected={isSelected}
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
                stroke="#FFE0B2"
                strokeWidth="1"
                strokeDasharray="5,5"
              />
            );
          })}

          {data.map((value, i) => {
            const barHeight = (value / maxValue) * (chartHeight - 40);
            // Calculate spacing to center bars when there are fewer categories
            const totalBarsWidth = barCount * barWidth + (barCount - 1) * (barWidth * 0.5);
            const startX = (width - totalBarsWidth) / 2;
            const x = startX + i * (barWidth * 1.5);
            const y = chartHeight - barHeight;
            const isSelected = selectedCategory && selectedCategory.index === i;
            
            return (
              <G key={`bar-${i}-${periodKey}`}>
                {renderCustomBar3D({
                  x,
                  y,
                  width: barWidth,
                  height: barHeight,
                  colors: barColors[i % barColors.length],
                  value: Math.round(value),
                  label: labels[i],
                  index: i,
                  isTextOnly: false,
                  periodKey: periodKey,
                  onBarPress: handleBarPress,
                  isSelected: isSelected,
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

// Novo componente PieChart3D - abordagem completamente nova com melhorias visuais
const SimplePie3D = ({ 
  data = [], 
  width = 300, 
  height = 300, 
  pieDepth = 15,
  backgroundColor = 'transparent',
  onSelectSlice = () => {},
  showAllLabels = false,
  selectedCategoryId = null,
}) => {
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const initialRender = useRef(true);
  const animationProgress = useSharedValue(0);

  // Valores animados para rotação inicial e escala de entrada
  const entryAnimation = useSharedValue(0);
  const rotationValue = useSharedValue(0);
  
  // EDITAR AQUI: Posição vertical do centro da torta (menor = mais para cima, maior = mais para baixo)
  const center = { x: width / 2, y: height / 2 };
  // EDITAR AQUI: Tamanho da torta (menor número = torta maior, maior número = torta menor)
  const radius = Math.min(width, height) / 2.7;
  
  // Paleta de cores melhorada para maior harmonia e contraste
  const colors = [
    '#FF9800', // Laranja principal
    '#F44336', // Vermelho vibrante
    '#FFC107', // Amarelo dourado
    '#FF5722', // Vermelho-laranja
    '#FF6F00', // Âmbar escuro
    '#D84315', // Vermelho tijolo
  ];
  
  // Animação de entrada ao montar o componente
  useEffect(() => {
    if (initialRender.current) {
      // Efeito de rotação suave na entrada
      rotationValue.value = withSequence(
        withTiming(-0.1, { duration: 400, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) })
      );
      
      // Efeito de escala na entrada
      entryAnimation.value = withTiming(1, { 
        duration: 800, 
        easing: Easing.out(Easing.back(1.5)) 
      });
      
      // Animação de "pulsar" levemente ao final
      animationProgress.value = withSequence(
        withDelay(800,
          withTiming(1.02, { duration: 200, easing: Easing.out(Easing.quad) })
        ),
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) })
      );
      
      initialRender.current = false;
    }
  }, []);
  
  // Calcular os dados das fatias com memorizаção
  const slices = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    let startAngle = 0;
    
    return data
      .filter(item => item.name && item.value > 0) // Filtrar apenas categorias com valor > 0
      .map((item, index) => {
        const percentage = total > 0 ? (item.value / total) : 0;
        const angle = percentage * Math.PI * 2;
        const endAngle = startAngle + angle;
        const midAngle = startAngle + angle / 2;
        
        // Determinar se esta fatia é a selecionada
        const isSelected = index === selectedSlice;
        const isHovered = index === hoveredSlice;
        
        // Calcular a posição do rótulo com espaçamento específico
        // Posicionamento especial para investimentos e prêmios para evitar sobreposição
        let labelRadius = radius * 1.25; // Base - distância aumentada para melhor legibilidade
        let labelAdjustment = 0;
        
        // Ajuste especial para categorias específicas para evitar sobreposição
        if (item.name === "Investimentos" || item.name === "Prémios") {
          labelRadius = radius * 1.45; // Mais distante para evitar sobreposição
          
          // Se for Investimentos, ajustar para cima e direita
          if (item.name === "Investimentos") {
            labelAdjustment = Math.PI * -0.025; // Mover para cima e direita
          }
          // Se for Prêmios, ajustar para a esquerda
          if (item.name === "Prémios") {
            labelAdjustment = -Math.PI * 0.08; // Deslocar para a esquerda
          }
        }
        
        const labelX = center.x + Math.cos(midAngle + labelAdjustment) * labelRadius;
        const labelY = center.y + Math.sin(midAngle + labelAdjustment) * labelRadius;
        
        // Determinar alinhamento do texto baseado na posição
        const textAnchor = Math.cos(midAngle + labelAdjustment) > 0 ? 'start' : 'end';
        
        // Criar resultado para esta fatia
        const slice = {
          ...item,
          startAngle,
          endAngle,
          angle,
          midAngle,
          percentage,
          color: item.color || colors[index % colors.length],
          labelX,
          labelY,
          textAnchor,
          isSelected,
          isHovered,
          index
        };
        
        // Atualizar o ângulo inicial para a próxima fatia
        startAngle = endAngle;
        
        return slice;
      });
  }, [data, radius, selectedSlice, hoveredSlice, colors, center]);
  
  // Estilo animado para rotação
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotationValue.value * Math.PI}rad` },
        { scale: entryAnimation.value }
      ],
    };
  });
  
  // Função para criar o path para uma fatia
  const createArcPath = (startAngle, endAngle, innerRadius, outerRadius) => {
    // Handle full circle case (single slice covering 100%)
    if (Math.abs(endAngle - startAngle) >= Math.PI * 2 - 0.001) {
      // For full circle, create two semicircle arcs
      const midAngle = startAngle + Math.PI;
      const midX = center.x + Math.cos(midAngle) * outerRadius;
      const midY = center.y + Math.sin(midAngle) * outerRadius;
      const startX = center.x + Math.cos(startAngle) * outerRadius;
      const startY = center.y + Math.sin(startAngle) * outerRadius;
      const midX2 = center.x + Math.cos(midAngle) * innerRadius;
      const midY2 = center.y + Math.sin(midAngle) * innerRadius;
      const startX2 = center.x + Math.cos(startAngle) * innerRadius;
      const startY2 = center.y + Math.sin(startAngle) * innerRadius;
      
      return `
        M ${startX} ${startY}
        A ${outerRadius} ${outerRadius} 0 1 1 ${midX} ${midY}
        A ${outerRadius} ${outerRadius} 0 1 1 ${startX} ${startY}
        L ${startX2} ${startY2}
        A ${innerRadius} ${innerRadius} 0 1 0 ${midX2} ${midY2}
        A ${innerRadius} ${innerRadius} 0 1 0 ${startX2} ${startY2}
        Z
      `;
    }
    
    const startX = center.x + Math.cos(startAngle) * outerRadius;
    const startY = center.y + Math.sin(startAngle) * outerRadius;
    const endX = center.x + Math.cos(endAngle) * outerRadius;
    const endY = center.y + Math.sin(endAngle) * outerRadius;
    
    const startX2 = center.x + Math.cos(endAngle) * innerRadius;
    const startY2 = center.y + Math.sin(endAngle) * innerRadius;
    const endX2 = center.x + Math.cos(startAngle) * innerRadius;
    const endY2 = center.y + Math.sin(startAngle) * innerRadius;
    
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    
    return `
      M ${startX} ${startY}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}
      L ${startX2} ${startY2}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endX2} ${endY2}
      Z
    `;
  };
  
  // Função para criar o caminho da lateral (side) da fatia
  const createSidePath = (startAngle, endAngle, radius, depth) => {
    // Handle full circle case (single slice covering 100%)
    if (Math.abs(endAngle - startAngle) >= Math.PI * 2 - 0.001) {
      // For full circle, create a cylinder side
      const startX = center.x + Math.cos(startAngle) * radius;
      const startY = center.y + Math.sin(startAngle) * radius;
      const midAngle = startAngle + Math.PI;
      const midX = center.x + Math.cos(midAngle) * radius;
      const midY = center.y + Math.sin(midAngle) * radius;
      
      return `
        M ${startX} ${startY}
        L ${startX} ${startY + depth}
        A ${radius} ${radius} 0 1 1 ${midX} ${midY + depth}
        A ${radius} ${radius} 0 1 1 ${startX} ${startY + depth}
        L ${startX} ${startY}
        A ${radius} ${radius} 0 1 0 ${midX} ${midY}
        A ${radius} ${radius} 0 1 0 ${startX} ${startY}
      `;
    }
    
    const startX = center.x + Math.cos(startAngle) * radius;
    const startY = center.y + Math.sin(startAngle) * radius;
    const endX = center.x + Math.cos(endAngle) * radius;
    const endY = center.y + Math.sin(endAngle) * radius;
    
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    
    return `
      M ${startX} ${startY}
      L ${startX} ${startY + depth}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY + depth}
      L ${endX} ${endY}
      A ${radius} ${radius} 0 ${largeArcFlag} 0 ${startX} ${startY}
    `;
  };
  
  // Lidar com toque/clique em uma fatia com animação de seleção
  const handleSlicePress = (index) => {
    // Efeito de "pulse" animado na seleção (removido o sequenceWithTiming que causava o shake)
    animationProgress.value = withTiming(1, { 
      duration: 300, 
      easing: Easing.inOut(Easing.quad)
    });
    
    // Remover rotação que causava shake
    rotationValue.value = 0;
    
    setSelectedSlice(selectedSlice === index ? null : index);
    if (onSelectSlice) {
      // Passar o objeto completo da categoria para o callback
      const selectedCategory = index !== null && index < data.length ? data[index] : null;
      onSelectSlice(selectedCategory);
    }
  };
  
  // Lidar com hover (simulado com pressionar e soltar rapidamente em mobile)
  const handleSliceHover = (index) => {
    setHoveredSlice(index);
  };
  
  // Renderizar o gráfico de pizza 3D
  return (
    <View style={{ width, height, backgroundColor: backgroundColor }}>
      {/* EDITAR AQUI: Tamanho do SVG (height + pieDepth) */}
      <AnimatedView style={[{ width, height: height + pieDepth }, animatedStyle]}>
        <Svg width={width} height={height + pieDepth}>
          <Defs>
            {/* Gradiente radial para a sombra com transição suave */}
            <RadialGradient
              id="shadow-gradient"
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
              <Stop offset="70%" stopColor="#000000" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.05" />
            </RadialGradient>
            
            {/* Gradiente de sombra projetada para fatias elevadas */}
            <RadialGradient
              id="elevation-shadow"
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="#000000" stopOpacity="0.2" />
              <Stop offset="70%" stopColor="#000000" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
            </RadialGradient>
            
            {/* Gradientes para cada fatia */}
            {slices.map((slice, index) => (
              <React.Fragment key={`gradients-${index}`}>
                {/* Gradiente principal para o topo da fatia */}
                <LinearGradient
                  id={`gradient-top-${index}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor={slice.color} stopOpacity={slice.isSelected ? 1 : 0.9} />
                  <Stop offset="100%" stopColor={slice.color} stopOpacity={slice.isSelected ? 0.95 : 0.8} />
                </LinearGradient>
                
                {/* Gradiente para a parte lateral */}
                <LinearGradient
                  id={`gradient-side-${index}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <Stop offset="0%" stopColor={slice.color} stopOpacity={slice.isSelected ? 0.9 : 0.75} />
                  <Stop offset="100%" stopColor={slice.color} stopOpacity={slice.isSelected ? 0.7 : 0.5} />
                </LinearGradient>
                
                {/* Gradiente para a parte inferior */}
                <LinearGradient
                  id={`gradient-bottom-${index}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <Stop offset="0%" stopColor={slice.color} stopOpacity={slice.isSelected ? 0.6 : 0.45} />
                  <Stop offset="100%" stopColor={slice.color} stopOpacity={slice.isSelected ? 0.4 : 0.25} />
                </LinearGradient>
                
                {/* Novo gradiente para fatias selecionadas com efeito brilhante */}
                {slice.isSelected && (
                  <LinearGradient
                    id={`gradient-glow-${index}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
                    <Stop offset="100%" stopColor={slice.color} stopOpacity="0.8" />
                  </LinearGradient>
                )}
                
                {/* Fundo escuro para a fatia selecionada */}
                {slice.isSelected && (
                  <LinearGradient
                    id={`gradient-background-${index}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor="#333" stopOpacity="0.15" />
                    <Stop offset="100%" stopColor="#111" stopOpacity="0.3" />
                  </LinearGradient>
                )}
              </React.Fragment>
            ))}
          </Defs>
          
          {/* EDITAR AQUI: Posição e tamanho da sombra */}
          <Circle
            cx={center.x}
            cy={center.y + pieDepth + 5}
            r={radius + 5} 
            fill="url(#shadow-gradient)"
          />
          
          {/* Renderizar background para fatias selecionadas */}
          {slices.map((slice, index) => {
            if (!slice.isSelected) return null;
            
            // Restaurar o deslocamento radial original
            const offsetX = Math.cos(slice.midAngle) * 14;
            const offsetY = Math.sin(slice.midAngle) * 14;
            
            return (
              <Path
                key={`background-${index}`}
                d={createArcPath(slice.startAngle, slice.endAngle, 0, radius * 1.08)}
                fill={`url(#gradient-background-${index})`}
                x={offsetX}
                y={offsetY}
                opacity={0.8}
              />
            );
          })}
          
          {/* Renderizar as fatias com ordem otimizada para 3D */}
          {/* Primeiro renderizar todas as bases (fundo) */}
          {slices.map((actualSlice, index) => {
            const offsetX = actualSlice.isSelected ? Math.cos(actualSlice.midAngle) * 14 : 0;
            const offsetY = actualSlice.isSelected ? Math.sin(actualSlice.midAngle) * 14 : 0;
            const sliceDepth = actualSlice.isSelected ? pieDepth + 6 : pieDepth;
            const sliceOpacity = actualSlice.isSelected ? 1 : (selectedSlice !== null ? 0.85 : 0.95);
            
            return (
              <G 
                key={`slice-bottom-${index}`}
                transform={`translate(${offsetX}, ${offsetY})`}
                opacity={sliceOpacity}
              >
                {/* Face inferior da fatia */}
                <Path
                  d={createArcPath(actualSlice.startAngle, actualSlice.endAngle, 0, radius)}
                  fill={`url(#gradient-bottom-${index})`}
                  transform={`translate(0, ${sliceDepth})`}
                />
              </G>
            );
          })}
          
          {/* Depois renderizar as laterais */}
          {slices.map((actualSlice, index) => {
            const offsetX = actualSlice.isSelected ? Math.cos(actualSlice.midAngle) * 14 : 0;
            const offsetY = actualSlice.isSelected ? Math.sin(actualSlice.midAngle) * 14 : 0;
            const sliceDepth = actualSlice.isSelected ? pieDepth + 6 : pieDepth;
            const sliceOpacity = actualSlice.isSelected ? 1 : (selectedSlice !== null ? 0.85 : 0.95);
            
            // Só renderizar lateral se não for círculo completo
            if (Math.abs(actualSlice.endAngle - actualSlice.startAngle) >= Math.PI * 2 - 0.001) {
              return null;
            }
            
            return (
              <G 
                key={`slice-side-${index}`}
                transform={`translate(${offsetX}, ${offsetY})`}
                opacity={sliceOpacity}
              >
                {/* Lateral da fatia (profundidade) */}
                <Path
                  d={createSidePath(actualSlice.startAngle, actualSlice.endAngle, radius, sliceDepth)}
                  fill={`url(#gradient-side-${index})`}
                />
              </G>
            );
          })}
          
          {/* Por último renderizar as faces superiores */}
          {slices.map((actualSlice, index) => {
            const offsetX = actualSlice.isSelected ? Math.cos(actualSlice.midAngle) * 14 : 0;
            const offsetY = actualSlice.isSelected ? Math.sin(actualSlice.midAngle) * 14 : 0;
            const sliceScale = actualSlice.isSelected ? 1.05 : 1;
            const fillGradient = actualSlice.isSelected 
              ? `url(#gradient-glow-${index})` 
              : `url(#gradient-top-${index})`;
            const sliceOpacity = actualSlice.isSelected ? 1 : (selectedSlice !== null ? 0.85 : 0.95);
            
            const handleClick = () => {
              handleSlicePress(index);
              handleSliceHover(index);
            };
            
            return (
              <G 
                key={`slice-top-${index}`}
                transform={`translate(${offsetX}, ${offsetY}) scale(${sliceScale})`}
                opacity={sliceOpacity}
              >
                {/* Efeito de brilho/contorno para a fatia selecionada */}
                {actualSlice.isSelected && (
                  <Path
                    d={createArcPath(actualSlice.startAngle, actualSlice.endAngle, 0, radius * 1.02)}
                    fill="none"
                    stroke={actualSlice.color}
                    strokeWidth={2}
                    strokeOpacity={0.7}
                  />
                )}
                
                {/* Face superior da fatia (topo) */}
                <Path
                  d={createArcPath(actualSlice.startAngle, actualSlice.endAngle, 0, radius)}
                  fill={fillGradient}
                  {...(Platform.OS === 'web' ? { onClick: handleClick } : { onPress: handleClick })}
                />
              </G>
            );
          })}
          
          {/* Renderizar as linhas de conexão e rótulos */}
          {slices.map((slice, index) => {
            // Ajustar tamanho da fonte baseado na porcentagem 
            const isSmallSlice = slice.percentage < 0.05;
            
            // Restaurar o deslocamento radial para rótulos também
            const offsetX = slice.isSelected ? Math.cos(slice.midAngle) * 14 : 0;
            const offsetY = slice.isSelected ? Math.sin(slice.midAngle) * 14 : 0;
            
            const labelX = slice.labelX + offsetX;
            const labelY = slice.labelY + offsetY;
            const lineStartX = center.x + Math.cos(slice.midAngle) * (radius * 0.95) + offsetX;
            const lineStartY = center.y + Math.sin(slice.midAngle) * (radius * 0.95) + offsetY;
            
            // Cor do texto baseada na seleção 
            const textColor = slice.isSelected ? slice.color : '#333';
            const labelOpacity = slice.isSelected ? 1 : (selectedSlice !== null ? 0.8 : 1);
            
            return (
              <G key={`label-${index}`} opacity={labelOpacity}>
                {/* Linha conectora mais estilizada quando selecionada */}
                <Line
                  x1={lineStartX}
                  y1={lineStartY}
                  x2={labelX}
                  y2={labelY}
                  stroke={slice.isSelected ? slice.color : '#999'}
                  strokeWidth={slice.isSelected ? 1.5 : 0.8}
                  opacity={slice.isSelected ? 0.9 : 0.7}
                  strokeDasharray={slice.isSelected ? "" : "2,1"}
                />
                
                {/* Texto da porcentagem - sem fundo */}
                <SvgText
                  x={labelX}
                  y={labelY}
                  fill={textColor}
                  fontSize={isSmallSlice ? "8" : (slice.isSelected ? "12" : "10")}
                  fontWeight={slice.isSelected ? "bold" : "600"}
                  textAnchor={slice.textAnchor}
                  stroke="#FFFFFF"
                  strokeWidth="0.2"
                  paintOrder="stroke"
                >
                  {`${Math.round(slice.percentage * 100)}%`}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </AnimatedView>
      
      {/* Legenda compacta */}
      <View style={[styles.pieChartLegend, {marginTop: -5}]}>
        {slices.map((slice, index) => (
          <Pressable
            key={`legend-${index}`}
            style={({pressed}) => [
              styles.legendItem,
              slice.isSelected && styles.legendItemSelected,
              pressed && {opacity: 0.7}
            ]}
            onPress={() => handleSlicePress(index)}
            {...(Platform.OS === 'web' ? 
              { onClick: () => handleSlicePress(index) } : {})}
          >
            <View
              style={[
                styles.legendColorBox,
                { backgroundColor: slice.color },
                slice.isSelected && styles.legendColorBoxSelected
              ]}
            />
            <Text
              style={[
                styles.legendText,
                slice.isSelected && styles.legendTextSelected,
                {color: slice.isSelected ? slice.color : '#555'}
              ]}
              numberOfLines={1}
            >
              {slice.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

// Componente SimpleLineChart para substituir o UltraModernLineChart
const SimpleLineChart = ({ data, labels, width, height, style }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const animationProgress = useSharedValue(0);
  
  // Valores para cálculos do gráfico
  const chartHeight = height * 0.75;
  const paddingHorizontal = 30;
  const paddingTop = 20;
  const paddingBottom = 30;
  const xAxisWidth = width - (paddingHorizontal * 2);
  const yAxisHeight = chartHeight - paddingTop - paddingBottom;
  
  // AnimatedPath para animação das linhas
  const AnimatedPath = Animated.createAnimatedComponent(Path);
  
  useEffect(() => {
    // Iniciar animação após um pequeno atraso
    const timeout = setTimeout(() => {
      setIsLoaded(true);
      animationProgress.value = withTiming(1, { 
        duration: 1000, 
        easing: Easing.bezier(0.16, 1, 0.3, 1) 
      });
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [data, labels]);
  
  // Validar dados
  if (!data || data.length === 0 || !labels || labels.length === 0) {
    return (
      <View style={{
        width, height, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#FFF', borderRadius: 12
      }}>
        <Text style={{color: '#666', fontSize: 14, fontWeight: '500'}}>
          No data available
        </Text>
      </View>
    );
  }
  
  // Calcular valores máximos para escala
  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const valueRange = Math.max(maxValue - minValue, 1);
  
  // Normalizar dados para o gráfico
  const points = data.map((value, index) => {
    const x = paddingHorizontal + (index / (data.length - 1)) * xAxisWidth;
    const normalizedValue = (value - minValue) / valueRange;
    const y = paddingTop + (1 - normalizedValue) * yAxisHeight;
    return { x, y, value };
  });
  
  // Criar path para a linha
  const createPathD = (points, progress) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x},${points[0].y} L ${points[0].x},${points[0].y}`;
    
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
      
      // Limitar pelo progresso da animação
      const visiblePointCount = Math.floor(progress * points.length);
      if (i >= visiblePointCount) break;
      
      // Se for o último ponto visível na animação, interpolar
      if (i === visiblePointCount - 1 && visiblePointCount < points.length) {
        const partialProgress = (progress * points.length) % 1;
        const interpolatedX = currentPoint.x + (nextPoint.x - currentPoint.x) * partialProgress;
        const interpolatedY = currentPoint.y + (nextPoint.y - currentPoint.y) * partialProgress;
        path += ` L ${interpolatedX},${interpolatedY}`;
      } else {
        // Curva suave entre pontos
        const controlPointX1 = (currentPoint.x + nextPoint.x) / 2;
        const controlPointX2 = (currentPoint.x + nextPoint.x) / 2;
        path += ` C ${controlPointX1},${currentPoint.y} ${controlPointX2},${nextPoint.y} ${nextPoint.x},${nextPoint.y}`;
      }
    }
    
    return path;
  };
  
  // Criar path para a área abaixo da linha
  const createAreaD = (points, progress) => {
    if (points.length === 0) return '';
    
    const baselineY = paddingTop + yAxisHeight;
    let path = `M ${points[0].x},${baselineY} L ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
      
      // Limitar pelo progresso da animação
      const visiblePointCount = Math.floor(progress * points.length);
      if (i >= visiblePointCount) break;
      
      // Se for o último ponto visível na animação, interpolar
      if (i === visiblePointCount - 1 && visiblePointCount < points.length) {
        const partialProgress = (progress * points.length) % 1;
        const interpolatedX = currentPoint.x + (nextPoint.x - currentPoint.x) * partialProgress;
        const interpolatedY = currentPoint.y + (nextPoint.y - currentPoint.y) * partialProgress;
        path += ` L ${interpolatedX},${interpolatedY}`;
        path += ` L ${interpolatedX},${baselineY} Z`;
      } else if (i === points.length - 2) {
        // Último segmento completo
        const controlPointX1 = (currentPoint.x + nextPoint.x) / 2;
        const controlPointX2 = (currentPoint.x + nextPoint.x) / 2;
        path += ` C ${controlPointX1},${currentPoint.y} ${controlPointX2},${nextPoint.y} ${nextPoint.x},${nextPoint.y}`;
        path += ` L ${nextPoint.x},${baselineY} Z`;
      } else {
        // Segmentos intermediários
        const controlPointX1 = (currentPoint.x + nextPoint.x) / 2;
        const controlPointX2 = (currentPoint.x + nextPoint.x) / 2;
        path += ` C ${controlPointX1},${currentPoint.y} ${controlPointX2},${nextPoint.y} ${nextPoint.x},${nextPoint.y}`;
      }
    }
    
    return path;
  };
  
  // Props animados para o path da linha
  const animatedLineProps = useAnimatedProps(() => ({
    d: createPathD(points, animationProgress.value),
    opacity: interpolate(
      animationProgress.value,
      [0, 0.1, 1],
      [0, 1, 1]
    ),
  }));
  
  // Props animados para a área preenchida
  const animatedAreaProps = useAnimatedProps(() => ({
    d: createAreaD(points, animationProgress.value),
    opacity: interpolate(
      animationProgress.value,
      [0, 0.3, 1],
      [0, 0.7, 0.7]
    ),
  }));
  
  // Estilo animado para o contêiner
  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animationProgress.value,
      [0, 0.3],
      [0.7, 1]
    ),
    transform: [
      { 
        scale: interpolate(
          animationProgress.value,
          [0, 1],
          [0.97, 1]
        )
      }
    ],
  }));
  
  // Renderizar linhas de grade
  const renderGridLines = () => {
    const gridLineCount = 5;
    return Array.from({ length: gridLineCount }).map((_, index) => {
      const y = paddingTop + (index / (gridLineCount - 1)) * yAxisHeight;
      const value = maxValue - (index / (gridLineCount - 1)) * valueRange;
      
      return (
        <G key={`grid-${index}`}>
          <Line
            x1={paddingHorizontal - 10}
            y1={y}
            x2={width - paddingHorizontal}
            y2={y}
            stroke="#EDEDED"
            strokeWidth={1}
            strokeDasharray="5,5"
          />
          <SvgText
            x={paddingHorizontal - 15}
            y={y + 4}
            fontSize="10"
            fontWeight="500"
            fill="#999"
            textAnchor="end"
          >
            {Math.round(value)}
          </SvgText>
        </G>
      );
    });
  };
  
  // Renderizar pontos de dados
  const renderDataPoints = () => {
    if (!isLoaded) return null;
    
    return points.map((point, index) => (
      <G key={`point-${index}`}>
        {/* Ponto exterior */}
        <Circle
          cx={point.x}
          cy={point.y}
          r={5}
          fill="#FFFFFF"
          stroke="#FF9800"
          strokeWidth={1.5}
          opacity={0.9}
        />
        
        {/* Ponto interior */}
        <Circle
          cx={point.x}
          cy={point.y}
          r={2}
          fill="#FF9800"
        />
        
        {/* Tooltip simples */}
        <G opacity={0.8}>
          <SvgText
            x={point.x}
            y={point.y - 12}
            fontSize={10}
            fill="#666"
            textAnchor="middle"
          >
            {Math.round(point.value)}
          </SvgText>
        </G>
      </G>
    ));
  };
  
  // Renderizar labels do eixo X
  const renderXLabels = () => {
    return points.map((point, index) => {
      // Mostrar apenas algumas labels para evitar sobreposição
      if (data.length > 6 && index % Math.ceil(data.length / 6) !== 0 && index !== data.length - 1) {
        return null;
      }
      
      const label = labels[index] || '';
      
      return (
        <SvgText
          key={`label-${index}`}
          x={point.x}
          y={paddingTop + yAxisHeight + 20}
          fontSize="10"
          fontWeight="500"
          fill="#666"
          textAnchor="middle"
        >
          {label}
        </SvgText>
      );
    });
  };
  
  return (
    <Animated.View style={[{ borderRadius: 12, overflow: 'hidden' }, containerStyle, style]}>
      <View style={{ padding: 10 }}>
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 14, color: '#666', fontWeight: '600' }}>
            Trend Analysis
          </Text>
        </View>
        
        {!isLoaded ? (
          <View style={{ height: chartHeight, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#666', fontSize: 14 }}>Loading chart...</Text>
          </View>
        ) : (
          <Svg width={width} height={chartHeight}>
            {/* Definições de gradientes */}
            <Defs>
              <LinearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FF9800" stopOpacity="1" />
                <Stop offset="100%" stopColor="#FFAC42" stopOpacity="1" />
              </LinearGradient>
              
              <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FF9800" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            
            {/* Linhas de grade */}
            {renderGridLines()}
            
            {/* Área preenchida sob a linha */}
            <AnimatedPath
              animatedProps={animatedAreaProps}
              fill="url(#areaGradient)"
              strokeWidth="0"
            />
            
            {/* Linha principal */}
            <AnimatedPath
              animatedProps={animatedLineProps}
              stroke="url(#lineGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            
            {/* Pontos de dados */}
            {renderDataPoints()}
            
            {/* Labels do eixo X */}
            {renderXLabels()}
          </Svg>
        )}
      </View>
    </Animated.View>
  );
};

// Definir UltraModernLineChart como alias de SimpleLineChart
const UltraModernLineChart = SimpleLineChart;

// Componente principal Chart com opções para gráficos de barras, linha e pizza
const Chart = ({ 
  incomes, 
  categories, 
  frequencies, 
  processData, 
  chartTypes = ['Bar', 'Pie', 'Line'],
  chartHeight = 170,
  onCategorySelect = () => {}, // Novo callback para seleção de categoria
}) => {
  const [chartType, setChartType] = useState(chartTypes[0].toLowerCase());
  const [renderKey, setRenderKey] = useState(0);
  const [isChartReady, setIsChartReady] = useState(false);
  const [period, setPeriod] = useState('month');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // Adicionar estado para a categoria selecionada
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  
  // Improved dynamic chart height calculation based on screen ratio
  const calculateDynamicHeight = () => {
    const baseHeight = 170;
    const minHeight = 120;
    const maxHeight = 250;
    
    // Calculate ratio based on screen dimensions
    if (screenHeight < 600) {
      return minHeight;
    } else if (screenHeight < 700) {
      return Math.round(screenHeight * 0.20); // 20% of screen height for small screens
    } else if (screenHeight < 800) {
      return Math.round(screenHeight * 0.22); // 22% for medium screens
    } else {
      return Math.min(Math.round(screenHeight * 0.25), maxHeight); // 25% for large screens, capped at maxHeight
    }
  };
  
  const dynamicChartHeight = calculateDynamicHeight();

  // Skeleton Loading Component
  const SkeletonLoader = () => {
    const shimmerAnim = new RNAnimated.Value(0);

    useEffect(() => {
      const shimmer = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          RNAnimated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      shimmer.start();
      return () => shimmer.stop();
    }, []);

    const opacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonContainer}>
        <View style={styles.skeletonChart}>
          <RNAnimated.View style={[styles.skeletonShimmer, { opacity }]} />
        </View>
        <Text style={styles.loadingText}>Loading chart...</Text>
      </View>
    );
  };

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
  
  // Componente para botões modernos com animação
  const ModernButton = ({ label, value, icon, isActive, onPress, compact = false, colorScheme = 'orange' }) => {
    const animatedScale = useSharedValue(1);
    const animatedOpacity = useSharedValue(1);
    
    // Cores baseadas no esquema selecionado
    const colors = {
      orange: {
        inactive: { bg: '#FFF8E1', border: '#FFE082', text: '#F57C00' },
        active: { bg: '#FF9800', border: '#F57C00', text: '#FFFFFF' }
      },
      red: {
        inactive: { bg: '#FFEBEE', border: '#FFCDD2', text: '#D32F2F' },
        active: { bg: '#F44336', border: '#D32F2F', text: '#FFFFFF' }
      },
      yellow: {
        inactive: { bg: '#FFFDE7', border: '#FFECB3', text: '#F9A825' },
        active: { bg: '#FFC107', border: '#F9A825', text: '#000000' }
      }
    };
    
    const currentColors = colors[colorScheme] || colors.orange;
    const activeColors = isActive ? currentColors.active : currentColors.inactive;
    
    const handlePress = () => {
      // Animação de feedback tátil
      animatedScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 150 })
      );
      
      onPress(value);
    };
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: animatedScale.value }],
      opacity: animatedOpacity.value,
    }));
    
    const buttonStyle = compact ? styles.periodButtonCompact : styles.button;
    const activeButtonStyle = compact ? styles.activePeriodButtonCompact : styles.activeButton;
    const textStyle = compact ? styles.periodButtonTextCompact : styles.buttonText;
    const activeTextStyle = compact ? styles.activePeriodButtonTextCompact : styles.activeButtonText;
    
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={[
            buttonStyle,
            {
              backgroundColor: activeColors.bg,
              borderColor: activeColors.border,
              shadowColor: activeColors.border,
            },
            isActive && activeButtonStyle,
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={icon} 
            size={compact ? 14 : 16} 
            color={activeColors.text} 
            style={{marginRight: compact ? 4 : 6}}
          />
          <Text style={[
            textStyle,
            { color: activeColors.text },
            isActive && activeTextStyle
          ]}>
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Componente para botões de tipo de gráfico
  const ChartTypeButtons = ({ chartType, setChartType, chartTypes }) => {
    const getIcon = (type) => {
      const typeLower = type.toLowerCase();
      if (typeLower === 'pie') return 'pie-chart-outline';
      if (typeLower === 'line') return 'trending-up-outline';
      if (typeLower === 'categories') return 'list-outline';
      return 'bar-chart-outline';
    };
    
    return (
      <View style={styles.buttonContainer}>
        {chartTypes.map((type) => (
          <ModernButton 
            key={type}
            label={type} 
            value={type.toLowerCase()} 
            icon={getIcon(type)}
            isActive={chartType === type.toLowerCase()}
            onPress={setChartType}
            compact={false}
            colorScheme="yellow"
          />
        ))}
      </View>
    );
  };

  // Componente para mostrar os botões de período
  const TimePeriodButtons = ({ period, setPeriod }) => {
    return (
      <View style={styles.periodContainerInChart}>
        <ModernButton 
          label="Day" 
          value="day" 
          icon="today-outline" 
          isActive={period === 'day'}
          onPress={setPeriod}
          compact={true} 
          colorScheme="orange"
        />
        <ModernButton 
          label="Week" 
          value="week" 
          icon="calendar-outline" 
          isActive={period === 'week'}
          onPress={setPeriod}
          compact={true} 
          colorScheme="orange"
        />
        <ModernButton 
          label="Month" 
          value="month" 
          icon="calendar" 
          isActive={period === 'month'}
          onPress={setPeriod}
          compact={true} 
          colorScheme="orange"
        />
      </View>
    );
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

  // Nova função simplificada para calcular os dados do gráfico de pizza
  const calculatePieData = () => {
    if (!incomes || !categories || !frequencies) return [];

    // Cores predefinidas para o gráfico
    const pieColors = [
      '#FF9800',  // Laranja principal
      '#F44336',  // Vermelho vibrante
      '#FFC107',  // Amarelo dourado
      '#FF5722',  // Vermelho-laranja
      '#FF6F00',  // Âmbar escuro
      '#D84315',  // Vermelho tijolo
    ];
    
    // Agrupar por categoria
    const catTotals = {};
    
    // Inicializar categorias
    categories.forEach(cat => {
      catTotals[cat.id] = { 
        id: cat.id,
        name: cat.name, 
        value: 0, 
        color: pieColors[cat.id % pieColors.length]
      };
    });
    
    // Somar valores por categoria
    incomes.forEach(income => {
      if (catTotals[income.category_id]) {
        const frequency = frequencies.find(f => f.id === income.frequency_id);
          const days = frequency?.days || 30;
        // Converter para valor mensal
          const monthlyAmount = income.amount * (30 / days);
        catTotals[income.category_id].value += monthlyAmount;
      }
    });
    
    // Filtrar para excluir categorias com valores muito pequenos
    let result = Object.values(catTotals)
      .filter(cat => cat.name) // Manter apenas se tem um nome
      .sort((a, b) => b.value - a.value);

    // Calcular total
    const total = result.reduce((sum, cat) => sum + cat.value, 0);
    
    // Categorias com menos de 0.5% serão agrupadas como "Outros" se não forem selecionadas
    return result;
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
        // Se tivermos acesso à função externa calculatePieData definida em IncomePage.js
        if (typeof calculatePieData === 'function') {
          return calculatePieData();
        } else {
          // Usar versão interna modificada que só mostra categorias com valor > 0
          const filteredPieData = calculatePieDataInternal();
          return filteredPieData;
        }
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
      default:
        if (chartType === 'bar') {
          const { labels, data } = calculateTopCategoriesByPeriod();
          return { labels, data };
        }
        if (chartType === 'pie') {
          // Se tivermos acesso à função externa calculatePieData definida em IncomePage.js
          if (typeof calculatePieData === 'function') {
            return calculatePieData();
          } else {
            // Usar versão interna modificada que só mostra categorias com valor > 0
            const filteredPieData = calculatePieDataInternal();
            return filteredPieData;
          }
        }
        if (chartType === 'line') {
          const { labels, data } = calculateLineChartData();
          return { labels, data };
        }
        return { labels: [], data: [] };
    }
  };

  // Função interna para calcular dados do gráfico de pizza, garantindo que só mostre categorias com valores > 0
  const calculatePieDataInternal = () => {
    if (!incomes || !categories || !frequencies) return [];

    // Cores predefinidas para o gráfico - alinhadas com o tema do projeto
    const pieColors = [
      '#FF9800', // Laranja principal
      '#F44336', // Vermelho vibrante
      '#FFC107', // Amarelo dourado
      '#FF5722', // Vermelho-laranja
      '#FF6F00', // Âmbar escuro
      '#D84315', // Vermelho tijolo
    ];
    
    // Agrupar por categoria
    const catTotals = {};
    
    // Inicializar categorias
    categories.forEach(cat => {
      catTotals[cat.id] = { 
        id: cat.id,
        name: cat.name, 
        value: 0, 
        color: pieColors[cat.id % pieColors.length]
      };
    });
    
    // Somar valores por categoria
    incomes.forEach(income => {
      if (catTotals[income.category_id]) {
        const frequency = frequencies.find(f => f.id === income.frequency_id);
        const days = frequency?.days || 30;
        // Converter para valor mensal
        const monthlyAmount = income.amount * (30 / days);
        catTotals[income.category_id].value += monthlyAmount;
      }
    });
    
    // Filtrar para excluir categorias sem valores
    return Object.values(catTotals)
      .filter(cat => cat.name && cat.value > 0)
      .sort((a, b) => b.value - a.value);
  };

  // Adicionar novo método para lidar com a seleção do gráfico de pizza
  const handlePieChartSelection = (selectedCategory) => {
    if (selectedCategory) {
      // Encontrar a categoria correspondente no array de categorias
      const category = categories.find(c => c.name === selectedCategory.name);
      if (category) {
        setSelectedCategoryId(category.id);
      }
    } else {
      // Se não houver categoria selecionada, limpar a seleção
      setSelectedCategoryId(null);
    }
    
    // Chamar o callback passado pelo componente pai
    if (onCategorySelect && selectedCategory) {
      onCategorySelect(selectedCategory);
    }
  };

  // Renderiza o gráfico com base no tipo selecionado
  const renderChart = () => {
    if (!isChartReady) {
      return (
        <View style={[styles.chartBackground, styles.loadingContainer]}>
          <SkeletonLoader />
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
          {/* Botões de período integrados no gráfico de barras */}
          <TimePeriodButtons period={period} setPeriod={setPeriod} />
          
          {renderCustomBarChart({
            labels: chartData.labels,
            data: chartData.data,
            width: screenWidth - 48,
            height: dynamicChartHeight,
            style: { backgroundColor: 'transparent' },
            periodKey: period,
            onCategorySelect: handlePieChartSelection,
            selectedCategory: {
              name: selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.name : '',
              index: selectedCategoryId
            },
          })}
        </View>
      );
    }

    if (chartType === 'pie') {
      return (
        <View style={[styles.chartBackground, { 
          backgroundColor: '#FFF', 
          padding: 10,
          alignItems: 'center',
          height: dynamicChartHeight * 1.8, // Reduced from 2 to 1.8
          marginBottom: 10,
          borderRadius: 20,
          boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
          elevation: 3,
        }]}>
          <SimplePie3D
            data={chartData}
            width={screenWidth - 16}
            height={dynamicChartHeight * 1.4} // Reduced from 1.6 to 1.4
            pieDepth={15}
            backgroundColor="transparent"
            showAllLabels={true}
            onSelectSlice={handlePieChartSelection}
            selectedCategoryId={selectedCategoryId}
          />
        </View>
      );
    }

    if (chartType === 'line') {
      return (
        <View style={[styles.chartBackground, { 
          backgroundColor: '#FFF',
          padding: 10,
          paddingBottom: 20,
          borderRadius: 20,
          boxShadow: '0px 6px 10px rgba(255, 183, 77, 0.15)',
          elevation: 5,
        }]}>
          {/* Botões de período integrados no gráfico de linha */}
          <TimePeriodButtons period={period} setPeriod={setPeriod} />
          
          <SimpleLineChart 
            data={chartData.data}
            labels={chartData.labels}
            width={screenWidth - 48}
            height={dynamicChartHeight * 1.2}
            style={{ 
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: 'transparent'
            }}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <ChartTypeButtons 
        chartType={chartType} 
        setChartType={setChartType} 
        chartTypes={chartTypes}
      />

      {renderChart()}
    </View>
  );
};

// Ajuste nos estilos
const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  periodContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 10,
  },
  periodContainerInChart: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 8,
    paddingTop: 5,
    paddingBottom: 5,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#FFE0B2',
  },
  activePeriodButton: {
    backgroundColor: '#FF9800',
    shadowColor: '#F57C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    borderColor: '#F57C00',
    transform: [{scale: 1.05}],
  },
  periodButtonText: {
    color: '#F57C00',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
    paddingHorizontal: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFF8E1',
    borderRadius: 25,
    minWidth: 90,
    alignItems: 'center',
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#FFE082',
  },
  activeButton: {
    backgroundColor: '#FF9800',
    shadowColor: '#E65100',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderColor: '#E65100',
    transform: [{scale: 1.08}],
  },
  buttonText: {
    color: '#F57C00',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  chartBackground: {
    borderRadius: 20,
    padding: 12,
    backgroundColor: '#FFCC02',
    shadowColor: '#FF8F00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFB300',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  loadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#FF8F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  loadingText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  noDataContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF8F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    height: 120,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  noDataText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '600',
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
    minHeight: 170,
    paddingTop: 15,
    paddingBottom: 10,
  },
  pieChartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 0,
    maxWidth: '100%',
    paddingTop: 0,
    paddingBottom: 0,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 3,
    marginVertical: 2,
    borderRadius: 12,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  legendItemSelected: {
    backgroundColor: '#FF9800',
    borderColor: '#F57C00',
    elevation: 3,
    shadowOpacity: 0.2,
    transform: [{scale: 1.05}],
  },
  legendColorBox: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  legendColorBoxSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  legendText: {
    color: '#E65100',
    fontSize: 11,
    fontWeight: '600',
  },
  legendTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Estilos para UltraModernLineChart
  ultraModernChartContainer: {
    overflow: 'hidden',
    padding: 15,
    paddingTop: 10,
  },
  chartTitle: {
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  chartTitleText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  chartControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  chartControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 15,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  chartControlButtonActive: {
    backgroundColor: '#FF9800',
    shadowColor: '#F57C00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderColor: '#F57C00',
  },
  chartControlButtonText: {
    color: '#F57C00',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginLeft: 4,
  },
  chartControlButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
  },
  periodButtonCompact: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 15,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  activePeriodButtonCompact: {
    backgroundColor: '#FF9800',
    shadowColor: '#F57C00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderColor: '#F57C00',
    transform: [{scale: 1.02}],
  },
  periodButtonTextCompact: {
    color: '#F57C00',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  activePeriodButtonTextCompact: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  // Skeleton loading styles
  skeletonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  skeletonChart: {
    height: 80,
    width: '90%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});

export { GaugeChart, SimplePie3D };
export default Chart;