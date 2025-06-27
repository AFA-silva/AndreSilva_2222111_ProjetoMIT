import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing } from 'react-native';
import styles from '../Styles/AccountPageStyles/SplashScreenStyle';

const SplashScreen = ({ message = "Loading..." }) => {
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(0)).current;
  const borderPulse = useRef(new Animated.Value(1)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('Starting splash screen animation sequence');

    // Create the complete animation sequence
    const animationSequence = Animated.sequence([
      // Step 1: Logo fade in (0-0.8s)
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: true,
      }),
      
      // Step 2: Wait 0.4 second, then text fade in (0.8s-1.2s + 0.6s = 1.8s total)
      Animated.sequence([
        Animated.delay(400), // Wait 0.4 second (faster)
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
      ]),
      
      // Step 3: Circle appears (1.8s-2.3s)
      Animated.timing(circleScale, {
        toValue: 1,
        duration: 500,
        easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
        useNativeDriver: true,
      }),
      
      // Step 4: Hold for border animation to start (2.3s-2.8s)
      Animated.delay(500),
    ]);

    // Start the main animation sequence
    animationSequence.start((finished) => {
      console.log('Main animation sequence completed:', finished);
      if (finished) {
        // Start pulse and border animations after main sequence completes
        console.log('Starting pulse and border animations');
        pulseAnimation.start();
        borderAnimation.start();
      }
    });

    // Pulse animation (starts after main sequence)
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.1,
          duration: 600,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 600,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }),
      ])
    );

    // Border pulse animation (starts after main sequence)
    const borderAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(borderPulse, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }),
        Animated.timing(borderPulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }),
      ])
    );

    // Cleanup
    return () => {
      console.log('Cleaning up splash screen animations');
      animationSequence.stop();
      pulseAnimation.stop();
      borderAnimation.stop();
    };
  }, [logoOpacity, textOpacity, circleScale, borderPulse, pulseScale]);

  // No interpolations needed for the new border animation

  return (
    <Animated.View style={styles.container}>
      {/* Logo with pulse animation */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      >
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo}
          accessibilityLabel="MIT Application logo"
        />
        
        {/* Circle border around logo */}
        <Animated.View
          style={[
            styles.circleContainer,
            {
              transform: [{ scale: Animated.multiply(circleScale, borderPulse) }],
            },
          ]}
        >
          <View style={styles.circle} />
        </Animated.View>
      </Animated.View>

      {/* Welcome text */}
      <Animated.Text 
        style={[
          styles.welcomeText, 
          { opacity: textOpacity }
        ]}
      >
        Welcome to MIT
      </Animated.Text>
    </Animated.View>
  );
};

export default SplashScreen; 