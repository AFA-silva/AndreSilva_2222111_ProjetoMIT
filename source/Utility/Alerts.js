import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Componente de Alert simples (notificação no topo)
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

// Componente de Modal de Confirmação
const ConfirmModal = ({ 
  visible, 
  title, 
  message, 
  buttons, 
  onClose,
  type = 'info'
}) => {
  const getIconAndColor = () => {
    switch (type) {
      case 'warning':
        return { icon: 'warning', color: '#FF9800' };
      case 'error':
        return { icon: 'error', color: '#F44336' };
      case 'success':
        return { icon: 'check-circle', color: '#4CAF50' };
      default:
        return { icon: 'info', color: '#2196F3' };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <MaterialIcons name={icon} size={32} color={color} />
            <Text style={styles.modalTitle}>{title}</Text>
          </View>
          
          <Text style={styles.modalMessage}>{message}</Text>
          
          <View style={styles.modalButtonsContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.modalButton,
                  button.style === 'destructive' && styles.destructiveButton,
                  button.style === 'cancel' && styles.cancelButton,
                  !button.style && styles.defaultButton
                ]}
                onPress={() => {
                  button.onPress?.();
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.modalButtonText,
                  button.style === 'destructive' && styles.destructiveButtonText,
                  button.style === 'cancel' && styles.cancelButtonText,
                  !button.style && styles.defaultButtonText
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Estilos do Alert original (notificação no topo)
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
  
  // Estilos do Modal de Confirmação
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtonsContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    width: '100%',
  },
  defaultButton: {
    backgroundColor: '#3F51B5',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  destructiveButton: {
    backgroundColor: '#F44336',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultButtonText: {
    color: 'white',
  },
  cancelButtonText: {
    color: '#666',
  },
  destructiveButtonText: {
    color: 'white',
  },
});

// Exportar ambos os componentes
export default Alert;
export { Alert, ConfirmModal };
