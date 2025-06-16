import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  TimePickerAndroid,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../Styles/Settings/NotificationsPageStyle';
import Alert from '../../Utility/Alerts';
import NotificationService from './NotificationService';
import DateTimePicker from '@react-native-community/datetimepicker';

const NotificationsPage = () => {
  // States for notification settings
  const [settings, setSettings] = useState({
    income_notifications: true,
    expense_notifications: true,
    goal_notifications: true,
    notification_time: '09:00'
  });
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [alerts, setAlerts] = useState([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const settingsAnim = useRef(new Animated.Value(0)).current;
  const timePickerAnim = useRef(new Animated.Value(0)).current;

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
    startAnimations();
  }, []);

  const startAnimations = () => {
    const useNativeDriver = Platform.OS !== 'web';
    
    Animated.stagger(200, [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver,
      }),
      Animated.timing(settingsAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver,
      }),
      Animated.timing(timePickerAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver,
      })
    ]).start();
  };

  const loadSettings = async () => {
    const savedSettings = await NotificationService.syncSettings();
    if (savedSettings) {
      setSettings({
        ...savedSettings,
        notification_time: savedSettings.notification_time.slice(0, 5) // Convert "HH:mm:ss" to "HH:mm"
      });
    }
  };

  const showAlert = (message, type) => {
    const alertId = Date.now();
    setAlerts([...alerts, { id: alertId, message, type }]);
    setTimeout(() => removeAlert(alertId), 3000);
  };

  const removeAlert = (id) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  const handleSettingChange = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    const success = await NotificationService.updateSettings({
      ...newSettings,
      notification_time: newSettings.notification_time + ':00' // Add seconds for database
    });

    if (success) {
      showAlert('Settings updated successfully', 'success');
    } else {
      showAlert('Failed to update settings', 'error');
      // Revert the change if update failed
      setSettings(settings);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      handleSettingChange('notification_time', timeString);
    }
  };

  const openTimePicker = () => {
    if (Platform.OS === 'android') {
      const [hours, minutes] = settings.notification_time.split(':');
      TimePickerAndroid.open({
        hour: parseInt(hours),
        minute: parseInt(minutes),
        is24Hour: true
      }).then(({ action, hour, minute }) => {
        if (action !== TimePickerAndroid.dismissedAction) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          handleSettingChange('notification_time', timeString);
        }
      });
    } else {
      setShowTimePicker(true);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        
        {/* Notification Toggles */}
        <Animated.View style={[styles.settingItem, { opacity: settingsAnim }]}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Income Notifications</Text>
            <Switch
              value={settings.income_notifications}
              onValueChange={(value) => handleSettingChange('income_notifications', value)}
              trackColor={{ false: '#767577', true: '#F9A825' }}
              thumbColor={settings.income_notifications ? '#F57F17' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Expense Notifications</Text>
            <Switch
              value={settings.expense_notifications}
              onValueChange={(value) => handleSettingChange('expense_notifications', value)}
              trackColor={{ false: '#767577', true: '#F9A825' }}
              thumbColor={settings.expense_notifications ? '#F57F17' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Goal Notifications</Text>
            <Switch
              value={settings.goal_notifications}
              onValueChange={(value) => handleSettingChange('goal_notifications', value)}
              trackColor={{ false: '#767577', true: '#F9A825' }}
              thumbColor={settings.goal_notifications ? '#F57F17' : '#f4f3f4'}
            />
          </View>
        </Animated.View>

        {/* Notification Time */}
        <Animated.View style={[styles.settingItem, { opacity: timePickerAnim }]}>
          <TouchableOpacity style={styles.settingRow} onPress={openTimePicker}>
            <Text style={styles.settingLabel}>Notification Time</Text>
            <Text style={styles.settingValue}>{settings.notification_time}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Time Picker Modal for iOS */}
        {Platform.OS === 'ios' && showTimePicker && (
          <Modal
            transparent={true}
            visible={showTimePicker}
            animationType="slide"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <DateTimePicker
                  value={(() => {
                    const [hours, minutes] = settings.notification_time.split(':');
                    const date = new Date();
                    date.setHours(parseInt(hours));
                    date.setMinutes(parseInt(minutes));
                    return date;
                  })()}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={handleTimeChange}
                />
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </Animated.View>

      {/* Alerts */}
      <View style={styles.alertContainer}>
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            message={alert.message}
            type={alert.type}
            onDismiss={() => removeAlert(alert.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
};

export default NotificationsPage; 