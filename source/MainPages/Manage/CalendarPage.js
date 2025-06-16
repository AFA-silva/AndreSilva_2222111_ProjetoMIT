import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Modal, ScrollView, TextInput, ActivityIndicator, Alert, FlatList, Animated } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../../../Supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, Ionicons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import styles from '../../Styles/MainPageStyles/CalendarPageStyle';
import Header from '../../Utility/Header';

const CalendarPage = () => {
  // States for calendar and events
  const [events, setEvents] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState([]);
  
  // States for record selection
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

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: calendarEvents, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          type,
          description,
          date,
          category_id
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Process calendar events
      const markedDates = {};
      const assignedRecordsMap = {};
      let upcomingEventsList = [];
      
      // Get counts for current month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Initialize counters
      let incomeCount = 0;
      let expenseCount = 0;
      let goalCount = 0;
      
      calendarEvents?.forEach(event => {
        const eventDate = new Date(event.date);
        const date = eventDate.toISOString().split('T')[0];
        
        // Track assigned records by description and date
        if (!assignedRecordsMap[date]) {
          assignedRecordsMap[date] = new Set();
        }
        assignedRecordsMap[date].add(event.description);
        
        // Count events for current month
        if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
          if (event.type === 'income') incomeCount++;
          else if (event.type === 'expense') expenseCount++;
          else if (event.type === 'goal') goalCount++;
        }
        
        // Collect upcoming events (future events)
        if (eventDate > now && eventDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
          upcomingEventsList.push({
            ...event,
            formattedDate: eventDate
          });
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
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to load calendar events');
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
            frequencies(name, days),
            categories:category_id(name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        data = response.data;
        error = response.error;
      } else {
        // Query for expenses table
        const response = await supabase
          .from('expenses')
          .select(`
            id,
            name,
            amount,
            category_id,
            categories:category_id(name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        data = response.data;
        error = response.error;
      }

      if (error) throw error;
      
      // Filter out records that are already assigned to the selected date based on description
      const alreadyAssignedDesc = assignedRecords[selectedDate] || new Set();
      const filteredData = data.filter(item => {
        const formattedAmount = Number(item.amount).toFixed(2);
        const description = `${item.name} - ${formattedAmount}€`;
        return !alreadyAssignedDesc.has(description);
      });
      
      // Format the data to display name/description and amount with 2 decimal places
      const formattedData = filteredData.map(item => ({
        ...item,
        // Use name for both income and expense based on actual DB schema
        displayText: `${item.name} - ${item.categories?.name || 'No category'} - ${Number(item.amount).toFixed(2)}€`
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

      // Format amount to 2 decimal places
      const formattedAmount = Number(record.amount).toFixed(2);
      const description = `${record.name} - ${formattedAmount}€`;
      
      // Check if this event already exists on the selected date to prevent duplicates
      if (assignedRecords[selectedDate] && assignedRecords[selectedDate].has(description)) {
        Alert.alert('Duplicate Event', 'This record is already added to this date');
        setLoading(false);
        return;
      }

      // Create calendar event from the selected record
      const { error, data: newEvent } = await supabase
        .from('calendar_events')
        .insert([{
          user_id: user.id,
          type: recordType,
          description: description,
          date: selectedDate,
          category_id: record.category_id
        }])
        .select();

      if (error) throw error;
      
      // Update the assigned records tracking
      const updatedAssigned = {...assignedRecords};
      if (!updatedAssigned[selectedDate]) {
        updatedAssigned[selectedDate] = new Set();
      }
      updatedAssigned[selectedDate].add(description);
      setAssignedRecords(updatedAssigned);
      
      // Remove the added record from the existing records list
      setExistingRecords(prev => prev.filter(item => item.id !== record.id));
      
      // Refresh events
      await fetchEvents();
      
      // Update the selectedEvents array with the newly fetched data for this date
      setSelectedEvents(events[selectedDate]?.events || []);
      
      // Close the record selector and go back to the event list
      setShowExistingRecords(false);

      Alert.alert('Success', `${recordType.charAt(0).toUpperCase() + recordType.slice(1)} added to calendar`);
    } catch (error) {
      console.error('Error adding to calendar:', error);
      Alert.alert('Error', 'Failed to add record to calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    console.log("Deleting event with ID:", eventId);
    try {
      setLoading(true);
      
      // First find the event in the selectedEvents
      const eventToDelete = selectedEvents.find(event => event.id === eventId);
      
      if (!eventToDelete) {
        console.error('Could not find event with ID:', eventId);
        Alert.alert('Error', 'Could not find the event to delete');
        setLoading(false);
        return;
      }
      
      console.log("Found event to delete:", eventToDelete);
      
      // Delete from Supabase
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);
      
      if (error) {
        console.error('Database error during deletion:', error);
        throw error;
      }
      
      console.log("Successfully deleted from database");
      
      // Update local state to remove the event
      setSelectedEvents(currentEvents => 
        currentEvents.filter(event => event.id !== eventId)
      );
      
      // Update the assigned records tracking
      if (assignedRecords[selectedDate]) {
        const updatedAssigned = {...assignedRecords};
        updatedAssigned[selectedDate].delete(eventToDelete.description);
        setAssignedRecords(updatedAssigned);
      }
      
      // Refresh the calendar events
      await fetchEvents();
      
      Alert.alert('Success', 'Event removed from calendar');
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event');
    } finally {
      setLoading(false);
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

  const renderEventSummary = () => {
    if (!selectedEvents || selectedEvents.length === 0) return null;
    
    // Calculate totals by type
    const totals = selectedEvents.reduce((acc, event) => {
      // Extract amount from description (format: "name - amount€")
      const amountMatch = event.description.match(/- ([\d,\.]+)€$/);
      if (amountMatch && amountMatch[1]) {
        const amount = parseFloat(amountMatch[1].replace(',', '.'));
        if (!isNaN(amount)) {
          acc[event.type] = (acc[event.type] || 0) + amount;
        }
      }
      return acc;
    }, {});
    
    return (
      <View style={styles.eventSummaryContainer}>
        <Text style={styles.eventSummaryTitle}>Summary</Text>
        <View style={styles.eventSummaryContent}>
          {totals.income !== undefined && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Income:</Text>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                {totals.income.toFixed(2)}€
              </Text>
            </View>
          )}
          
          {totals.expense !== undefined && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Expenses:</Text>
              <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                {totals.expense.toFixed(2)}€
              </Text>
            </View>
          )}
          
          {totals.income !== undefined && totals.expense !== undefined && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Balance:</Text>
              <Text style={[
                styles.summaryValue, 
                { color: totals.income - totals.expense >= 0 ? '#4CAF50' : '#F44336' }
              ]}>
                {(totals.income - totals.expense).toFixed(2)}€
              </Text>
            </View>
          )}
        </View>
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
        <Text style={styles.recordText}>
          {item.name}
        </Text>
        <View style={styles.recordDetails}>
          <Text style={styles.recordCategory}>
            {item.categories?.name || 'No category'}
          </Text>
          <Text style={styles.recordAmount}>{Number(item.amount).toFixed(2)}€</Text>
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
          <TouchableOpacity 
            style={styles.closeSelector}
            onPress={() => setShowExistingRecords(false)}
          >
            <Ionicons name="close-circle" size={24} color="#757575" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${recordType}...`}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

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

  const renderEventItem = (event, index) => {
    // Extract amount from description (format: "name - amount€")
    const amountMatch = event.description.match(/- ([\d,\.]+)€$/);
    const amountText = amountMatch && amountMatch[1] ? `${amountMatch[1]}€` : '';
    
    // Extract name part (everything before the last " - ")
    const nameParts = event.description.split(' - ');
    const nameText = nameParts.length > 1 
      ? nameParts.slice(0, -1).join(' - ') 
      : event.description;
    
    return (
      <View key={index} style={[
        styles.eventItem,
        { borderLeftWidth: 4, borderLeftColor: getEventColor(event.type) }
      ]}>
        <View style={styles.eventHeader}>
          <View style={styles.eventTypeContainer}>
            <View style={[styles.eventTypeIndicator, { backgroundColor: getEventColor(event.type) }]} />
            <Text style={styles.eventType}>
              {event.type.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              console.log('Delete button pressed for event ID:', event.id);
              Alert.alert(
                'Delete Event',
                'Are you sure you want to remove this event from the calendar?',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'Delete',
                    onPress: () => {
                      console.log('Confirming deletion of event ID:', event.id);
                      handleDeleteEvent(event.id);
                    },
                    style: 'destructive',
                  },
                ]
              );
            }}
            style={styles.deleteButton}
          >
            <MaterialIcons name="delete" size={18} color="#F44336" />
          </TouchableOpacity>
        </View>
        <View style={styles.eventDetailsContainer}>
          <Text style={styles.eventName}>{nameText}</Text>
          <Text style={[
            styles.eventAmount,
            { color: event.type === 'income' ? '#4CAF50' : '#F44336' }
          ]}>
            {amountText}
          </Text>
        </View>
      </View>
    );
  };

  // New function to render monthly stats (now with counts)
  const renderMonthlyStats = () => {
    const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
    
    return (
      <View style={styles.monthlyStatsContainer}>
        <Text style={styles.monthlyStatsTitle}>{currentMonthName} Overview</Text>
        <View style={styles.statsCards}>
          <View style={[styles.statsCard, { backgroundColor: '#E8F5E9' }]}>
            <MaterialIcons name="arrow-upward" size={24} color="#4CAF50" />
            <Text style={styles.statsLabel}>Income Events</Text>
            <Text style={[styles.statsValue, { color: '#4CAF50' }]}>{eventCounts.income}</Text>
          </View>
          
          <View style={[styles.statsCard, { backgroundColor: '#FFEBEE' }]}>
            <MaterialIcons name="arrow-downward" size={24} color="#F44336" />
            <Text style={styles.statsLabel}>Expense Events</Text>
            <Text style={[styles.statsValue, { color: '#F44336' }]}>{eventCounts.expense}</Text>
          </View>
          
          <View style={[styles.statsCard, { backgroundColor: '#E3F2FD' }]}>
            <MaterialIcons name="flag" size={24} color="#2196F3" />
            <Text style={styles.statsLabel}>Goals</Text>
            <Text style={[styles.statsValue, { color: '#2196F3' }]}>{eventCounts.goal}</Text>
          </View>
        </View>
        
        <View style={styles.upcomingContainer}>
          <Text style={styles.upcomingTitle}>Upcoming Events</Text>
          
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event, index) => {
              // Extract amount from description (format: "name - amount€") if it exists
              const amountMatch = event.description.match(/- ([\d,\.]+)€$/);
              const amount = amountMatch ? amountMatch[1] : null;
              
              // Extract name part (everything before the last " - ")
              const nameParts = event.description.split(' - ');
              const nameText = nameParts.length > 1 && amountMatch
                ? nameParts.slice(0, -1).join(' - ')
                : event.description;
              
              const eventDate = new Date(event.date);
              const day = eventDate.getDate();
              const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
              
              return (
                <View key={index} style={styles.upcomingEvent}>
                  <View style={styles.upcomingDate}>
                    <Text style={styles.upcomingDay}>{day}</Text>
                    <Text style={styles.upcomingMonth}>{month}</Text>
                  </View>
                  <View style={styles.upcomingDetail}>
                    <Text style={styles.upcomingName}>{nameText}</Text>
                    {amount && (
                      <Text
                        style={[
                          styles.upcomingAmount,
                          { color: event.type === 'income' ? '#4CAF50' : '#F44336' }
                        ]}
                      >
                        {amount}€
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.noUpcomingEvents}>
              <Text style={styles.noUpcomingText}>No upcoming events in the next 30 days</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <Header title="Calendar" />
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3F51B5" />
        </View>
      )}
      
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
                  
                  {renderEventSummary()}
                  
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