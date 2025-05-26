import React from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Detector de plataforma
const isWeb = Platform.OS === 'web';
const STATUSBAR_HEIGHT = isWeb ? 0 : (StatusBar.currentHeight || (Platform.OS === 'ios' ? 44 : 0));

const Header = ({ title }) => {
  return (
    <View style={styles.headerWrapper}>
      {!isWeb && (
        <StatusBar 
          barStyle="light-content" 
          backgroundColor="transparent" 
          translucent 
        />
      )}
      
      <LinearGradient
        colors={['#FF7A00', '#FFAC42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerContainer}
      >
        {/* Círculo decorativo */}
        <View style={styles.decorativeCircle} />
        
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>
            {title}
          </Text>
          <View style={styles.titleUnderline} />
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    width: '100%',
  },
  headerContainer: {
    paddingTop: isWeb ? 16 : STATUSBAR_HEIGHT + 8,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  titleUnderline: {
    height: 2,
    width: 30,
    backgroundColor: '#FFFFFF',
    marginTop: 5,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -20,
    left: 10,
    zIndex: 0,
  }
});

export default Header; 