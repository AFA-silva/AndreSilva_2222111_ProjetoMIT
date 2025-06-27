import React, { useState, useCallback } from 'react';
import Alert, { ConfirmModal } from './Alerts';

export const useAlert = () => {
  // Estado para notificação simples (no topo)
  const [alertState, setAlertState] = useState({
    visible: false,
    message: '',
    type: 'info'
  });

  // Estado para modal de confirmação
  const [modalState, setModalState] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    type: 'info'
  });

  // Funções para notificação simples (no topo)
  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    setAlertState({
      visible: true,
      message,
      type
    });

    // Auto-hide após duration
    if (duration > 0) {
      setTimeout(() => {
        setAlertState(prev => ({ ...prev, visible: false }));
      }, duration);
    }
  }, []);

  const hideNotification = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  // Funções para modal de confirmação
  const showModal = useCallback(({ title, message, buttons, type = 'info' }) => {
    setModalState({
      visible: true,
      title,
      message,
      buttons,
      type
    });
  }, []);

  const hideModal = useCallback(() => {
    setModalState(prev => ({ ...prev, visible: false }));
  }, []);

  // Funções de conveniência para notificações
  const showSuccess = useCallback((message, duration = 3000) => {
    showNotification(message, 'success', duration);
  }, [showNotification]);

  const showError = useCallback((message, duration = 4000) => {
    showNotification(message, 'error', duration);
  }, [showNotification]);

  const showWarning = useCallback((message, duration = 3500) => {
    showNotification(message, 'warning', duration);
  }, [showNotification]);

  const showInfo = useCallback((message, duration = 3000) => {
    showNotification(message, 'info', duration);
  }, [showNotification]);

  // Funções de conveniência para modais
  const showConfirm = useCallback((title, message, onConfirm, onCancel) => {
    showModal({
      title,
      message,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'Confirm', style: 'destructive', onPress: onConfirm }
      ]
    });
  }, [showModal]);

  const showDeleteConfirm = useCallback((title, message, onDelete, onCancel) => {
    showModal({
      title,
      message,
      type: 'error',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'Delete', style: 'destructive', onPress: onDelete }
      ]
    });
  }, [showModal]);

  const showAlert = useCallback((title, message, onOk, type = 'info') => {
    showModal({
      title,
      message,
      type,
      buttons: [
        { text: 'OK', onPress: onOk }
      ]
    });
  }, [showModal]);

  // Componentes para renderizar
  const NotificationComponent = useCallback(() => (
    alertState.visible ? (
      <Alert
        message={alertState.message}
        type={alertState.type}
        onClose={hideNotification}
      />
    ) : null
  ), [alertState, hideNotification]);

  const ModalComponent = useCallback(() => (
    <ConfirmModal
      visible={modalState.visible}
      title={modalState.title}
      message={modalState.message}
      buttons={modalState.buttons}
      type={modalState.type}
      onClose={hideModal}
    />
  ), [modalState, hideModal]);

  return {
    // Notificações simples (no topo)
    showNotification,
    showSuccess,
    showError, 
    showWarning,
    showInfo,
    hideNotification,
    
    // Modais de confirmação
    showModal,
    showConfirm,
    showDeleteConfirm,
    showAlert,
    hideModal,
    
    // Componentes
    NotificationComponent,
    ModalComponent,
    
    // Para backward compatibility
    AlertComponent: () => (
      <>
        <NotificationComponent />
        <ModalComponent />
      </>
    )
  };
}; 