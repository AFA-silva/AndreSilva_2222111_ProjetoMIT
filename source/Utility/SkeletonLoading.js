import React from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

class SkeletonLoading extends React.Component {
  constructor(props) {
    super(props);
    this.animatedValue = new Animated.Value(0);
  }

  componentDidMount() {
    this.startAnimation();
  }

  componentWillUnmount() {
    // Stop animation to prevent memory leaks
    this.animatedValue.stopAnimation();
  }

  startAnimation() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(this.animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(this.animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }

  render() {
    const {
      variant = 'text',
      width: customWidth,
      height: customHeight,
      borderRadius = 5,
      animation = 'pulse',
      style,
      children,
    } = this.props;

    // Determine dimensions based on props or infer from children
    let calculatedWidth;
    let calculatedHeight;

    if (children) {
      // Infer dimensions based on child component (experimental)
      const childStyle = children?.props?.style || {};
      calculatedWidth = childStyle.width || '100%';
      calculatedHeight = childStyle.height || 20;
    } else {
      calculatedWidth = customWidth || (variant === 'text' ? '100%' : 100);
      calculatedHeight = customHeight || (variant === 'text' ? 20 : 100);
    }

    // Calculate border radius based on variant
    let calculatedBorderRadius;
    if (variant === 'circular') {
      calculatedBorderRadius = 500; // Enough to make it circular
    } else if (variant === 'rounded') {
      calculatedBorderRadius = 10;
    } else if (variant === 'rectangular') {
      calculatedBorderRadius = 0;
    } else {
      // text
      calculatedBorderRadius = borderRadius;
    }

    // Animation styles
    const interpolatedBackgroundColor = this.animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(200, 200, 200, 0.5)', 'rgba(230, 230, 230, 0.8)'],
    });

    const animationStyle = animation === 'pulse' 
      ? { backgroundColor: interpolatedBackgroundColor }
      : animation === 'wave'
      ? {
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'rgba(200, 200, 200, 0.5)',
        }
      : { backgroundColor: 'rgba(200, 200, 200, 0.5)' };

    return (
      <View style={[{ width: calculatedWidth, height: calculatedHeight }, style]}>
        <Animated.View 
          style={[
            styles.skeleton, 
            { 
              width: calculatedWidth, 
              height: calculatedHeight,
              borderRadius: calculatedBorderRadius,
              ...animationStyle
            }
          ]}
        >
          {animation === 'wave' && (
            <Animated.View 
              style={[
                styles.wave,
                {
                  transform: [
                    { 
                      translateX: this.animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-width, width]
                      }) 
                    }
                  ]
                }
              ]}
            />
          )}
        </Animated.View>
      </View>
    );
  }
}

// Various skeleton presets for common use cases
export const TextRowSkeleton = ({ lines = 1, lastLineWidth = '100%', spacing = 10, style }) => {
  const rows = [];
  
  for (let i = 0; i < lines; i++) {
    const isLastLine = i === lines - 1;
    const lineWidth = isLastLine ? lastLineWidth : '100%';
    
    rows.push(
      <SkeletonLoading 
        key={i} 
        variant="text"
        width={lineWidth}
        style={[styles.textRow, i > 0 && { marginTop: spacing }, style]} 
      />
    );
  }
  
  return <>{rows}</>;
};

export const CardSkeleton = ({ height = 150, style }) => (
  <SkeletonLoading
    variant="rounded"
    height={height}
    style={[styles.card, style]}
  />
);

export const AvatarSkeleton = ({ size = 40, style }) => (
  <SkeletonLoading
    variant="circular"
    width={size}
    height={size}
    style={style}
  />
);

export const FinancialStatsSkeleton = () => (
  <View style={styles.statsContainer}>
    <SkeletonLoading 
      variant="rounded"
      width="46%"
      height={80}
      style={styles.statCard}
    />
    <SkeletonLoading 
      variant="rounded"
      width="46%"
      height={80}
      style={styles.statCard}
    />
    <SkeletonLoading 
      variant="rounded"
      width="100%"
      height={80}
      style={[styles.statCard, { marginBottom: 0 }]}
    />
  </View>
);

export const GoalOverviewSkeleton = () => (
  <View style={styles.goalOverviewContainer}>
    <View style={styles.goalHeader}>
      <TextRowSkeleton lines={1} style={{ width: '60%' }} />
    </View>
    <View style={styles.goalItemsContainer}>
      <View style={styles.goalItemRow}>
        <AvatarSkeleton size={36} />
        <View style={styles.goalTextContainer}>
          <TextRowSkeleton lines={2} lastLineWidth="30%" />
        </View>
        <AvatarSkeleton size={36} />
        <View style={styles.goalTextContainer}>
          <TextRowSkeleton lines={2} lastLineWidth="30%" />
        </View>
      </View>
      <View style={styles.goalItemRow}>
        <AvatarSkeleton size={36} />
        <View style={styles.goalTextContainer}>
          <TextRowSkeleton lines={2} lastLineWidth="30%" />
        </View>
        <AvatarSkeleton size={36} />
        <View style={styles.goalTextContainer}>
          <TextRowSkeleton lines={2} lastLineWidth="30%" />
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(200, 200, 200, 0.5)',
  },
  wave: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    width: '100%',
    height: '100%',
  },
  textRow: {
    height: 16,
  },
  card: {
    width: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  statCard: {
    marginBottom: 16,
  },
  goalOverviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalItemsContainer: {
    flexDirection: 'column',
  },
  goalItemRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  goalTextContainer: {
    width: '30%',
    justifyContent: 'center',
  }
});

export default SkeletonLoading; 