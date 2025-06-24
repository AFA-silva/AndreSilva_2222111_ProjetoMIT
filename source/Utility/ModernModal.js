import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  runOnJS
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ModernModal = ({ 
  visible, 
  onClose, 
  title, 
  children, 
  colorScheme = 'orange',
  size = 'medium',
  showCloseButton = true,
  animationType = 'scale'
}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);
  const backdropOpacity = useSharedValue(0);
  const rotation = useSharedValue(-2);

  // Configurações de cores por esquema
  const colorSchemes = {
    orange: {
      primary: '#FF9800',
      secondary: '#FFF8E1',
      border: '#FFE082',
      text: '#E65100',
      shadow: '#FF9800',
      accent: '#F57C00'
    },
    red: {
      primary: '#F44336',
      secondary: '#FFEBEE',
      border: '#FFCDD2',
      text: '#C62828',
      shadow: '#F44336',
      accent: '#D32F2F'
    },
    yellow: {
      primary: '#FFC107',
      secondary: '#FFFDE7',
      border: '#FFECB3',
      text: '#F9A825',
      shadow: '#FFC107',
      accent: '#F57F17'
    }
  };

  const colors = colorSchemes[colorScheme] || colorSchemes.orange;

  // Configurações de tamanho
  const sizes = {
    small: Math.min(screenWidth * 0.7, 300),
    medium: Math.min(screenWidth * 0.85, 400),
    large: Math.min(screenWidth * 0.95, 500)
  };

  const modalWidth = sizes[size];

  useEffect(() => {
    if (visible) {
      // Animação de entrada mais elaborada
      scale.value = 0;
      opacity.value = 0;
      translateY.value = 50;
      backdropOpacity.value = 0;
      rotation.value = -2;
      
      // Animação sequencial para entrada
      backdropOpacity.value = withTiming(1, { duration: 200 });
      
      withDelay(50, () => {
        opacity.value = withTiming(1, { 
          duration: 300, 
          easing: Easing.out(Easing.quad) 
        });
        
        translateY.value = withSpring(0, { 
          damping: 20, 
          stiffness: 200,
          mass: 0.8
        });
        
        rotation.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0, { duration: 150, easing: Easing.out(Easing.quad) })
        );
        
        scale.value = withSequence(
          withTiming(1.1, { 
            duration: 250, 
            easing: Easing.out(Easing.back(1.2)) 
          }),
          withTiming(1, { 
            duration: 150, 
            easing: Easing.inOut(Easing.quad) 
          })
        );
      });
    } else {
      // Animação de saída
      const exitDuration = 200;
      opacity.value = withTiming(0, { duration: exitDuration });
      scale.value = withTiming(0.8, { duration: exitDuration });
      translateY.value = withTiming(30, { duration: exitDuration });
      backdropOpacity.value = withTiming(0, { duration: exitDuration });
    }
  }, [visible]);

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
      { rotateZ: `${rotation.value}deg` }
    ],
    opacity: opacity.value,
  }));

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scale.value, [0, 1], [0.8, 1]) }
    ],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <Animated.View 
          style={[
            styles.container, 
            {
              width: modalWidth,
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
            animatedModalStyle
          ]}
        >
          {/* Header com animação */}
          <Animated.View style={[styles.header, animatedHeaderStyle]}>
            <View style={styles.titleContainer}>
              <View style={[styles.titleIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="document-text" size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.title, { color: colors.primary }]}>
                {title}
              </Text>
            </View>
            {showCloseButton && (
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.border }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Separator line */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  overlayTouchable: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  container: {
    borderRadius: 24,
    padding: 28,
    maxHeight: '85%',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 25,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleIcon: {
    padding: 8,
    borderRadius: 16,
    marginRight: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  separator: {
    height: 2,
    marginBottom: 20,
    borderRadius: 1,
    opacity: 0.3,
  },
  content: {
    flex: 1,
  },
});

export default ModernModal; 