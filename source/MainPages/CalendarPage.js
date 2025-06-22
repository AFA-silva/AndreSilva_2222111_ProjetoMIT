import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Text, Modal, ScrollView, TextInput, ActivityIndicator, Alert, FlatList, Animated, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../../Supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, Ionicons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import styles from '../Styles/MainPageStyles/CalendarPageStyle';
import Header from '../Utility/Header';

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
  
  // State for showing filtered events
  const [showFilteredEvents, setShowFilteredEvents] = useState(false);
  const [filteredEventType, setFilteredEventType] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);
  
  // User currency
  const [userCurrency, setUserCurrency] = useState('€');
  
  // State for record type
  const [currentViewMonth, setCurrentViewMonth] = useState(new Date());
  
  const navigation = useNavigation();

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

  // Helper function to generate recurring dates based on frequency
  const generateRecurringDates = (startDateStr, endDateStr, frequencyInfo) => {
    const dates = [];
    const startDate = new Date(startDateStr);
    const endDate = endDateStr ? new Date(endDateStr) : null;
    
    // Default to monthly if no frequency info
    let frequencyDays = 30;
    
    // If we have frequency info with days, use that
    if (frequencyInfo && frequencyInfo.days) {
      frequencyDays = frequencyInfo.days;
    }
    
    let currentDate = new Date(startDate);
    
    // Add the start date
    dates.push(startDate.toISOString().split('T')[0]);
    
    // If no end date or invalid end date, return just the start date
    if (!endDate) return dates;
    
    // Generate all dates between start and end based on frequency
    while (true) {
      // Advance to the next date based on frequency
      if (frequencyDays === 30 || frequencyDays === 31) {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (frequencyDays === 7) {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (frequencyDays === 14) {
        currentDate.setDate(currentDate.getDate() + 14);
      } else if (frequencyDays === 90) {
        currentDate.setMonth(currentDate.getMonth() + 3);
      } else if (frequencyDays === 180) {
        currentDate.setMonth(currentDate.getMonth() + 6);
      } else if (frequencyDays === 365) {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      } else {
        // Default to monthly
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      // Check if we've gone beyond the end date
      if (currentDate > endDate) break;
      
      // Add the date to our list
      dates.push(currentDate.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const fetchEvents = async (selectedMonth = null) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Inicializar a data atual ou usar o mês selecionado se fornecido
      const now = selectedMonth ? new Date(selectedMonth) : new Date();
      
      // Buscar eventos básicos do calendário
      const { data: calendarEvents, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          type,
          date,
          is_recurring,
          event_id,
          end_date
        `)
        .eq('user_id', user.id);

      if (error) throw error;

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

      console.log('Income IDs:', incomeIds);
      console.log('Expense IDs:', expenseIds);

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
          console.log('Income data:', incomeData);
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
          console.log('Expense data:', expenseData);
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
          console.log('Goal data:', goalData);
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
        // Lista de datas para processar
        let datesToProcess = [];
        
        // Se for recorrente e tem data final, gerar as datas intermediárias usando a frequência do evento vinculado
        if (event.is_recurring && event.end_date) {
          let eventDetails = null;
          
          // Obter os detalhes do evento para acessar as informações de frequência
          if (event.type === 'income') {
            eventDetails = incomeDetails[event.event_id];
          } else if (event.type === 'expense') {
            eventDetails = expenseDetails[event.event_id];
          } else if (event.type === 'goal') {
            eventDetails = goalDetails[event.event_id];
          }
          
          // Se tivermos detalhes e frequência, usar para gerar as datas
          if (eventDetails && eventDetails.frequencies) {
            datesToProcess = generateRecurringDates(event.date, event.end_date, eventDetails.frequencies);
            console.log(`Evento recorrente ${event.id}: geradas ${datesToProcess.length} datas entre ${event.date} e ${event.end_date}`);
          } else {
            // Se não temos informações de frequência, usar apenas a data original
            datesToProcess = [event.date];
          }
        } else {
          // Evento não recorrente - usar apenas a data original
          datesToProcess = [event.date];
        }
        
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
        
        // Processar cada data gerada para este evento
        datesToProcess.forEach(dateStr => {
          const eventDate = new Date(dateStr);
          
          // Verificar se esta data está dentro do intervalo visualizado ou próximo mês
          const isInCurrentViewPeriod = 
            (eventDate >= viewMonthStart && eventDate <= nextMonthLastDay);
          
          if (!isInCurrentViewPeriod) return; // Pular datas fora do período relevante
          
          const date = dateStr;
          
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
            // Criar cópia do evento para esta data específica
            const eventCopy = {
              ...event,
              date: dateStr,
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
          
          // Criar cópia do evento para esta data específica
          const eventForDate = {
            ...event,
            date: dateStr
          };
          
          // Push event to the date's events array
          markedDates[date].events.push(eventForDate);
        });
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
      if (isWeb) {
        alert('Failed to load calendar events');
      } else {
        Alert.alert('Error', 'Failed to load calendar events');
      }
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
        // Query para tabela income com colunas corretas
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
        // Query para tabela expenses
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
        // Query para tabela goals
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
      
      console.log(`Registros de ${type} encontrados:`, data);
      
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
      
      console.log('IDs já associados:', Array.from(alreadyAssignedIds));
      
      // Filtrar registros que não estão associados
      const filteredData = data.filter(item => !alreadyAssignedIds.has(item.id.toString()));
      
      // Formatar os dados para exibição
      const formattedData = filteredData.map(item => ({
        ...item,
        displayText: `${item.name} - ${item.categories?.name || 'No category'} - ${Number(item.amount).toFixed(2)}${userCurrency}`
      }));

      setExistingRecords(formattedData);
      animateRecordLoad();
    } catch (error) {
      console.error(`Error fetching ${recordType}:`, error);
      Alert.alert('Error', `Failed to load ${recordType} records`);
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

  const openExistingRecordSelector = (type) => {
    setRecordType(type);
    setSearchTerm('');
    // Clear existing records immediately to avoid showing old data
    setExistingRecords([]);
    // Set loading to true immediately
    setLoading(true);
    // Fetch new records
    fetchExistingRecords(type);
    setShowExistingRecords(true);
  };

  const addExistingToCalendar = async (record) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar se este registro já está atribuído à data selecionada
      const eventKey = `${recordType}-${record.id}`;
      if (assignedRecords[selectedDate] && assignedRecords[selectedDate].has(eventKey)) {
        Alert.alert('Duplicate Event', 'This record is already added to this date');
        setLoading(false);
        return;
      }

      // Log para debug
      console.log('Adicionando ao calendário:', {
        recordType,
        recordId: record.id,
        date: selectedDate,
        name: record.name,
        amount: record.amount,
        isRecurring,
        frequency: record.frequencies?.name
      });

      // Array para armazenar todos os eventos a serem criados
      const eventsToCreate = [];
      
      // Se for recorrente, criar apenas o primeiro e o último evento da série
      if (isRecurring) {
        // Determinar a frequência em dias
        // Definir datas de início e fim (12 meses à frente)
        const startDate = new Date(selectedDate);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 12);
        
        console.log(`Criando evento recorrente de ${startDate.toISOString()} até ${endDate.toISOString()}`);
        
        // Com o novo modelo, criamos apenas um evento com data de início e fim
        eventsToCreate.push({
          user_id: user.id,
          type: recordType,
          date: startDate.toISOString().split('T')[0],
          event_id: record.id,
          is_recurring: true,
          end_date: endDate.toISOString().split('T')[0]
        });
        
        console.log(`Total de ${eventsToCreate.length} eventos recorrentes criados`);
      } else {
        // Evento único (não recorrente)
        eventsToCreate.push({
          user_id: user.id,
          type: recordType,
          date: selectedDate,
          event_id: record.id,
          is_recurring: false
        });
      }

      // Inserir todos os eventos no banco de dados
      const { error, data: newEvents } = await supabase
        .from('calendar_events')
        .insert(eventsToCreate)
        .select();

      if (error) throw error;
      
      console.log('Eventos adicionados com sucesso:', newEvents);
      
      // Update the assigned records tracking para o evento atual
      const updatedAssigned = {...assignedRecords};
      if (!updatedAssigned[selectedDate]) {
        updatedAssigned[selectedDate] = new Set();
      }
      updatedAssigned[selectedDate].add(eventKey);
      setAssignedRecords(updatedAssigned);
      
      // Remove the added record from the existing records list
      setExistingRecords(prev => prev.filter(item => item.id !== record.id));
      
      // Refresh events
      await fetchEvents();
      
      // Update the selectedEvents array with the newly fetched data for this date
      setSelectedEvents(events[selectedDate]?.events || []);
      
      // Close the record selector and go back to the event list
      setShowExistingRecords(false);
      
      // Resetar o estado isRecurring
      setIsRecurring(false);

      // Mostrar mensagem de sucesso com informação de recorrência
      const successMessage = isRecurring 
        ? `Recurring ${recordType} added to calendar (for the next 12 months)` 
        : `${recordType.charAt(0).toUpperCase() + recordType.slice(1)} added to calendar`;
      
      Alert.alert('Success', successMessage);
    } catch (error) {
      console.error('Error adding to calendar:', error);
      Alert.alert('Error', 'Failed to add record to calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    console.log("Deletando evento com ID:", eventId);
    try {
      setLoading(true);
      
      // Primeiro encontrar o evento nos eventos selecionados
      const eventToDelete = selectedEvents.find(event => event.id === eventId) || 
                            filteredEvents.find(event => event.id === eventId);
      
      if (!eventToDelete) {
        console.error('Could not find event with ID:', eventId);
        Alert.alert('Error', 'Could not find the event to delete');
        setLoading(false);
        return;
      }
      
      console.log("Evento encontrado para deleção:", eventToDelete);
      
      // Se o evento for recorrente, perguntar se deseja excluir todas as ocorrências
      if (eventToDelete.is_recurring && eventToDelete.event_id) {
        // No ambiente web, usar confirm
        if (isWeb) {
          const deleteAll = confirm('This is a recurring event. Do you want to delete all future occurrences?');
          
          if (deleteAll) {
            const eventDate = new Date(eventToDelete.date);
            
            // Deletar apenas o evento atual e os futuros com o mesmo record_id
            const { error } = await supabase
              .from('calendar_events')
              .update({ end_date: new Date(eventDate.getTime() - 86400000).toISOString().split('T')[0] })
              .eq('event_id', eventToDelete.event_id)
              .eq('type', eventToDelete.type)
              .eq('is_recurring', true);
            
            if (error) {
              console.error('Erro ao deletar eventos recorrentes:', error);
              throw error;
            }
            
            console.log("Todas as ocorrências futuras excluídas com sucesso");
            
            // Atualizar todos os eventos
            await fetchEvents();
            
            // Atualizar os eventos selecionados
            setSelectedEvents(events[selectedDate]?.events || []);
            
            alert('All future occurrences of this event have been deleted');
            return;
          }
        } else {
          // No ambiente mobile, usar Alert
          return new Promise((resolve) => {
            Alert.alert(
              'Recurring Event',
              'Do you want to delete just this occurrence or all future occurrences?',
              [
                {
                  text: 'Just this one',
                  onPress: async () => {
                    await deleteCurrentEvent(eventToDelete, eventId);
                    resolve();
                  }
                },
                {
                  text: 'All future occurrences',
                  onPress: async () => {
                    try {
                      const eventDate = new Date(eventToDelete.date);
                      
                      // Deletar apenas o evento atual e os futuros com o mesmo record_id
                      const { error } = await supabase
                        .from('calendar_events')
                        .update({ end_date: new Date(eventDate.getTime() - 86400000).toISOString().split('T')[0] })
                        .eq('event_id', eventToDelete.event_id)
                        .eq('type', eventToDelete.type)
                        .eq('is_recurring', true);
                      
                      if (error) {
                        console.error('Erro ao deletar eventos recorrentes:', error);
                        throw error;
                      }
                      
                      console.log("Todas as ocorrências futuras excluídas com sucesso");
                      
                      // Atualizar todos os eventos
                      await fetchEvents();
                      
                      // Atualizar os eventos selecionados
                      setSelectedEvents(events[selectedDate]?.events || []);
                      
                      Alert.alert('Success', 'All future occurrences of this event have been deleted');
                      resolve();
                    } catch (error) {
                      console.error('Error deleting recurring events:', error);
                      Alert.alert('Error', 'Failed to delete future occurrences');
                      resolve();
                    }
                  },
                  style: 'destructive'
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => resolve()
                }
              ]
            );
          });
        }
      }
      
      // Para eventos não recorrentes ou se o usuário escolheu excluir apenas a ocorrência atual
      await deleteCurrentEvent(eventToDelete, eventId);
      
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar para excluir apenas o evento atual
  const deleteCurrentEvent = async (eventToDelete, eventId) => {
    try {
      // Deletar do Supabase
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);
      
      if (error) {
        console.error('Erro ao deletar evento:', error);
        throw error;
      }
      
      console.log("Evento deletado com sucesso do banco de dados");
      
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
      
      // Atualizar o rastreamento de registros atribuídos
      const eventDate = new Date(eventToDelete.date).toISOString().split('T')[0];
      if (assignedRecords[eventDate]) {
        const updatedAssigned = {...assignedRecords};
        const eventKey = `${eventToDelete.type}-${eventToDelete.event_id}`;
        updatedAssigned[eventDate].delete(eventKey);
        setAssignedRecords(updatedAssigned);
        
        console.log(`Removido evento ${eventKey} da data ${eventDate}`);
      }
      
      // Atualizar os eventos do calendário
      await fetchEvents();
      
      Alert.alert('Success', 'Event removed from calendar');
    } catch (error) {
      console.error('Error in deleteCurrentEvent:', error);
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
      <View style={styles.simplifiedSummaryContainer}>
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
        onPress={() => addExistingToCalendar(item)}
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
                {item.frequencies.name || 'Monthly'}
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
    // Filter records based on search term
    const filteredRecords = searchTerm.length > 0 
      ? existingRecords.filter(record => 
          record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : existingRecords;

    return (
      <View style={styles.recordSelectorContainer}>
        <View style={styles.recordSelectorHeader}>
          <Text style={styles.recordSelectorTitle}>
            Select {recordType.charAt(0).toUpperCase() + recordType.slice(1)}
          </Text>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${recordType}...`}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        
        {/* Opção para tornar o evento recorrente */}
        <View style={styles.recurringOptionContainer}>
          <View style={styles.recurringCheckboxRow}>
            <Text style={styles.recurringLabel}>Make this a recurring event?</Text>
            <TouchableOpacity 
              style={[
                styles.checkbox, 
                isRecurring ? styles.checkboxChecked : {}
              ]}
              onPress={() => setIsRecurring(!isRecurring)}
            >
              {isRecurring && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </TouchableOpacity>
          </View>
          {isRecurring && (
            <Text style={styles.frequencyNote}>
              This will be added as a recurring event based on the record's frequency
            </Text>
          )}
        </View>

        {existingRecords.length > 0 ? (
          <FlatList
            data={filteredRecords}
            renderItem={renderExistingRecordItem}
            keyExtractor={item => item.id}
            style={styles.recordsList}
            contentContainerStyle={styles.recordsListContent}
          />
        ) : (
          <View style={styles.noRecordsContainer}>
            <Text style={styles.noRecordsText}>
              {loading ? 'Loading...' : 
                `No ${recordType} records${searchTerm ? ' matching your search' : ''}`}
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

  // Adicionar um helper para verificar se está sendo executado na web
  const isWeb = Platform.OS === 'web';

  // Função renderEventItem atualizada para mostrar todas as informações solicitadas
  const renderEventItem = (event, index) => {
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
      <View key={index} style={[
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
          
          {/* Botão de delete adaptado para web/mobile */}
          {isWeb ? (
            <TouchableOpacity
              onPress={() => {
                if (confirm('Are you sure you want to remove this event from the calendar?')) {
                  handleDeleteEvent(event.id);
                }
              }}
              style={styles.webDeleteButton}
              activeOpacity={0.7}
            >
              <Text style={styles.webDeleteButtonText}>Delete</Text>
              <MaterialIcons name="delete" size={16} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Delete Event',
                  'Are you sure you want to remove this event from the calendar?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', onPress: () => handleDeleteEvent(event.id), style: 'destructive' }
                  ]
                );
              }}
              style={styles.deleteButton}
            >
              <MaterialIcons name="delete" size={18} color="#F44336" />
            </TouchableOpacity>
          )}
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
    console.log(`Mostrando eventos do tipo: ${type}`);
    
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
    
    console.log(`${filteredEventsList.length} eventos encontrados`);
    
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
              const month = eventDate.toLocaleString('en-US', { month: 'short' });
              
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
                    onPress={() => {
                      const eventId = item.id;
                      if (!eventId) return;
                      
                      if (isWeb) {
                        if (confirm('Are you sure you want to remove this event from the calendar?')) {
                          handleDeleteEvent(eventId);
                        }
                      } else {
                        Alert.alert(
                          'Delete Event',
                          'Are you sure you want to remove this event from the calendar?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Delete', 
                              onPress: () => handleDeleteEvent(eventId),
                              style: 'destructive'
                            }
                          ]
                        );
                      }
                    }}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                    <MaterialIcons name="delete" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              );
            }}
            keyExtractor={item => item.id}
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
              
              // Log para debug
              console.log('Upcoming event:', { 
                displayText, 
                amount: event.amount,
                date: event.date
              });
              
              return (
                <View key={index} style={styles.upcomingEvent}>
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

        // Buscar preferências de moeda do usuário da tabela correta
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
          console.log('Moeda do usuário encontrada:', data.actual_currency);
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
              console.log('Month changed to:', month.dateString);
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
            <View style={styles.modalContent}>
              {showExistingRecords ? (
                renderExistingRecordsList()
              ) : (
                <>
                  <View style={styles.modalHeader}>
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
                    <View style={styles.eventListContainer}>
                      {selectedEvents.map((event, index) => renderEventItem(event, index))}
                    </View>
                  ) : (
                    <View style={styles.noEventsContainer}>
                      <FontAwesome5 name="calendar-day" size={40} color="#CCCCCC" />
                      <Text style={styles.noEventsText}>No events for this date</Text>
                    </View>
                  )}

                  <View style={styles.addButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.addButton, { backgroundColor: '#4CAF50' }]}
                      onPress={() => openExistingRecordSelector('income')}
                    >
                      <MaterialIcons name="add" size={20} color="white" />
                      <Text style={styles.addButtonText}>Add Income</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.addButton, { backgroundColor: '#F44336' }]}
                      onPress={() => openExistingRecordSelector('expense')}
                    >
                      <MaterialIcons name="add" size={20} color="white" />
                      <Text style={styles.addButtonText}>Add Expense</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.closeButton}
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
      </ScrollView>
    </View>
  );
};

export default CalendarPage; 