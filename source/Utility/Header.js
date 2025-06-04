import React from 'react';
import { View, Text, StyleSheet, StatusBar, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Detector de plataforma
const isWeb = Platform.OS === 'web';
const STATUSBAR_HEIGHT = isWeb ? 0 : (StatusBar.currentHeight || (Platform.OS === 'ios' ? 44 : 0));
const SCREEN_WIDTH = Dimensions.get('window').width;

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
    width: SCREEN_WIDTH, // Usar largura da tela
    left: 0,
    right: 0,
    position: 'relative',
    marginHorizontal: -16, // Compensar pelo padding dos containers pai
    alignSelf: 'center',
  },
  headerContainer: {
    paddingTop: isWeb ? 16 : STATUSBAR_HEIGHT + 8,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
    paddingTop: 4,
    paddingBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  titleUnderline: {
    height: 2,
    width: 40,
    backgroundColor: '#FFFFFF',
    marginTop: 6,
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