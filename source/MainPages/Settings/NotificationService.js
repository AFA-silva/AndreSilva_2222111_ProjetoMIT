import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../Supabase';

// AsyncStorage keys
const NOTIFICATION_SETTINGS_KEY = '@notification_settings';
const NOTIFICATION_TOKEN_KEY = '@notification_token';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  static async getStoredSettings() {
    try {
      const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Error getting stored settings:', error);
      return null;
    }
  }

  static async storeSettings(settings) {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error storing settings:', error);
    }
  }

  static async syncSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get settings from Supabase
      const { data: settings, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // If no settings exist, create default settings
      if (!settings) {
        const defaultSettings = {
          user_id: user.id,
          income_notifications: true,
          expense_notifications: true,
          goal_notifications: true,
          notification_time: '09:00:00'
        };

        const { data: newSettings, error: insertError } = await supabase
          .from('notification_settings')
          .insert([defaultSettings])
          .select()
          .single();

        if (insertError) throw insertError;

        await this.storeSettings(newSettings);
        return newSettings;
      }

      // Store settings locally
      await this.storeSettings(settings);
      return settings;
    } catch (error) {
      console.error('Error syncing settings:', error);
      // Fallback to stored settings
      return await this.getStoredSettings();
    }
  }

  static async updateSettings(newSettings) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Update Supabase
      const { error } = await supabase
        .from('notification_settings')
        .update(newSettings)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local storage
      await this.storeSettings(newSettings);
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  }

  static async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    return true;
  }

  static async scheduleNotification(event) {
    const settings = await this.getStoredSettings();
    if (!settings) return;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // Check if notifications are enabled for this type
    const { type, description, date } = event;
    const settingKey = `${type}_notifications`;
    if (!settings[settingKey]) return;

    const eventDate = new Date(date);
    const now = new Date();

    // For goals
    if (type === 'goal' && settings.goal_notifications) {
      const notificationDays = [7, 3, 1];
      for (const days of notificationDays) {
        const notificationDate = new Date(eventDate);
        notificationDate.setDate(notificationDate.getDate() - days);
        
        if (notificationDate > now) {
          await this.scheduleSingleNotification({
            ...event,
            date: notificationDate,
            description: `Goal "${description}" is due in ${days} day${days > 1 ? 's' : ''}!`,
          });
        }
      }
    } 
    // For income and expenses
    else if ((type === 'income' && settings.income_notifications) || 
             (type === 'expense' && settings.expense_notifications)) {
      const oneDayBefore = new Date(eventDate);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      
      if (oneDayBefore > now) {
        const message = type === 'income' 
          ? `You will receive "${description}" tomorrow!`
          : `You need to pay "${description}" tomorrow!`;
        
        await this.scheduleSingleNotification({
          ...event,
          date: oneDayBefore,
          description: message,
        });
      }
    }
  }

  static async scheduleSingleNotification(event) {
    const settings = await this.getStoredSettings();
    if (!settings) return;

    const trigger = new Date(event.date);
    const [hours, minutes] = settings.notification_time.split(':');
    trigger.setHours(parseInt(hours), parseInt(minutes), 0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: event.type.charAt(0).toUpperCase() + event.type.slice(1),
        body: event.description,
        data: { event },
      },
      trigger,
    });
  }

  static async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async cancelNotification(notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}

export default NotificationService; 