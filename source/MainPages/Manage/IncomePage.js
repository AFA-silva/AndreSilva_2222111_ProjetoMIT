import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../Supabase';
import styles from '../../Styles/Manage/IncomePageStyle';
import IncomeChart from '../../Utility/Chart';
import AlertComponent from '../../Utility/Alerts';
import { useFocusEffect } from '@react-navigation/native';
import Chart from '../../Utility/Chart';
import { formatCurrency, getCurrentCurrency, addCurrencyChangeListener, removeCurrencyChangeListener, shouldConvertCurrencyValues } from '../../Utility/FetchCountries';
import { convertValueToCurrentCurrency } from '../../Utility/CurrencyConverter';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IncomePage = ({ navigation }) => {
  const [incomes, setIncomes] = useState([]);
  const [originalIncomes, setOriginalIncomes] = useState([]); // Armazenar os valores originais
  const [filteredIncomes, setFilteredIncomes] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [chartRenderKey, setChartRenderKey] = useState(Date.now());
  const [frequencies, setFrequencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false); // Modal para exibir itens filtrados
  const [isCategoryFilterVisible, setCategoryFilterVisible] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency_id: '',
    category_id: '',
  });
  const [originalCurrency, setOriginalCurrency] = useState('EUR'); // Moeda original do sistema

  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  // Use filteredIncomes para a lista e se estiver vazia, use incomes
  const incomesToDisplay = filteredIncomes.length > 0 ? filteredIncomes : incomes;
  const incomesWithAddButton = [...incomesToDisplay, { isAddButton: true }];

  // Carregar a moeda original salva do usuário
  const loadOriginalCurrency = async () => {
    try {
      const savedCurrency = await AsyncStorage.getItem('original_app_currency');
      if (savedCurrency) {
        console.log('[IncomePage] Moeda original carregada:', savedCurrency);
        setOriginalCurrency(savedCurrency);
        return savedCurrency;
      } else {
        // Se não tiver sido salva ainda, salvar a moeda atual como original
        const currentCurrency = getCurrentCurrency();
        console.log('[IncomePage] Definindo moeda original:', currentCurrency.code);
        await AsyncStorage.setItem('original_app_currency', currentCurrency.code);
        setOriginalCurrency(currentCurrency.code);
        return currentCurrency.code;
      }
    } catch (error) {
      console.error('[IncomePage] Erro ao carregar moeda original:', error);
      // Usar EUR como fallback se houver erro
      setOriginalCurrency('EUR');
      return 'EUR';
    }
  };

  const fetchUserIncomes = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('income')
        .select('*, frequencies(name, days), categories(name)')
        .eq('user_id', userId);
      if (error) {
        console.error('Error fetching incomes:', error);
        setIncomes([]);
        return;
      }
      
      // Armazenar os valores originais
      setOriginalIncomes(data || []);
      
      // Obter a moeda original para usar na conversão
      const origCurrency = await loadOriginalCurrency();
      
      // Converter valores para a moeda atual
      await convertIncomesToCurrentCurrency(data || [], origCurrency);
      
      // Limpar o filtro quando novos dados são carregados
      setFilteredIncomes([]);
      setSelectedCategoryId(null);
      
      processChartData(data || []); // Processar os dados para o gráfico
    } catch (error) {
      console.error('Unexpected error fetching incomes:', error);
    }
  };

  // Função para converter os valores para a moeda atual
  const convertIncomesToCurrentCurrency = async (data, origCurrency) => {
    try {
      if (!data || data.length === 0) {
        return;
      }
      
      const sourceCurrency = origCurrency || originalCurrency || 'EUR';
      console.log(`[IncomePage] Convertendo ${data.length} receitas de ${sourceCurrency}`);
      
      // Forçar atualização de valor no AsyncStorage para debugging
      await AsyncStorage.setItem('original_app_currency', sourceCurrency);
      
      const convertedIncomes = await Promise.all(data.map(async (income, index) => {
        try {
          console.log(`[Income ${index+1}] Convertendo ${income.amount} ${sourceCurrency}`);
          const convertedAmount = await convertValueToCurrentCurrency(income.amount, sourceCurrency);
          console.log(`[Income ${index+1}] Resultado: ${convertedAmount}`);
          
          return {
            ...income,
            amount: convertedAmount
          };
        } catch (error) {
          console.error('[IncomePage] Erro ao converter valor individual:', error);
          return income; // Manter o valor original em caso de erro
        }
      }));
      
      console.log('[IncomePage] Receitas convertidas com sucesso');
      setIncomes(convertedIncomes);
    } catch (error) {
      console.error('[IncomePage] Erro ao converter valores:', error);
      setIncomes(data); // Em caso de erro, usar os valores originais
    }
  };

  // Ouvinte para mudanças na moeda
  const handleCurrencyChange = async (newCurrency) => {
    try {
      console.log('Moeda alterada para:', newCurrency?.code);
      
      // Verificar se devemos converter os valores
      const shouldConvert = shouldConvertCurrencyValues();
      console.log('Converter valores?', shouldConvert);
      
      if (shouldConvert) {
        // Converter valores usando a moeda original
        await convertIncomesToCurrentCurrency(originalIncomes, originalCurrency);
      } else {
        // Apenas atualizar o símbolo da moeda, sem converter os valores
        setIncomes([...originalIncomes]);
      }
      
      // Forçar re-renderização do gráfico
      setChartRenderKey(Date.now());
    } catch (error) {
      console.error('Erro ao lidar com mudança de moeda:', error);
    }
  };

  const fetchUserCategoriesAndFrequencies = async (userId) => {
    try {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq('type', 'income');

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

  const processChartData = (incomeData) => {
    const categoryMap = {};

    incomeData.forEach((income) => {
      const { category_id, categories, frequencies, amount } = income;
      const days = frequencies?.days || 30; // Usar os dias da frequência ou 30 como padrão
      const monthlyAmount = (amount * 30) / days; // Converter para valor mensal

      if (!categoryMap[category_id]) {
        categoryMap[category_id] = {
          name: categories?.name || 'Uncategorized',
          total: 0,
        };
      }

      categoryMap[category_id].total += monthlyAmount;
    });

    const chartData = Object.values(categoryMap).map((category) => ({
      name: category.name,
      amount: category.total,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Gerar cores aleatórias
      legendFontColor: '#333',
      legendFontSize: 12,
    }));

    setChartData(chartData);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
        return;
      }
      setUserId(user.id);
      await loadOriginalCurrency(); // Carregar a moeda original
      fetchUserIncomes(user.id);
      fetchUserCategoriesAndFrequencies(user.id);
    };
    fetchUserData();
    
    // Adicionar listener para mudanças de moeda
    addCurrencyChangeListener(handleCurrencyChange);
    
    // Limpar listener ao desmontar
    return () => {
      removeCurrencyChangeListener(handleCurrencyChange);
    };
  }, []);

  // Adicionada lógica para recarregar dados ao reentrar na página
  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        fetchUserIncomes(userId);
        fetchUserCategoriesAndFrequencies(userId);
        setChartRenderKey(Date.now()); // ← FORÇA O RE-RENDER DO CHART
      }
    }, [userId])
  );
  

  const handleAddIncome = () => {
    // Reseta o estado do formulário e abre o modal
    setSelectedIncome(null);
    setFormData({
      name: '',
      amount: '',
      frequency_id: '',
      category_id: '',
    });
    setModalVisible(true); // Exibe o modal
  };

  const handleEditIncome = (income) => {
    // Configura o estado do formulário com os dados do income selecionado e abre o modal
    setSelectedIncome(income);
    setFormData({
      name: income.name,
      amount: income.amount.toString(),
      frequency_id: income.frequency_id,
      category_id: income.category_id,
    });
    setModalVisible(true); // Exibe o modal
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
        // Atualiza o income selecionado
        ({ error } = await supabase
          .from('income')
          .update(payload)
          .eq('id', selectedIncome.id));
      } else {
        // Adiciona um novo income
        ({ error } = await supabase
          .from('income')
          .insert([payload]));
      }

      if (error) {
        console.error('Error saving income:', error);
        alert('Error saving income. Please try again.');
        return;
      }

      // Exibe mensagem de sucesso em um alerta
      setAlertMessage(selectedIncome ? 'Income updated successfully!' : 'Income added successfully!');
      setAlertType('success');
      setShowAlert(true);

      fetchUserIncomes(userId); // Atualiza lista após salvar
      
      // Limpar o filtro quando um novo income é adicionado
      setFilteredIncomes([]);
      setSelectedCategoryId(null);
    } catch (error) {
      console.error('Unexpected error saving income:', error);
      alert('Unexpected error. Please try again.');
    } finally {
      setModalVisible(false); // Fecha o modal após salvar
    }
  };

  const handleDeleteIncome = async () => {
    try {
      const { error } = await supabase.from('income').delete().eq('id', incomeToDelete.id);
      if (error) {
        console.error('Error deleting income:', error);
      } else {
        fetchUserIncomes(userId); // Atualiza lista após exclusão
        
        // Limpar o filtro quando um income é excluído
        setFilteredIncomes([]);
        setSelectedCategoryId(null);
        
        // Exibe mensagem de sucesso em um alerta
        setAlertMessage('Income deleted successfully!');
        setAlertType('success');
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Unexpected error deleting income:', error);
    } finally {
      setDeleteModalVisible(false); // Fecha o modal após concluir a exclusão
    }
  };

  const confirmDeleteIncome = (income) => {
    setIncomeToDelete(income); // Define o income selecionado
    setDeleteModalVisible(true); // Abre o modal de confirmação
  };

  const handleCategorySelect = (categoryId) => {
    if (selectedCategoryId === categoryId) {
      // Se clicar na mesma categoria, limpa o filtro
      setSelectedCategoryId(null);
      setFilteredIncomes([]);
      return;
    }
    
    setSelectedCategoryId(categoryId);
    
    // Filtrar os incomes para mostrar apenas os da categoria selecionada
    const filtered = incomes.filter(income => income.category_id === categoryId);
    setFilteredIncomes(filtered);
    
    if (filtered.length === 0) {
      setAlertMessage('No incomes found for this category');
      setAlertType('info');
      setShowAlert(true);
    }
  };

  // Renderizar um item de categoria para o filtro horizontal
  const renderCategoryItem = ({ item }) => {
    if (!item || !item.id) return null;
    
    const isSelected = selectedCategoryId === item.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.categoryChip, 
          isSelected && styles.categoryChipSelected
        ]}
        onPress={() => handleCategorySelect(item.id)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.categoryChipText,
          isSelected && styles.categoryChipTextSelected
        ]}>
          {item.name}
        </Text>
        {isSelected && (
          <View style={styles.categoryChipIndicator}>
            <Ionicons name="checkmark" size={12} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Botão para limpar filtros
  const renderClearFilterButton = () => {
    if (filteredIncomes.length === 0) return null;
    
    return (
      <TouchableOpacity 
        style={styles.clearFilterButton}
        onPress={() => {
          setFilteredIncomes([]);
          setSelectedCategoryId(null);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="close-circle" size={18} color="#FFF" />
        <Text style={styles.clearFilterButtonText}>Clear Filter</Text>
      </TouchableOpacity>
    );
  };

  // Renderiza um item de income para o modal de filtro
  const renderFilterItem = ({ item, index }) => {
    if (!item || item.isAddButton) return null;
    
    return (
      <View style={styles.modalIncomeItem} key={`filter-item-${item.id || index}`}>
        <View style={styles.incomeRow}>
          <Text style={styles.incomeTitle}>{item.name}</Text>
          <Text style={styles.incomeDetails}>
            {formatCurrency(item.amount)}
          </Text>
        </View>

        <View style={styles.incomeRow}>
          {item.categories && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>
                {item.categories.name}
              </Text>
            </View>
          )}
          {item.frequencies && (
            <View style={styles.frequencyTag}>
              <Text style={styles.frequencyText}>
                {item.frequencies.name}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderIncomeItem = ({ item }) => {
    if (item.isAddButton) {
      return (
        <TouchableOpacity
          style={[styles.incomeItem, { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderColor: '#FFB74D', borderWidth: 2, backgroundColor: '#FFFDE7' }]}
          onPress={handleAddIncome}
          activeOpacity={0.8}
        >
          <Text style={[styles.addButtonText, { color: '#FFA726', fontSize: 18 }]}>+ Add Income</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.incomeItem}>
        <View style={styles.incomeRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.priorityIndicator, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.incomeTitle}>{item.name}</Text>
          </View>
          <Text style={styles.incomeDetails}>
            {formatCurrency(item.amount)}
          </Text>
        </View>

        <View style={styles.incomeRow}>
          {item.categories && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>
                {item.categories.name}
              </Text>
            </View>
          )}
          {item.frequencies && (
            <View style={styles.frequencyTag}>
              <Text style={styles.frequencyText}>
                {item.frequencies.name}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.incomeRow, { marginTop: 8, justifyContent: 'flex-end' }]}>
          <TouchableOpacity
            style={[styles.actionButtonEdit, { marginRight: 8 }]}
            onPress={() => handleEditIncome(item)}
          >
            <Ionicons name="pencil" size={16} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButtonDelete}
            onPress={() => confirmDeleteIncome(item)}
          >
            <Ionicons name="trash" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {showAlert && <AlertComponent type={alertType} message={alertMessage} onClose={() => setShowAlert(false)} />}

      <Text style={styles.header}>Income Management</Text>

      <View style={styles.chartContainer}>
        <Chart
          key={chartRenderKey}
          incomes={incomes}
          categories={categories}
          frequencies={frequencies}
          chartTypes={['Bar', 'Pie', 'Line']}
        />
      </View>

      {/* Filtro por categoria - lista horizontal */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterHeaderText}>Filter by Category</Text>
          {renderClearFilterButton()}
        </View>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={item => `category-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {selectedCategoryId && (
        <View style={styles.filterInfoContainer}>
          <Text style={styles.filterInfoText}>
            Showing incomes for: {categories.find(c => c.id === selectedCategoryId)?.name || 'Selected category'}
          </Text>
        </View>
      )}

      <FlatList
        data={incomesWithAddButton}
        keyExtractor={(item, idx) => item.id ? item.id.toString() : `add-btn-${idx}`}
        renderItem={renderIncomeItem}
        style={styles.incomeList}
      />

      {/* Add/Edit Modal */}
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

      {/* Delete Confirmation Modal */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 400 }]}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning" size={32} color="#FF6B6B" />
              <Text style={styles.deleteModalTitle}>Delete Income</Text>
            </View>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete "{incomeToDelete?.name}"?
            </Text>
            <Text style={styles.deleteModalSubtext}>
              This action cannot be undone.
            </Text>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.deleteButton, { flex: 1, marginRight: 8 }]}
                onPress={handleDeleteIncome}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, { flex: 1 }]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#666666" style={{ marginRight: 8 }} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default IncomePage;