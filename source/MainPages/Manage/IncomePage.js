import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../Supabase';
import styles from '../../Styles/Manage/IncomePageStyle';
import IncomeChart from '../../Utility/Chart';
import Alert from '../../Utility/Alerts';

const IncomePage = ({ navigation }) => {
  const [incomes, setIncomes] = useState([]);
  const [frequencies, setFrequencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isManageModalVisible, setManageModalVisible] = useState(false);
  const [selectedManageType, setSelectedManageType] = useState(null);
  const [manageFormData, setManageFormData] = useState({ name: '' });
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency_id: '',
    category_id: '',
  });

  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  const fetchUserIncomes = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('income')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        console.error('Error fetching incomes:', error);
        setIncomes([]);
        return;
      }
      setIncomes(data || []);
    } catch (error) {
      console.error('Unexpected error fetching incomes:', error);
    }
  };

  const fetchUserCategoriesAndFrequencies = async (userId) => {
    try {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`);

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        setCategories([]);
      } else {
        setCategories(categories || []);
      }

      const { data: frequencies, error: frequenciesError } = await supabase
        .from('frequencies')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`);

      if (frequenciesError) {
        console.error('Error fetching frequencies:', frequenciesError);
        setFrequencies([]);
      } else {
        setFrequencies(frequencies || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching categories or frequencies:', error);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
        return;
      }
      setUserId(user.id);
      fetchUserIncomes(user.id);
      fetchUserCategoriesAndFrequencies(user.id);
    };
    fetchUserData();
  }, []);

  const handleAddIncome = () => {
    setSelectedIncome(null);
    setFormData({
      name: '',
      amount: '',
      frequency_id: '',
      category_id: '',
    });
    setModalVisible(true);
  };

  const handleEditIncome = (income) => {
    setSelectedIncome(income);
    setFormData({
      name: income.name,
      amount: income.amount.toString(),
      frequency_id: income.frequency_id,
      category_id: income.category_id,
    });
    setModalVisible(true);
  };

  const handleSaveIncome = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('Error authenticating user:', authError);
        alert('Error fetching authenticated user. Please try again.');
        return;
      }

      const userId = user?.id;

      if (!userId) {
        alert('Error: Unauthenticated user. Unable to add income.');
        return;
      }

      if (!formData.name || !formData.amount || !formData.frequency_id || !formData.category_id) {
        alert('Please fill in all fields before saving.');
        return;
      }

      const payload = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        frequency_id: formData.frequency_id,
        category_id: formData.category_id,
        user_id: userId,
      };

      let error;
      if (selectedIncome) {
        ({ error } = await supabase
          .from('income')
          .update(payload)
          .eq('id', selectedIncome.id));
      } else {
        ({ error } = await supabase
          .from('income')
          .insert([payload]));
      }

      if (error) {
        console.error('Error saving income:', error);
        alert('Error saving income. Please try again.');
        return;
      }

      setAlertMessage(selectedIncome ? 'Income updated successfully!' : 'Income added successfully!');
      setAlertType('success');
      setShowAlert(true);
    } catch (error) {
      console.error('Unexpected error saving income:', error);
      alert('Unexpected error. Please try again.');
    } finally {
      setModalVisible(false);
      fetchUserIncomes(userId);
    }
  };

  const handleDeleteIncome = async (incomeId) => {
    const { error } = await supabase.from('income').delete().eq('id', incomeId);
    if (error) {
      console.error('Error deleting income:', error);
    } else {
      fetchUserIncomes(userId);
    }
  };

  const renderIncomeItem = ({ item }) => (
    <View style={styles.incomeItem}>
      <Text style={styles.incomeName}>{item.name}</Text>
      <Text style={styles.incomeAmount}>${item.amount}</Text>
      <TouchableOpacity onPress={() => handleEditIncome(item)}>
        <Ionicons name="create-outline" size={24} color="blue" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleDeleteIncome(item.id)}>
        <Ionicons name="trash-outline" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {showAlert && <Alert type={alertType} message={alertMessage} onClose={() => setShowAlert(false)} />}

      <Text style={styles.header}>Income</Text>

      <IncomeChart incomes={incomes} />

      <FlatList
        data={incomes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderIncomeItem}
        style={styles.incomeList}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddIncome}
        activeOpacity={0.7}
      >
        <Text style={styles.addButtonText}>+ Add Income</Text>
      </TouchableOpacity>

      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>{selectedIncome ? 'Edit Income' : 'Add Income'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Amount"
              keyboardType="numeric"
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
            />
            <Picker
              selectedValue={formData.frequency_id}
              style={styles.picker}
              onValueChange={(itemValue) => setFormData({ ...formData, frequency_id: itemValue })}
            >
              <Picker.Item label="Select Frequency" value="" />
              {frequencies.map((frequency) => (
                <Picker.Item key={frequency.id} label={frequency.name} value={frequency.id} />
              ))}
            </Picker>
            <Picker
              selectedValue={formData.category_id}
              style={styles.picker}
              onValueChange={(itemValue) => setFormData({ ...formData, category_id: itemValue })}
            >
              <Picker.Item label="Select Category" value="" />
              {categories.map((category) => (
                <Picker.Item key={category.id} label={category.name} value={category.id} />
              ))}
            </Picker>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveIncome}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default IncomePage;