import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Text, Modal, ScrollView, TextInput, ActivityIndicator, Alert, FlatList, Animated, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../../Supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, Ionicons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import styles from '../Styles/MainPageStyles/CalendarPageStyle';
import Header from '../Utility/Header';
import { useAlert } from '../Utility/useAlert';

const CalendarPage = () => {
  // States for calendar and events
  const [events, setEvents] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState([]);
  
  // State for record selection
  const [loading, setLoading] = useState(false);
  const [existingRecords, setExistingRecords] = useState([]);
  const [showExistingRecords, setShowExistingRecords] = useState(false);
  const [recordType, setRecordType] = useState('expense');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State to track already assigned records
  const [assignedRecords, setAssignedRecords] = useState({});
  
  // State for event counts and upcoming events
  const [eventCounts, setEventCounts] = useState({ income: 0, expense: 0, goal: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  
  // State for record type
  const [isRecurring, setIsRecurring] = useState(false);
  
  // State for user-controlled recurrence
  const [recurrenceCount, setRecurrenceCount] = useState(1);
  const [maxRecurrenceAllowed, setMaxRecurrenceAllowed] = useState(30);
  
  // State for showing filtered events
  const [showFilteredEvents, setShowFilteredEvents] = useState(false);
  const [filteredEventType, setFilteredEventType] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);
  
  // User currency
  const [userCurrency, setUserCurrency] = useState('€');
  
  // State for record type
  const [currentViewMonth, setCurrentViewMonth] = useState(new Date());
  
  // State for delete confirmation modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isRecurringDelete, setIsRecurringDelete] = useState(false);
  
  const navigation = useNavigation();
  
  // Alert Hook
  const { 
    showSuccess, 
    showError,
    AlertComponent 
  } = useAlert();

  // Get current date for today highlighting
  const currentDate = new Date().toISOString().split('T')[0];

  // Refresh events when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchEvents();
      startInitialAnimations();
    }, [])
  );

  useEffect(() => {
    fetchEvents();
    startInitialAnimations();
  }, []);
  
  // Animation for initial load
  const startInitialAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();
  };

  // Animation for when records are loaded
  const animateRecordLoad = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  };

  // Helper function to validate if a date is valid
  const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date.getTime());
  };

  // Helper function to generate recurring dates based on frequency and count
  const generateRecurringDates = (startDate, frequencyDays, maxLimit = 12) => {
    try {
      if (!startDate) {
        console.error('No start date provided');
        return [];
      }

      const start = new Date(startDate);
      if (!isValidDate(start)) {
        console.error('Invalid start date:', startDate);
        return [];
      }

      const dates = [];
      let currentDate = new Date(start);

      // Validate frequency days
      const frequencyDaysToUse = frequencyDays && frequencyDays > 0 ? frequencyDays : 30;

      // Generate dates up to maxLimit
      for (let i = 0; i < maxLimit; i++) {
        if (isValidDate(currentDate)) {
          dates.push(new Date(currentDate));
        } else {
          console.error('Invalid date generated during iteration:', currentDate);
          break;
        }
        
        // Add frequency days to current date
        currentDate.setDate(currentDate.getDate() + frequencyDaysToUse);
        
        // Safety check to prevent infinite loops with very large dates
        if (currentDate.getFullYear() > 2030) {
          console.warn('Date exceeded reasonable bounds, stopping generation');
          break;
        }
      }

      return dates;
    } catch (error) {
      console.error('Error generating recurring dates:', error);
      return [];
    }
  };

  const fetchEvents = async (selectedMonth = null) => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      // Inicializar a data atual ou usar o mês selecionado se fornecido
      const now = selectedMonth ? new Date(selectedMonth) : new Date();
      
      // Get today's date at midnight for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Buscar eventos básicos do calendário
      const { data: calendarEvents, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          type,
          date,
          is_recurring,
          event_id
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching calendar events:', error);
        throw error;
      }

      // Arrays para armazenar IDs de income e expense para busca posterior
      const incomeIds = [];
      const expenseIds = [];
      const goalIds = [];

      // Identificar quais IDs precisamos buscar
      calendarEvents?.forEach(event => {
        if (event.event_id) {
          if (event.type === 'income') {
            incomeIds.push(event.event_id);
          } else if (event.type === 'expense') {
            expenseIds.push(event.event_id);
          } else if (event.type === 'goal') {
            goalIds.push(event.event_id);
          }
        }
      });

      // Buscar detalhes de income e expense
      let incomeDetails = {};
      let expenseDetails = {};
      let goalDetails = {};

      // Buscar detalhes de income se houver IDs
      if (incomeIds.length > 0) {
        const { data: incomeData, error: incomeError } = await supabase
          .from('income')
          .select(`
            id, 
            name, 
            amount,
            category_id,
            frequency_id,
            frequencies:frequency_id(name, days),
            categories:category_id(name)
          `)
          .in('id', incomeIds);
        
        if (incomeError) {
          console.error('Erro ao buscar income:', incomeError);
        } else if (incomeData) {
          // Criar um mapa de ID para detalhes para fácil acesso
          incomeDetails = incomeData.reduce((acc, income) => {
            acc[income.id] = income;
            return acc;
          }, {});
        }
      }

      // Buscar detalhes de expense se houver IDs
      if (expenseIds.length > 0) {
        const { data: expenseData, error: expenseError } = await supabase
          .from('expenses')
          .select(`
            id,
            name,
            amount,
            category_id,
            frequency_id,
            frequencies:frequency_id(name, days),
            categories:category_id(name)
          `)
          .in('id', expenseIds);
        
        if (expenseError) {
          console.error('Erro ao buscar expenses:', expenseError);
        } else if (expenseData) {
          // Criar um mapa de ID para detalhes para fácil acesso
          expenseDetails = expenseData.reduce((acc, expense) => {
            acc[expense.id] = expense;
            return acc;
          }, {});
        }
      }

      // Buscar detalhes de goal se houver IDs
      if (goalIds.length > 0) {
        const { data: goalData, error: goalError } = await supabase
          .from('goals')
          .select(`
            id,
            name,
            amount
          `)
          .in('id', goalIds);
        
        if (goalError) {
          console.error('Erro ao buscar goals:', goalError);
        } else if (goalData) {
          // Criar um mapa de ID para detalhes para fácil acesso
          goalDetails = goalData.reduce((acc, goal) => {
            acc[goal.id] = goal;
            return acc;
          }, {});
        }
      }

      // Process calendar events com os detalhes adicionais
      const markedDates = {};
      const assignedRecordsMap = {};
      let upcomingEventsList = [];
      
      // Get counts for current month (now based on selected month)
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Initialize counters
      let incomeCount = 0;
      let expenseCount = 0;
      let goalCount = 0;
      
      // Definir o período relevante para visualização
      const viewMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Primeiro dia do mês atual
      const viewMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Último dia do mês atual
      const nextMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Último dia do próximo mês
      
      // Processar cada evento do calendário
      calendarEvents?.forEach(event => {
        // Verificação de integridade do evento
        if (!event || !event.id || !event.date || !event.type) {
          console.warn('⚠️ Skipping invalid event:', event);
          return;
        }
        
        const eventDate = new Date(event.date);
        
        // Hide past events
        if (eventDate < today) return;
        
        // Verificar se esta data está dentro do intervalo visualizado ou próximo mês
        const isInCurrentViewPeriod = 
          (eventDate >= viewMonthStart && eventDate <= nextMonthLastDay);
        
        if (!isInCurrentViewPeriod) return; // Pular datas fora do período relevante
        
        const date = event.date;
        
        // Track assigned records by date
        if (!assignedRecordsMap[date]) {
          assignedRecordsMap[date] = new Set();
        }
        assignedRecordsMap[date].add(`${event.type}-${event.event_id}`);
          
        // Count events for current month only
        if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
          if (event.type === 'income') incomeCount++;
          else if (event.type === 'expense') expenseCount++;
          else if (event.type === 'goal') goalCount++;
        }
        
        // Collect upcoming events for viewed month and next month
        if (eventDate >= viewMonthStart && eventDate <= nextMonthLastDay) {
          // Enriquecer o evento com detalhes, se disponíveis
          let details = null;
          if (event.event_id) {
            if (event.type === 'income') {
              details = incomeDetails[event.event_id];
            } else if (event.type === 'expense') {
              details = expenseDetails[event.event_id];
            } else if (event.type === 'goal') {
              details = goalDetails[event.event_id];
            }
          }
          
          // Adicionar detalhes ao evento
          if (details) {
            event.name = details.name || '';
            event.amount = details.amount || 0;
            event.category = details.categories?.name || '';
            event.category_id = details.category_id || null;
            event.frequency_id = details.frequency_id || null;
            event.frequencies = details.frequencies || null;
          } else {
            // Valores padrão se detalhes não estiverem disponíveis
            event.name = event.type.charAt(0).toUpperCase() + event.type.slice(1) + ' Event';
            event.amount = 0;
          }
          
          // Criar cópia do evento para esta data específica
          const eventCopy = {
            ...event,
            formattedDate: eventDate
          };
          
          upcomingEventsList.push(eventCopy);
        }
        
        // Format calendar marked dates
        if (!markedDates[date]) {
          markedDates[date] = {
            marked: true,
            dotColor: getEventColor(event.type),
            events: [],
            dots: []
          };
        }
        
        // Add dot for each event type if not already added
        const hasDotOfType = markedDates[date].dots.some(dot => dot.color === getEventColor(event.type));
        if (!hasDotOfType) {
          markedDates[date].dots.push({
            color: getEventColor(event.type),
            key: event.type
          });
        }
        
        // Push event to the date's events array
        markedDates[date].events.push(event);
      });
      
      // Sort upcoming events by date
      upcomingEventsList.sort((a, b) => a.formattedDate - b.formattedDate);
      
      // Take only first 3 upcoming events
      upcomingEventsList = upcomingEventsList.slice(0, 3);
      
      // Set today's date if it's not already marked
      if (!markedDates[currentDate]) {
        markedDates[currentDate] = {
          marked: false,
          dotColor: 'transparent',
          events: []
        };
      }
      
      // Add special styling for today
      if (markedDates[currentDate]) {
        markedDates[currentDate] = {
          ...markedDates[currentDate],
          selected: true,
          selectedColor: 'rgba(63, 81, 181, 0.2)'
        };
      }

      setEvents(markedDates);
      setAssignedRecords(assignedRecordsMap);
      
      // Store counts and upcoming events in state
      setEventCounts({
        income: incomeCount,
        expense: expenseCount,
        goal: goalCount
      });
      
      setUpcomingEvents(upcomingEventsList);
      
      // Armazenar o mês atual que está sendo visualizado
      setCurrentViewMonth(now);
    } catch (error) {
      console.error('Error fetching events:', error);
      showError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingRecords = async (type) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let data, error;
      
      if (type === 'income') {
        // Query for income table with correct columns
        const response = await supabase
          .from('income')
          .select(`
            id,
            name,
            amount,
            category_id,
            frequency_id,
            frequencies:frequency_id(name, days),
            categories:category_id(name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        data = response.data;
        error = response.error;
      } else if (type === 'expense') {
        // Query for expenses table
        const response = await supabase
          .from('expenses')
          .select(`
            id,
            name,
            amount,
            category_id,
            frequency_id,
            frequencies:frequency_id(name, days),
            categories:category_id(name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        data = response.data;
        error = response.error;
      } else if (type === 'goal') {
        // Query for goals table
        const response = await supabase
          .from('goals')
          .select(`
            id,
            name,
            amount
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        data = response.data;
        error = response.error;
      }

      if (error) throw error;
      
      // Filtrar registros que já estão associados à data selecionada
      const alreadyAssignedIds = new Set();
      
      // Verificar quais registros já estão associados à data selecionada
      if (assignedRecords[selectedDate]) {
        assignedRecords[selectedDate].forEach(key => {
          if (key.startsWith(`${type}-`)) {
            const recordId = key.split('-')[1];
            alreadyAssignedIds.add(recordId);
          }
        });
      }
      
      // Filtrar registros que não estão associados
      const filteredData = data?.filter(item => !alreadyAssignedIds.has(item.id.toString())) || [];
      
      // Formatar os dados para exibição
      const formattedData = filteredData.map(item => ({
        ...item,
        displayText: `${item.name} - ${item.categories?.name || 'No category'} - ${Number(item.amount).toFixed(2)}${userCurrency}`
      }));

      setExistingRecords(formattedData);
      animateRecordLoad();
    } catch (error) {
      console.error(`Error fetching ${recordType}:`, error);
      showError(`Failed to load ${recordType} records`);
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'income':
        return '#4CAF50';
      case 'expense':
        return '#F44336';
      case 'goal':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    setSelectedEvents(events[day.dateString]?.events || []);
    setModalVisible(true);
    setShowExistingRecords(false);
  };

  const getMaxRecurrenceLimit = (frequencyDays) => {
    if (frequencyDays <= 1) {
      // Daily: 1 month = ~30 occurrences
      return 30;
    } else if (frequencyDays <= 7) {
      // Weekly: 6 months = ~26 occurrences
      return 26;
    } else {
      // Monthly or longer: 12 months = 12 occurrences  
      return 12;
    }
  };

  const getFrequencyDisplayName = (frequencyDays) => {
    if (frequencyDays <= 1) return 'Daily';
    if (frequencyDays <= 7) return 'Weekly';
    if (frequencyDays <= 30) return 'Monthly';
    return 'Custom';
  };

  const openExistingRecordSelector = (type) => {
    setRecordType(type);
    setSearchTerm('');
    // Clear existing records immediately to avoid showing old data
    setExistingRecords([]);
    // Reset recurrence settings
    setIsRecurring(false);
    setRecurrenceCount(1);
    setMaxRecurrenceAllowed(30);
    // Set loading to true immediately
    setLoading(true);
    // Fetch new records
    fetchExistingRecords(type);
    setShowExistingRecords(true);
  };

  const addExistingToCalendar = async (record, type) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }
      
      // Get frequency information
      let frequencyDays = 30; // Default
      if (record.frequencies && record.frequencies.days) {
        frequencyDays = record.frequencies.days;
      }

      // Calculate max limit based on frequency
      const maxLimit = Math.min(12, Math.ceil(365 / frequencyDays));

      // Check for existing calendar events to avoid conflicts
      const { data: existingEvents, error: existingError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_id', record.id)
        .eq('type', type);

      if (existingError) {
        console.error('Error checking existing events:', existingError);
        return;
      }

      if (existingEvents && existingEvents.length > 0) {
        return;
      }

      // Generate recurring dates starting from today or selected date
      const startDate = selectedDate || new Date().toISOString().split('T')[0];
      
      if (!startDate) {
        console.error('No start date available');
        showError('Unable to determine start date');
        return;
      }

      let dates = generateRecurringDates(startDate, frequencyDays, maxLimit);

      if (dates.length === 0) {
        // Fallback to a single date if generation failed
        const fallbackDate = new Date(startDate);
        if (isValidDate(fallbackDate)) {
          dates = [fallbackDate];
        } else {
          console.error('Invalid fallback date:', startDate);
          showError('Invalid date format');
          return;
        }
      }

      // Prepare events to insert with proper error handling
      const eventsToCreate = [];
      for (const date of dates) {
        try {
          if (!isValidDate(date)) {
            console.error('Invalid date in dates array:', date);
            continue;
          }

          const dateString = date.toISOString().split('T')[0];
          eventsToCreate.push({
            user_id: user.id,
            event_id: record.id,
            type: type,
            date: dateString,
            is_recurring: dates.length > 1,
            created_at: new Date().toISOString()
          });
        } catch (dateError) {
          console.error('Error processing date:', date, dateError);
          continue;
        }
      }

      if (eventsToCreate.length === 0) {
        console.error('No valid events to create');
        showError('Failed to generate valid dates');
        return;
      }

      // Insert events
      const { data: insertedEvents, error: insertError } = await supabase
        .from('calendar_events')
        .insert(eventsToCreate)
        .select();

      if (insertError) {
        console.error('Error inserting calendar events:', insertError);
        showError('Failed to add events to calendar');
        return;
      }

      // Refresh events
      await fetchEvents();
      showSuccess(`${eventsToCreate.length} events added to calendar`);
    } catch (error) {
      console.error('Error adding existing to calendar:', error);
      showError('Failed to add events to calendar');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      // Encontrar o evento nos eventos selecionados
      const eventToBeDeleted = selectedEvents.find(event => event.id === eventId) || 
                           filteredEvents.find(event => event.id === eventId);
      if (!eventToBeDeleted) {
        console.error('Could not find event with ID:', eventId);
        showError('Could not find the event to delete');
        return;
      }
      // Block deletion for goals
      if (eventToBeDeleted.type === 'goal') {
        showError('Goals must be removed directly on the Goals page.');
        return;
      }
      // Definir o tipo de exclusão com base no evento ser recorrente ou não
      setEventToDelete(eventToBeDeleted);
      setIsRecurringDelete(eventToBeDeleted.is_recurring);
      setDeleteModalVisible(true);
    } catch (error) {
      console.error('Error in handleDeleteEvent:', error);
      showError('Failed to delete event');
    }
  };

  // Função simplificada para excluir evento individual
  const deleteCurrentEvent = async (eventToDelete, eventId) => {
    try {
      
      // Delete event from database
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);
      
      if (error) {
        console.error('Error deleting event:', error);
        throw error;
      }
      
      // Atualizar estado local para remover o evento
      if (showFilteredEvents) {
        setFilteredEvents(currentEvents => 
          currentEvents.filter(event => event.id !== eventId)
        );
      } else {
        setSelectedEvents(currentEvents => 
          currentEvents.filter(event => event.id !== eventId)
        );
      }
      
      // Atualizar os eventos do calendário
      await fetchEvents();
      
    } catch (error) {
      console.error('Error in deleteCurrentEvent:', error);
      throw error;
    }
  };

  // Função para excluir todos os eventos recorrentes com o mesmo event_id
  const deleteAllRecurringEvents = async (eventToDelete, eventId) => {
    try {
      
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('event_id', eventToDelete.event_id)
        .eq('type', eventToDelete.type)
        .eq('is_recurring', true);
        
      if (error) {
        console.error('Error deleting recurring events:', error);
        throw error;
      }
      
      // Atualizar os eventos do calendário
      await fetchEvents();
      
    } catch (error) {
      console.error('Error in deleteAllRecurringEvents:', error);
      throw error;
    }
  };

  const renderLegend = () => {
    return (
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Legend:</Text>
        <View style={styles.legendItemsContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Expense</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.legendText}>Goal</Text>
          </View>
        </View>
      </View>
    );
  };

  // Função getEventDisplayText para obter o nome correto do evento
  const getEventDisplayText = (event) => {
    // Se o evento tiver nome específico, usá-lo
    if (event.name && event.name !== 'Income Event' && event.name !== 'Expense Event' && event.name !== 'Goal Event') {
      return event.name;
    }
    
    // Caso contrário, usar o tipo genérico
    return `${event.type.charAt(0).toUpperCase() + event.type.slice(1)} Event`;
  };

  const renderEventSummary = () => {
    if (!selectedEvents || selectedEvents.length === 0) return null;
    
    // Calculate totals by type
    const totals = selectedEvents.reduce((acc, event) => {
      // Se o evento tiver um valor fixo, usá-lo diretamente
      if (event.amount > 0) {
        acc[event.type] = (acc[event.type] || 0) + Number(event.amount);
        return acc;
      }
      
      // Caso contrário, tentar extrair do campo description
      const amountMatch = event.description && typeof event.description === 'string' 
        ? event.description.match(/- ([\d,\.]+)[€$£¥]/) 
        : null;
        
      if (amountMatch && amountMatch[1]) {
        const amount = parseFloat(amountMatch[1].replace(',', '.'));
        if (!isNaN(amount)) {
          acc[event.type] = (acc[event.type] || 0) + amount;
        }
      }
      return acc;
    }, {});
    
    // Calcular o saldo total (income - expense)
    const incomeTotal = totals.income || 0;
    const expenseTotal = totals.expense || 0;
    const balance = incomeTotal - expenseTotal;
    
    // Determinar a cor com base no saldo (positivo = verde, negativo = vermelho)
    const balanceColor = balance >= 0 ? '#4CAF50' : '#F44336';
    
    return (
      <View style={styles.eventSummaryContainer}>
        <Text style={styles.eventSummaryTitle}>Summary</Text>
        
        <View style={styles.eventSummaryContent}>
          {/* Mostrar income se existir */}
          {totals.income !== undefined && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Income:</Text>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                {totals.income.toFixed(2)}{userCurrency}
              </Text>
            </View>
          )}
          
          {/* Mostrar expense se existir */}
          {totals.expense !== undefined && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Expenses:</Text>
              <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                {totals.expense.toFixed(2)}{userCurrency}
              </Text>
            </View>
          )}
          
          {/* Sempre mostrar o saldo se houver income ou expense */}
          {(totals.income !== undefined || totals.expense !== undefined) && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Balance:</Text>
              <Text style={[styles.summaryValue, { color: balanceColor }]}>
                {balance.toFixed(2)}{userCurrency}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSimplifiedSummary = () => {
    if (!selectedEvents || selectedEvents.length === 0) return null;
    
    // Calculate totals by type
    const totals = selectedEvents.reduce((acc, event) => {
      // Se o evento tiver um valor fixo, usá-lo diretamente
      if (event.amount > 0) {
        acc[event.type] = (acc[event.type] || 0) + Number(event.amount);
        return acc;
      }
      
      // Caso contrário, tentar extrair do campo description
      const amountMatch = event.description && typeof event.description === 'string' 
        ? event.description.match(/- ([\d,\.]+)[€$£¥]/) 
        : null;
        
      if (amountMatch && amountMatch[1]) {
        const amount = parseFloat(amountMatch[1].replace(',', '.'));
        if (!isNaN(amount)) {
          acc[event.type] = (acc[event.type] || 0) + amount;
        }
      }
      return acc;
    }, {});
    
    // Calcular o saldo total (income - expense)
    const incomeTotal = totals.income || 0;
    const expenseTotal = totals.expense || 0;
    const balance = incomeTotal - expenseTotal;
    
    // Determinar a cor com base no saldo (positivo = verde, negativo = vermelho)
    const balanceColor = balance >= 0 ? '#4CAF50' : '#F44336';
    
    return (
      <View style={styles.mainEventSimplifiedSummaryContainer}>
        <Text style={styles.simplifiedSummaryText}>
          Balance: <Text style={{ color: balanceColor, fontWeight: 'bold' }}>
            {balance.toFixed(2)}{userCurrency}
          </Text>
        </Text>
      </View>
    );
  };

  const renderExistingRecordItem = ({ item }) => (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }}>
      <TouchableOpacity 
        style={styles.recordItem}
        onPress={() => {
          // Update max recurrence limit based on this record's frequency before adding
          if (isRecurring && item.frequencies) {
            const maxLimit = getMaxRecurrenceLimit(item.frequencies.days);
            setMaxRecurrenceAllowed(maxLimit);
            // Ensure current count doesn't exceed the limit
            if (recurrenceCount > maxLimit) {
              setRecurrenceCount(maxLimit);
            }
          }
          addExistingToCalendar(item, recordType);
        }}
      >
        {/* Nome do registro */}
        <Text style={styles.recordText}>
          {item.name}
        </Text>
        
        <View style={styles.recordInfoRow}>
          {/* Coluna esquerda: categoria e frequência */}
          <View style={styles.recordInfoColumn}>
            <Text style={styles.recordCategory}>
              {item.categories?.name || 'Other'}
            </Text>
            
            {/* Mostrar frequência se disponível */}
            {item.frequencies && (
              <Text style={styles.recordFrequency}>
                {getFrequencyDisplayName(item.frequencies.days)} ({item.frequencies.name || 'Custom'})
              </Text>
            )}
            {!item.frequencies && (
              <Text style={styles.recordFrequency}>
                One-time
              </Text>
            )}
          </View>
          
          {/* Valor à direita */}
          <Text style={[
            styles.recordAmount,
            { color: recordType === 'income' ? '#4CAF50' : '#F44336' }
          ]}>
            {Number(item.amount).toFixed(2)}{userCurrency}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderExistingRecordsList = () => {
    // First filter out records that are already assigned to the selected date
    const unassignedRecords = existingRecords.filter(record => {
      const eventKey = `${recordType}-${record.id}`;
      
      // Check if this record is already assigned to the selected date
      const isAlreadyAssigned = assignedRecords[selectedDate] && 
                                assignedRecords[selectedDate].has(eventKey);
      
      // Also check if there are any events in selectedEvents that match this record
      const isInSelectedEvents = selectedEvents.some(event => 
        event.type === recordType && event.event_id === record.id
      );
      
      return !isAlreadyAssigned && !isInSelectedEvents;
    });
    
    // Then filter based on search term
    const filteredRecords = searchTerm.length > 0 
      ? unassignedRecords.filter(record => 
          record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : unassignedRecords;

    return (
      <View style={styles.recordSelectorContainer}>
        {/* Header Section */}
        <View style={styles.recordSelectorHeader}>
          <Text style={styles.recordSelectorTitle}>
            Select {recordType.charAt(0).toUpperCase() + recordType.slice(1)} Item
          </Text>
        </View>

        {/* Search Input */}
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${recordType}...`}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        
        {/* Recurring Option */}
        <View style={styles.recurringOptionContainer}>
          <View style={styles.recurringCheckboxRow}>
            <Text style={styles.recurringLabel}>Make this recurring?</Text>
            <TouchableOpacity 
              style={[
                styles.checkbox, 
                isRecurring ? styles.checkboxChecked : {}
              ]}
              onPress={() => {
                setIsRecurring(!isRecurring);
                if (!isRecurring) {
                  // When enabling recurring, set default count based on first record's frequency
                  const firstRecord = existingRecords[0];
                  if (firstRecord && firstRecord.frequencies) {
                    const maxLimit = getMaxRecurrenceLimit(firstRecord.frequencies.days);
                    setMaxRecurrenceAllowed(maxLimit);
                    setRecurrenceCount(Math.min(2, maxLimit)); // Default to 2 occurrences
                  }
                }
              }}
            >
              {isRecurring && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </TouchableOpacity>
          </View>
          
          {isRecurring && (
            <View style={styles.compactRecurringContainer}>
              <View style={styles.recurrenceInputRow}>
                <Text style={styles.recurrenceInputLabel}>Occurrences:</Text>
                
                <View style={styles.recurrenceControlsContainer}>
                  <TouchableOpacity 
                    style={[styles.countButton, recurrenceCount <= 1 ? styles.countButtonDisabled : {}]}
                    onPress={() => setRecurrenceCount(Math.max(1, recurrenceCount - 1))}
                    disabled={recurrenceCount <= 1}
                  >
                    <Ionicons name="remove" size={16} color={recurrenceCount <= 1 ? "#ccc" : "#3F51B5"} />
                  </TouchableOpacity>
                  
                  <TextInput
                    style={[
                      styles.recurrenceInput,
                      recurrenceCount >= maxRecurrenceAllowed ? styles.recurrenceInputAtLimit : {}
                    ]}
                    value={recurrenceCount.toString()}
                    onChangeText={(text) => {
                      // Allow empty string temporarily for editing
                      if (text === '') {
                        return; // Don't update state, let user continue typing
                      }
                      
                      // Only allow numbers
                      const numericValue = text.replace(/[^0-9]/g, '');
                      if (numericValue === '') {
                        return;
                      }
                      
                      let count = parseInt(numericValue);
                      
                      // Ensure minimum of 1
                      if (count < 1) {
                        count = 1;
                      }
                      
                      // Cap at 30 maximum (universal limit)
                      if (count > 30) {
                        count = 30;
                      }
                      
                      // Also respect the frequency-based limit if it's lower than 30
                      if (count > maxRecurrenceAllowed) {
                        count = maxRecurrenceAllowed;
                      }
                      
                      setRecurrenceCount(count);
                    }}
                    onBlur={() => {
                      // Ensure we have a valid number when user finishes editing
                      if (recurrenceCount < 1 || isNaN(recurrenceCount)) {
                        setRecurrenceCount(1);
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                    placeholder="1"
                    selectTextOnFocus={true}
                  />
                  
                  <TouchableOpacity 
                    style={[styles.countButton, recurrenceCount >= maxRecurrenceAllowed ? styles.countButtonDisabled : {}]}
                    onPress={() => setRecurrenceCount(Math.min(maxRecurrenceAllowed, recurrenceCount + 1))}
                    disabled={recurrenceCount >= maxRecurrenceAllowed}
                  >
                    <Ionicons name="add" size={16} color={recurrenceCount >= maxRecurrenceAllowed ? "#ccc" : "#3F51B5"} />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.maxLimitText}>max {maxRecurrenceAllowed}</Text>
              </View>
              
              <Text style={styles.compactFrequencyNote}>
                Limits: Daily (30) • Weekly (26) • Monthly (12)
              </Text>
            </View>
          )}
        </View>

        {/* Records List or No Records */}
        <View style={{ flex: 1 }}>
          {filteredRecords.length > 0 ? (
            <FlatList
              data={filteredRecords}
              renderItem={renderExistingRecordItem}
              keyExtractor={item => item.id}
              style={styles.recordsList}
              contentContainerStyle={styles.recordsListContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            />
          ) : (
            <View style={styles.noRecordsContainer}>
              <Text style={styles.noRecordsText}>
                {loading ? 'Loading...' : 
                  existingRecords.length === 0 
                    ? `No ${recordType} items available`
                    : searchTerm 
                      ? `No ${recordType} items matching your search`
                      : `All ${recordType} items are already assigned to this date`}
              </Text>
              {!loading && (
                <TouchableOpacity
                  style={styles.createNewButton}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate(
                      recordType === 'income' ? 'IncomePage' : 'ExpensesPage'
                    );
                  }}
                >
                  <Text style={styles.createNewButtonText}>
                    Create New {recordType.charAt(0).toUpperCase() + recordType.slice(1)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setShowExistingRecords(false)}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Função renderEventItem atualizada para mostrar todas as informações solicitadas
  const renderEventItem = (event, key) => {
    // Usar o nome real do evento
    const displayText = getEventDisplayText(event);
    
    // Determinar o texto de recorrência
    const recurrenceText = event.is_recurring ? 'Recurring' : 'One-time';
    
    // Determinar a frequência a ser exibida
    let frequencyText = event.is_recurring ? 'Monthly' : 'One-time';
    if (event.frequencies && event.frequencies.name) {
      frequencyText = event.frequencies.name;
    }
    
    // Categoria (se disponível)
    const categoryText = event.category || 'Other';
    
    return (
      <View key={key} style={[
        styles.eventItem,
        { borderLeftWidth: 4, borderLeftColor: getEventColor(event.type) }
      ]}>
        <View style={styles.eventHeader}>
          <View style={styles.eventTypeContainer}>
            <View style={[styles.eventTypeIndicator, { backgroundColor: getEventColor(event.type) }]} />
            <Text style={styles.eventType}>
              {event.type.toUpperCase()} - {recurrenceText}
            </Text>
          </View>
          
          {/* Botão de delete */}
          <TouchableOpacity
            onPress={() => handleDeleteEvent(event.id)}
            style={styles.deleteButton}
          >
            <MaterialIcons name="delete" size={18} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.eventDetailsContainer}>
          {/* Nome do evento */}
          <Text style={styles.eventName}>{displayText}</Text>
          
          <View style={styles.eventInfoRow}>
            {/* Coluna esquerda: categoria e frequência */}
            <View style={styles.eventInfoColumn}>
              <Text style={styles.eventCategory}>{categoryText}</Text>
              <Text style={styles.eventFrequency}>{frequencyText}</Text>
            </View>
            
            {/* Valor à direita */}
            {event.amount > 0 && (
              <Text style={[
                styles.eventAmount,
                { color: event.type === 'income' ? '#4CAF50' : '#F44336' }
              ]}>
                {Number(event.amount).toFixed(2)}{userCurrency}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Função para mostrar eventos por tipo
  const showEventsByType = (type) => {
    // Verificar o mês atual sendo visualizado
    const year = currentViewMonth.getFullYear();
    const month = currentViewMonth.getMonth();
    
    // Filtrar todos os eventos do mês atual do tipo especificado
    const filteredEventsList = [];
    
    // Percorrer todos os dias do mês
    Object.keys(events).forEach(dateKey => {
      const eventDate = new Date(dateKey);
      // Verificar se a data está no mês atual
      if (eventDate.getMonth() === month && eventDate.getFullYear() === year) {
        // Filtrar eventos do tipo especificado
        const eventsOfType = events[dateKey]?.events?.filter(event => event.type === type) || [];
        // Adicionar à lista de eventos filtrados
        filteredEventsList.push(...eventsOfType);
      }
    });
    
    // Atualizar estados
    setFilteredEvents(filteredEventsList);
    setFilteredEventType(type);
    setShowFilteredEvents(true);
  };

  // Renderizar eventos filtrados por tipo
  const renderFilteredEvents = () => {
    // Nome do mês atual para o título
    const currentMonthName = currentViewMonth.toLocaleString('en-US', { month: 'long' });
    const currentYear = currentViewMonth.getFullYear();
    
    // Calcular totais e ordenar eventos por data
    const totalAmount = filteredEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0);
    const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return (
      <View style={styles.filteredEventsContainer}>
        <View style={styles.filteredEventsHeader}>
          <View>
            <Text style={styles.filteredEventsTitle}>
              {filteredEventType.charAt(0).toUpperCase() + filteredEventType.slice(1)} Events
            </Text>
            <Text style={styles.filteredEventsSubtitle}>
              {currentMonthName} {currentYear}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.closeFilterButton}
            onPress={() => setShowFilteredEvents(false)}
          >
            <Ionicons name="close" size={24} color="#555555" />
          </TouchableOpacity>
        </View>
        
        {/* Summary section for total amount */}
        {filteredEvents.length > 0 && (
          <View style={styles.simplifiedSummaryContainer}>
            <Text style={styles.simplifiedSummaryText}>
              Total: <Text style={{ 
                fontWeight: 'bold', 
                color: filteredEventType === 'income' ? '#4CAF50' : '#F44336' 
              }}>
                {totalAmount.toFixed(2)}{userCurrency}
              </Text>
              <Text style={{fontSize: 14, color: '#757575'}}> • {filteredEvents.length} events</Text>
            </Text>
          </View>
        )}
        
        {filteredEvents.length > 0 ? (
          <FlatList
            data={sortedEvents}
            renderItem={({item}) => {
              const displayText = getEventDisplayText(item);
              const eventDate = new Date(item.date);
              const day = eventDate.getDate();
              const month = eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
              
              return (
                <View style={[
                  styles.filteredEventItem,
                  { borderLeftColor: getEventColor(item.type) }
                ]}>
                  <View style={styles.filteredEventContent}>
                    <View style={styles.filteredEventTypeContainer}>
                      <View 
                        style={[styles.filteredEventDot, { backgroundColor: getEventColor(item.type) }]} 
                      />
                      <Text style={styles.filteredEventTypeText}>
                        {item.type.toUpperCase()}
                      </Text>
                      
                      {/* Date badge */}
                      <View style={{
                        backgroundColor: '#F0F2FF', 
                        borderRadius: 10,
                        paddingVertical: 1,
                        paddingHorizontal: 5,
                        marginLeft: 6
                      }}>
                        <Text style={{fontSize: 10, color: '#333', fontWeight: '500'}}>
                          {day} {month}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.filteredEventName}>{displayText}</Text>
                    
                    {/* Display category if available */}
                    {item.category && (
                      <Text style={{
                        fontSize: 11,
                        color: '#666',
                        marginBottom: 4,
                      }}>
                        Category: {item.category}
                      </Text>
                    )}
                    
                    <View style={styles.filteredEventMetadataRow}>
                      <Text style={[
                        styles.filteredEventRecurring,
                        item.is_recurring ? styles.recurringText : styles.oneTimeText
                      ]}>
                        {item.is_recurring ? 'Recurring' : 'One-time'}
                      </Text>
                      
                      {/* Mostrar valor se disponível */}
                      {item.amount > 0 && (
                        <Text style={[
                          styles.filteredEventAmount,
                          { color: item.type === 'income' ? '#4CAF50' : '#F44336' }
                        ]}>
                          {Number(item.amount).toFixed(2)}{userCurrency}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.deleteButtonFiltered}
                    onPress={() => handleDeleteEvent(item.id)}
                  >
                    <MaterialIcons name="delete" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              );
            }}
            keyExtractor={item => `${item.id}-${item.date}`}
            contentContainerStyle={styles.filteredEventsListContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.noEventsContainer}>
            <FontAwesome5 name="calendar-day" size={40} color="#CCCCCC" />
            <Text style={styles.noEventsText}>No {filteredEventType} events in {currentMonthName}</Text>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setShowFilteredEvents(false)}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Atualizar renderização de upcoming events
  const renderMonthlyStats = () => {
    // Usar o mês atual visualizado no calendário
    const currentMonthName = currentViewMonth.toLocaleString('en-US', { month: 'long' });
    const currentMonthYear = currentViewMonth.getFullYear();
    
    // Upcoming events já são filtrados corretamente na função fetchEvents
    // usando o mês visualizado como base, então não precisamos filtrar novamente
    
    return (
      <View style={styles.monthlyStatsContainer}>
        <Text style={styles.monthlyStatsTitle}>{currentMonthName} {currentMonthYear} Overview</Text>
        <View style={styles.statsCards}>
          <TouchableOpacity 
            style={[styles.statsCard, { backgroundColor: '#E8F5E9' }]}
            onPress={() => showEventsByType('income')}
          >
            <MaterialIcons name="arrow-upward" size={24} color="#4CAF50" />
            <Text style={styles.statsLabel}>Income Events</Text>
            <Text style={[styles.statsValue, { color: '#4CAF50' }]}>{eventCounts.income}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statsCard, { backgroundColor: '#FFEBEE' }]}
            onPress={() => showEventsByType('expense')}
          >
            <MaterialIcons name="arrow-downward" size={24} color="#F44336" />
            <Text style={styles.statsLabel}>Expense Events</Text>
            <Text style={[styles.statsValue, { color: '#F44336' }]}>{eventCounts.expense}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statsCard, { backgroundColor: '#E3F2FD' }]}
            onPress={() => showEventsByType('goal')}
          >
            <MaterialIcons name="flag" size={24} color="#2196F3" />
            <Text style={styles.statsLabel}>Goals</Text>
            <Text style={[styles.statsValue, { color: '#2196F3' }]}>{eventCounts.goal}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.upcomingContainer}>
          <Text style={styles.upcomingTitle}>Upcoming Events</Text>
          
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event, index) => {
              // Usar o nome real do evento
              const displayText = getEventDisplayText(event);
              
              const eventDate = new Date(event.date);
              const day = eventDate.getDate();
              const month = eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
              
              return (
                <View key={`upcoming-${event.id}-${event.date}`} style={styles.upcomingEvent}>
                  <View style={styles.upcomingDate}>
                    <Text style={styles.upcomingDay}>{day}</Text>
                    <Text style={styles.upcomingMonth}>{month}</Text>
                  </View>
                  <View style={styles.upcomingDetail}>
                    <Text style={styles.upcomingName}>{displayText}</Text>
                    <View style={styles.upcomingMetadata}>
                      <Text style={styles.upcomingRecurring}>
                        {event.is_recurring ? 'Recurring' : 'One-time'}
                      </Text>
                      {event.amount > 0 && (
                        <Text
                          style={[
                            styles.upcomingAmount,
                            { color: event.type === 'income' ? '#4CAF50' : '#F44336' }
                          ]}
                        >
                          {Number(event.amount).toFixed(2)}{userCurrency}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.noUpcomingEvents}>
              <Text style={styles.noUpcomingText}>No upcoming events for {currentMonthName} and the following month</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Adicionar useEffect para buscar a moeda do usuário
  useEffect(() => {
    const fetchUserCurrency = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user currency preferences from correct table
        const { data, error } = await supabase
          .from('user_currency_preferences')
          .select('actual_currency')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar moeda do usuário:', error);
          return; // Manter o símbolo € como padrão em caso de erro
        }
        
        if (data && data.actual_currency) {
          setUserCurrency(data.actual_currency);
        }
      } catch (error) {
        console.error('Error fetching user currency:', error);
      }
    };

    fetchUserCurrency();
  }, []);

  return (
    <View style={styles.mainContainer}>
      <Header title="Calendar" />
      <AlertComponent />
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3F51B5" />
        </View>
      )}
      
      {/* Exibir eventos filtrados quando o usuário clicar em um card */}
      {showFilteredEvents && renderFilteredEvents()}
      
      <ScrollView style={styles.container}>
        <Animated.View 
          style={[
            styles.calendarContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Calendar
            onDayPress={onDayPress}
            markedDates={events}
            markingType="multi-dot"
            minDate={currentDate}
            disableAllTouchEventsForDisabledDays={true}
            onMonthChange={(month) => {
              // Quando o mês é alterado no calendário, buscar eventos para esse mês
              fetchEvents(month.dateString);
            }}
            theme={{
              calendarBackground: '#FFFFFF',
              textSectionTitleColor: '#333333',
              selectedDayBackgroundColor: '#3F51B5',
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: '#3F51B5',
              dayTextColor: '#222222',
              textDisabledColor: '#BBBBBB',
              dotColor: '#3F51B5',
              selectedDotColor: '#FFFFFF',
              arrowColor: '#3F51B5',
              monthTextColor: '#333333',
              textMonthFontWeight: 'bold',
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 14,
              'stylesheet.day.basic': {
                disabledText: {
                  color: '#d9e1e8',
                  fontWeight: '300',
                  opacity: 0.4,
                }
              }
            }}
          />
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          {renderLegend()}
          {renderMonthlyStats()}
        </Animated.View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={showExistingRecords ? styles.modalContent : styles.mainEventModalContent}>
                {showExistingRecords ? (
                  renderExistingRecordsList()
                ) : (
                <>
                  <View style={styles.mainEventModalHeader}>
                    <Text style={styles.modalTitle}>
                      {new Date(selectedDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                    {selectedDate === currentDate && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayText}>Today</Text>
                      </View>
                    )}
                  </View>
                  
                  {renderSimplifiedSummary()}
                  
                  {selectedEvents.length > 0 ? (
                    <ScrollView 
                      style={styles.mainEventListContainer}
                      contentContainerStyle={styles.mainEventListContent}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {selectedEvents.map((event) => renderEventItem(event, `event-${event.id}-${event.date}`))}
                    </ScrollView>
                  ) : (
                    <View style={styles.mainEventNoEventsContainer}>
                      <FontAwesome5 name="calendar-day" size={40} color="#CCCCCC" />
                      <Text style={styles.noEventsText}>No events for this date</Text>
                    </View>
                  )}

                  <View style={styles.mainEventAddButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.mainEventAddButton, { backgroundColor: '#4CAF50' }]}
                      onPress={() => openExistingRecordSelector('income')}
                    >
                      <MaterialIcons name="add" size={20} color="white" />
                      <Text style={styles.addButtonText}>Add Income</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.mainEventAddButton, { backgroundColor: '#F44336' }]}
                      onPress={() => openExistingRecordSelector('expense')}
                    >
                      <MaterialIcons name="add" size={20} color="white" />
                      <Text style={styles.addButtonText}>Add Expense</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.mainEventCloseButton}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={deleteModalVisible}
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalContent}>
              <View style={styles.deleteModalHeader}>
                <MaterialIcons name="delete-forever" size={32} color="#F44336" />
                <Text style={styles.deleteModalTitle}>
                  {isRecurringDelete ? 'Delete Recurring Event' : 'Delete Event'}
                </Text>
              </View>
              
              <Text style={styles.deleteModalMessage}>
                {isRecurringDelete 
                  ? 'This event repeats. What would you like to delete?'
                  : 'Are you sure you want to remove this event from the calendar?'}
              </Text>
              
              {isRecurringDelete ? (
                <View style={styles.deleteModalButtonsContainer}>
                  <TouchableOpacity
                    style={styles.deleteModalAllOccurrencesButton}
                    onPress={async () => {
                      setDeleteModalVisible(false);
                      setLoading(true);
                      try {
                        await deleteAllRecurringEvents(eventToDelete, eventToDelete.id);
                        showSuccess('All occurrences have been removed');
                      } catch (error) {
                        console.error('Error deleting all occurrences:', error);
                        showError('Failed to delete all occurrences');
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <Text style={styles.deleteModalButtonTextDanger}>ALL OCCURRENCES</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteModalSingleOccurrenceButton}
                    onPress={async () => {
                      setDeleteModalVisible(false);
                      setLoading(true);
                      try {
                        await deleteCurrentEvent(eventToDelete, eventToDelete.id);
                        showSuccess('This occurrence has been removed');
                      } catch (error) {
                        console.error('Error deleting single occurrence:', error);
                        showError('Failed to delete this occurrence');
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <Text style={styles.deleteModalButtonTextPrimary}>JUST THIS OCCURRENCE</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteModalCancelButton}
                    onPress={() => setDeleteModalVisible(false)}
                  >
                    <Text style={styles.deleteModalButtonTextCancel}>CANCEL</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.deleteModalButtonsContainer}>
                  <TouchableOpacity
                    style={styles.deleteModalDeleteButton}
                    onPress={async () => {
                      setDeleteModalVisible(false);
                      setLoading(true);
                      try {
                        await deleteCurrentEvent(eventToDelete, eventToDelete.id);
                        showSuccess('Event removed from calendar');
                      } catch (error) {
                        console.error('Error deleting event:', error);
                        showError('Failed to delete event');
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <Text style={styles.deleteModalButtonTextDanger}>DELETE</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteModalCancelButton}
                    onPress={() => setDeleteModalVisible(false)}
                  >
                    <Text style={styles.deleteModalButtonTextCancel}>CANCEL</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

export default CalendarPage; 