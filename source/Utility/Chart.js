import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, Animated as RNAnimated, Pressable } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
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

// Componente AnimatedView para animações do contenedor do gráfico
const AnimatedView = Animated.createAnimatedComponent(View);

// Componente simplificado sem interatividade de clique
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
        duration: 800, // Animação mais rápida
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
      <View style={{ position: 'relative', height: height + 20 }}>
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
                  isTextOnly: false,
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
  const radius = Math.min(width, height) / 2.65;
  
  // Paleta de cores melhorada para maior harmonia e contraste
  const colors = [
    '#FF9500', // Laranja
    '#9C27B0', // Roxo
    '#2196F3', // Azul
    '#4CAF50', // Verde
    '#F44336', // Vermelho
    '#FFEB3B', // Amarelo
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
      .filter(item => item.name) // Manter apenas se tem um nome
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
        let labelRadius = radius * 1.15; // Base (reduzido de 1.2)
        let labelAdjustment = 0;
        
        // Ajuste especial para categorias específicas para evitar sobreposição
        if (item.name === "Investimentos" || item.name === "Prémios") {
          labelRadius = radius * 1.3; // Mais distante (reduzido de 1.5)
          
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
    const startX = center.x + Math.cos(startAngle) * radius;
    const startY = center.y + Math.sin(startAngle) * radius;
    const endX = center.x + Math.cos(endAngle) * radius;
    const endY = center.y + Math.sin(endAngle) * radius;
    
    return `
      M ${startX} ${startY}
      L ${startX} ${startY + depth}
      A ${radius} ${radius} 0 0 1 ${endX} ${endY + depth}
      L ${endX} ${endY}
      A ${radius} ${radius} 0 0 0 ${startX} ${startY}
    `;
  };
  
  // Lidar com toque/clique em uma fatia com animação de seleção
  const handleSlicePress = (index) => {
    // Efeito de "pulse" animado na seleção
    animationProgress.value = withSequence(
      withTiming(1.05, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) })
    );
    
    // Efeito sutil de "giro" ao selecionar
    rotationValue.value = withSequence(
      withTiming(index * 0.01, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 400, easing: Easing.inOut(Easing.quad) })
    );
    
    setSelectedSlice(selectedSlice === index ? null : index);
    if (onSelectSlice) {
      // Passar o objeto completo da categoria para o callback
      const selectedCategory = index !== null ? data[index] : null;
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
            
            {/* Gradientes para cada fatia */}
            {slices.map((slice, index) => (
              <React.Fragment key={`gradients-${index}`}>
                {/* Gradiente principal para o topo da fatia */}
                <SvgGradient
                  id={`gradient-top-${index}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor={slice.color} stopOpacity="1" />
                  <Stop offset="100%" stopColor={slice.color} stopOpacity="0.9" />
                </SvgGradient>
                
                {/* Gradiente para a parte lateral */}
                <SvgGradient
                  id={`gradient-side-${index}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <Stop offset="0%" stopColor={slice.color} stopOpacity="0.85" />
                  <Stop offset="100%" stopColor={slice.color} stopOpacity="0.6" />
                </SvgGradient>
                
                {/* Gradiente para a parte inferior */}
                <SvgGradient
                  id={`gradient-bottom-${index}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <Stop offset="0%" stopColor={slice.color} stopOpacity="0.5" />
                  <Stop offset="100%" stopColor={slice.color} stopOpacity="0.3" />
                </SvgGradient>
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
          
          {/* Renderizar as fatias em ordem inversa para sobrepor corretamente */}
          {[...slices].reverse().map((slice, i) => {
            const index = slices.length - 1 - i;
            const actualSlice = slices[index];
            
            // Deslocamento quando selecionado (ajusta o "salto" da fatia)
            const offsetX = actualSlice.isSelected ? Math.cos(actualSlice.midAngle) * 12 : 0;
            const offsetY = actualSlice.isSelected ? Math.sin(actualSlice.midAngle) * 12 : 0;
            // Profundidade extra quando selecionado
            const sliceDepth = actualSlice.isSelected ? pieDepth + 5 : pieDepth;
            
            // Usar gradientes diferentes dependendo do estado
            const fillGradient = `url(#gradient-top-${index})`;
            
            // Função para lidar com o clique para web e mobile
            const handleClick = () => {
              handleSlicePress(index);
              handleSliceHover(index);
            };
            
            return (
              <G 
                key={`slice-3d-${index}`}
                x={offsetX}
                y={offsetY}
              >
                {/* Face inferior da fatia */}
                <Path
                  d={createArcPath(actualSlice.startAngle, actualSlice.endAngle, 0, radius)}
                  fill={`url(#gradient-bottom-${index})`}
                  y={sliceDepth}
                  opacity={0.8}
                />
                
                {/* Lateral da fatia (profundidade) */}
                <Path
                  d={createSidePath(actualSlice.startAngle, actualSlice.endAngle, radius, sliceDepth)}
                  fill={`url(#gradient-side-${index})`}
                />
                
                {/* Face superior da fatia (topo) */}
                <Path
                  d={createArcPath(actualSlice.startAngle, actualSlice.endAngle, 0, radius)}
                  fill={fillGradient}
                  onClick={handleClick}
                  scale={actualSlice.isSelected ? 1.04 : actualSlice.isHovered ? 1.02 : 1}
                />
              </G>
            );
          })}
          
          {/* Renderizar as linhas de conexão e rótulos */}
          {slices.map((slice, index) => {
            // Ajustar tamanho da fonte baseado na porcentagem 
            const isSmallSlice = slice.percentage < 0.05;
            
            // Calcular deslocamento menor para seleção
            const offsetX = slice.isSelected ? Math.cos(slice.midAngle) * 12 : 0;
            const offsetY = slice.isSelected ? Math.sin(slice.midAngle) * 12 : 0;
            
            const labelX = slice.labelX + offsetX;
            const labelY = slice.labelY + offsetY;
            const lineStartX = center.x + Math.cos(slice.midAngle) * (radius * 0.95) + offsetX;
            const lineStartY = center.y + Math.sin(slice.midAngle) * (radius * 0.95) + offsetY;
            
            // Cor do texto baseada na seleção 
            const textColor = slice.isSelected ? slice.color : '#333';
            
            return (
              <G key={`label-${index}`}>
                {/* Linha conectora simplificada */}
                <Line
                  x1={lineStartX}
                  y1={lineStartY}
                  x2={labelX}
                  y2={labelY}
                  stroke={slice.isSelected ? slice.color : '#999'}
                  strokeWidth={slice.isSelected ? 1 : 0.7}
                  opacity={slice.isSelected ? 0.9 : 0.7}
                />
                
                {/* Fundo do rótulo para todos */}
                <Rect
                  x={slice.textAnchor === 'start' ? labelX - 3 : labelX - 28}
                  y={labelY - (isSmallSlice ? 10 : 12)}
                  width={isSmallSlice ? 25 : 30}
                  height={isSmallSlice ? 19 : 22}
                  fill="#FFFFFF"
                  opacity={0.9}
                  rx={4}
                  ry={4}
                  stroke={slice.isSelected ? slice.color : "transparent"}
                  strokeWidth={0.5}
                />
                
                {/* Texto da porcentagem */}
                <SvgText
                  x={labelX}
                  y={labelY - (isSmallSlice ? 2 : 4)}
                  fill={textColor}
                  fontSize={isSmallSlice ? "8" : "10"}
                  fontWeight="bold"
                  textAnchor={slice.textAnchor}
                >
                  {`${Math.round(slice.percentage * 100)}%`}
                </SvgText>
                
                {/* Nome da categoria */}
                <SvgText
                  x={labelX}
                  y={labelY + (isSmallSlice ? 7 : 8)}
                  fill={slice.isSelected ? slice.color : "#666"}
                  fontSize={isSmallSlice ? "6" : "8"}
                  fontWeight={slice.isSelected ? "bold" : "normal"}
                  textAnchor={slice.textAnchor}
                >
                  {slice.name}
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
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  
  const dynamicChartHeight = screenHeight < 700 ? 150 : chartHeight;

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

  // Nova função simplificada para calcular os dados do gráfico de pizza
  const calculatePieData = () => {
    if (!incomes || !categories || !frequencies) return [];

    // Cores predefinidas para o gráfico
    const pieColors = [
      '#FF9500',  // Laranja
      '#9C27B0',  // Roxo
      '#2196F3',  // Azul
      '#4CAF50',  // Verde
      '#F44336',  // Vermelho
      '#FFEB3B',  // Amarelo
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
        return calculatePieData();
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
          return calculatePieData();
        }
        if (chartType === 'line') {
          const { labels, data } = calculateLineChartData();
          return { labels, data };
        }
        return { labels: [], data: [] };
    }
  };

  // Adicionar novo método para lidar com a seleção do gráfico de pizza
  const handlePieChartSelection = (selectedCategory) => {
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
            height: dynamicChartHeight,
            style: { backgroundColor: 'transparent' }
          })}
        </View>
      );
    }

    if (chartType === 'pie') {
      return (
        <View style={[styles.chartBackground, { 
          backgroundColor: '#FFF', 
          padding: 10, // Aumentado (era 5)
          alignItems: 'center',
          height: dynamicChartHeight * 1.6, // EDITAR AQUI: Altura do container (aumentado de 1.15 para 1.35)
          marginBottom: 10, // Aumentado (era 5)
          borderRadius: 20, // Adicionado para melhor aparência
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        }]}>
          <SimplePie3D
            data={chartData}
            width={screenWidth - 16} // EDITAR AQUI: Largura do SVG (aumentado, era 20 o desconto)
            height={dynamicChartHeight * 1.2} // EDITAR AQUI: Altura do SVG (aumentado de 1.1 para 1.2)
            pieDepth={15} // EDITAR AQUI: Profundidade do efeito 3D
            backgroundColor="transparent"
            showAllLabels={true}
            onSelectSlice={handlePieChartSelection}
          />
        </View>
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
            height={dynamicChartHeight} 
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
        <Pressable
          style={({pressed}) => [
            styles.periodButton, 
            period === 'day' && styles.activePeriodButton,
            pressed && {opacity: 0.8}
          ]}
          onPress={() => setPeriod('day')}
        >
          <Text style={[styles.periodButtonText, period === 'day' && styles.activePeriodButtonText]}>Day</Text>
        </Pressable>
        <Pressable
          style={({pressed}) => [
            styles.periodButton, 
            period === 'week' && styles.activePeriodButton,
            pressed && {opacity: 0.8}
          ]}
          onPress={() => setPeriod('week')}
        >
          <Text style={[styles.periodButtonText, period === 'week' && styles.activePeriodButtonText]}>Week</Text>
        </Pressable>
        <Pressable
          style={({pressed}) => [
            styles.periodButton, 
            period === 'month' && styles.activePeriodButton,
            pressed && {opacity: 0.8}
          ]}
          onPress={() => setPeriod('month')}
        >
          <Text style={[styles.periodButtonText, period === 'month' && styles.activePeriodButtonText]}>Month</Text>
        </Pressable>
      </View>

      <View style={styles.buttonContainer}>
        {chartTypes.map((type) => {
          const typeLower = type.toLowerCase();
          return (
            <Pressable
              key={type}
              style={({pressed}) => [
                styles.button, 
                chartType === typeLower && styles.activeButton,
                pressed && {opacity: 0.8}
              ]}
              onPress={() => setChartType(typeLower)}
            >
              <Text style={[styles.buttonText, chartType === typeLower && styles.activeButtonText]}>
                {type}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
    marginBottom: 12,
    gap: 12,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFE0B2',
    borderRadius: 12,
    minWidth: 80,
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
    fontSize: 13,
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
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  loadingContainer: {
    height: 120,
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
    height: 120,
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
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginHorizontal: 2,
    marginVertical: 1,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  legendItemSelected: {
    backgroundColor: '#FFFDF0',
    borderColor: 'rgba(0,0,0,0.1)',
    elevation: 1,
  },
  legendColorBox: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendColorBoxSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#555',
    fontSize: 10,
    fontWeight: '400',
  },
  legendTextSelected: {
    fontWeight: 'bold',
  },
});

export { GaugeChart, SimplePie3D };
export default Chart;