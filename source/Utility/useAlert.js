import React, { useState, useCallback } from 'react';
import Alert, { ConfirmModal } from './Alerts';

export const useAlert = () => {
  // State for simple notification (at the top)
  const [alertState, setAlertState] = useState({
    visible: false,
    message: '',
    type: 'info'
  });

  // State for confirmation modal
  const [modalState, setModalState] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    type: 'info'
  });

  // Functions for simple notification (at the top)
  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    setAlertState({
      visible: true,
      message,
      type
    });

    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => {
        setAlertState(prev => ({ ...prev, visible: false }));
      }, duration);
    }
  }, []);

  const hideNotification = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  // Functions for confirmation modal
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

  // Convenience functions for notifications
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

  // Convenience functions for modals
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

  // Components to render
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
    // Simple notifications (at the top)
    showNotification,
    showSuccess,
    showError, 
    showWarning,
    showInfo,
    hideNotification,
    
    // Confirmation modals
    showModal,
    showConfirm,
    showDeleteConfirm,
    showAlert,
    hideModal,
    
    // Components
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