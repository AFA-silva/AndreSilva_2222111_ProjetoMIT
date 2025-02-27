import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
    <View style={[styles.alertContainer, { backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.alertText}>{message}</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  alertContainer: {
    position: 'absolute', // Faz com que o alerta se sobreponha aos demais elementos
    top: 40,           // Ajuste a posição vertical conforme necessário
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,      // Garante que fique acima de outros componentes
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
