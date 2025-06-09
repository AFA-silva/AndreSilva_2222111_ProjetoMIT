import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Alert = ({ message, type = 'info', onClose }) => {
  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50'; // Verde
      case 'error':
        return '#F44336'; // Vermelho
      case 'warning':
        return '#FFC107'; // Amarelo
      default:
        return '#2196F3'; // Azul (info)
    }
  };

  return (
    <View style={[styles.alertContainer, { backgroundColor: getBackgroundColor(), pointerEvents: 'auto' }]}>
      <Text style={styles.alertText}>{message}</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  alertContainer: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    elevation: 9999, // Para Android
    zIndex: 999999, // Para iOS
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)'
    } : {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    }),
  },
  alertText: {
    color: 'white',
    fontSize: 14,
    flexShrink: 1,
  },
  closeButton: {
    padding: 5,
  },
});

export default Alert;
