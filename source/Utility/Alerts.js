import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Simple Alert component (top notification)
const Alert = ({ 
  visible, 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}) => {
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

// Confirmation Modal component
const ConfirmationModal = ({ 
  visible, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  onConfirm, 
  onCancel,
  type = 'warning' // warning, danger, info
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

// Original Alert styles (top notification)
const alertStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  alert: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
  },
  success: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  error: {
    borderLeftColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  warning: {
    borderLeftColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  info: {
    borderLeftColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  message: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  successText: {
    color: '#2E7D32',
  },
  errorText: {
    color: '#C62828',
  },
  warningText: {
    color: '#E65100',
  },
  infoText: {
    color: '#1565C0',
  },
});

// Confirmation Modal styles
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButtonText: {
    color: '#666',
  },
  confirmButtonText: {
    color: '#fff',
  },
});

// Exportar ambos os componentes
export default Alert;
export { Alert, ConfirmationModal };
