import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, ScrollView, Animated as RNAnimated } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../Supabase';
import styles from '../../Styles/Manage/IncomePageStyle';
import AlertComponent from '../../Utility/Alerts';
import { useFocusEffect } from '@react-navigation/native';
import Chart from '../../Utility/Chart';
import Header from '../../Utility/Header';
import { formatCurrency, getCurrentCurrency, addCurrencyChangeListener, removeCurrencyChangeListener, shouldConvertCurrencyValues } from '../../Utility/FetchCountries';
import { convertValueToCurrentCurrency } from '../../Utility/CurrencyConverter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StatisticsUpdater from '../../Utility/StatisticsUpdater';

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
  const [isManageModalVisible, setManageModalVisible] = useState(false); // New modal for management
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
  const incomesWithButtons = [...incomesToDisplay, { isAddButton: true }, { isManageButton: true }];

  // Add state for managing tabs in modal
  const [activeManageTab, setActiveManageTab] = useState('categories');

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  // Obter a moeda do usuário diretamente do banco de dados
  const loadUserCurrency = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('user_currency_preferences')
        .select('actual_currency')
        .eq('user_id', session.user.id)
        .single();
        
      if (error || !data) {
        throw new Error('Failed to load currency preference');
      }
      
      console.log('[IncomePage] Moeda carregada direto do banco:', data.actual_currency);
      setOriginalCurrency(data.actual_currency);
      return data.actual_currency;
    } catch (error) {
      console.error('[IncomePage] Erro ao carregar moeda do usuário:', error);
      throw new Error('Cannot determine user currency');
    }
  };

  const fetchUserIncomes = async (userId) => {
    try {
      setIsLoading(true);
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
      
      // Obter a moeda do usuário para usar na conversão
      const origCurrency = await loadUserCurrency();
      
      // Converter valores para a moeda atual
      await convertIncomesToCurrentCurrency(data || [], origCurrency);
      
      // Limpar o filtro quando novos dados são carregados
      setFilteredIncomes([]);
      setSelectedCategoryId(null);
      
      processChartData(data || []); // Processar os dados para o gráfico
    } catch (error) {
      console.error('Unexpected error fetching incomes:', error);
    } finally {
      setIsLoading(false);
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
      
      // Não salva mais no AsyncStorage
      console.log(`[IncomePage] Usando moeda ${sourceCurrency} para conversão`);
      
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
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
      await loadUserCurrency(); // Carregar a moeda do usuário
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
    try {
      // Reseta o estado do formulário e abre o modal
      setSelectedIncome(null);
      setFormData({
        name: '',
        amount: '',
        frequency_id: '',
        category_id: '',
      });
      setModalVisible(true); // Exibe o modal
    } catch (error) {
      console.error('Error in handleAddIncome:', error);
    }
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

      // Update statistics only when adding new income (not editing)
      if (!selectedIncome) {
        await StatisticsUpdater.incrementIncome(userId);
        console.log('Statistics updated: income count incremented');
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
        // Update statistics when deleting income
        await StatisticsUpdater.decrementIncome(userId);
        console.log('Statistics updated: income count decremented');
        
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

  // Método simplificado de seleção da categoria do gráfico
  const handleChartCategorySelect = (selectedCategory) => {
    if (!selectedCategory) {
      // Se nenhuma categoria está selecionada, limpar o filtro
      setSelectedCategoryId(null);
      setFilteredIncomes([]);
      return;
    }

    // Encontrar a categoria correspondente no array de categorias
    const category = categories.find(c => c.name === selectedCategory.name);
    if (!category) return;

    // Se clicar na mesma categoria, limpa o filtro
    if (selectedCategoryId === category.id) {
      setSelectedCategoryId(null);
      setFilteredIncomes([]);
      return;
    }
    
    setSelectedCategoryId(category.id);
    
    // Filtrar os incomes para mostrar apenas os da categoria selecionada
    const filtered = incomes.filter(income => income.category_id === category.id);
    setFilteredIncomes(filtered);
    
    // Mostrar mensagem se não encontrar incomes
    if (filtered.length === 0) {
      setAlertMessage('No incomes found for this category');
      setAlertType('info');
      setShowAlert(true);
    }
  };

  const renderIncomeItem = (item, index) => {
    if (item.isAddButton) {
      return (
        <TouchableOpacity
          key="add-button"
          style={styles.addButton}
          onPress={handleAddIncome}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Income</Text>
        </TouchableOpacity>
      );
    }

    if (item.isManageButton) {
      return (
        <TouchableOpacity
          key="manage-button"
          style={[styles.addButton, { backgroundColor: '#FFC107' }]}
          onPress={() => setManageModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="settings" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Manage Categories</Text>
        </TouchableOpacity>
      );
    }

    const isHighlighted = selectedCategoryId === item.category_id;

    return (
      <View 
        key={item.id || `income-${index}`}
        style={[
          styles.incomeItem, 
          isHighlighted && styles.highlightedIncomeItem
        ]}
      >
        <View style={styles.incomeRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.priorityIndicator, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.incomeTitle}>{item.name}</Text>
          </View>
          <Text style={styles.incomeDetails}>
            {formatCurrency(item.amount)}
          </Text>
        </View>

        <View style={styles.incomeRow}>
          {item.categories && (
            <View style={[
              styles.categoryTag,
              isHighlighted && styles.highlightedCategoryTag
            ]}>
              <Text style={[
                styles.categoryText,
                isHighlighted && styles.highlightedCategoryText
              ]}>
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

  // Nova função simplificada para calcular os dados do gráfico de pizza
  const calculatePieData = () => {
    if (!incomes || !categories || !frequencies) return [];

    // Cores predefinidas para o gráfico
    const pieColors = [
      '#FF9500',  // Laranja
      '#9C27B0',  // Roxo
      '#2196F3',  // Azul
      '#4CAF50',  // Verde
      '#F44336',  // Vermelho
      '#FFEB3B',  // Amarelo
    ];
    
    // Agrupar por categoria
    const catTotals = {};
    
    // Inicializar categorias
    categories.forEach(cat => {
      catTotals[cat.id] = { 
        id: cat.id,
        name: cat.name, 
        value: 0, 
        color: pieColors[cat.id % pieColors.length]
      };
    });
    
    // Somar valores por categoria
    incomes.forEach(income => {
      if (catTotals[income.category_id]) {
        const frequency = frequencies.find(f => f.id === income.frequency_id);
          const days = frequency?.days || 30;
        // Converter para valor mensal
          const monthlyAmount = income.amount * (30 / days);
        catTotals[income.category_id].value += monthlyAmount;
      }
    });
    
    // Filtrar para excluir categorias sem valores ou com valores muito pequenos
    let result = Object.values(catTotals)
      .filter(cat => cat.name && cat.value > 0) // Só incluir categorias com valor > 0
      .sort((a, b) => b.value - a.value);

    return result;
  };

  // Add skeleton component
  const SkeletonLoader = () => {
    const shimmerAnim = new RNAnimated.Value(0);

    useEffect(() => {
      const shimmer = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          RNAnimated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      shimmer.start();
      return () => shimmer.stop();
    }, []);

    const opacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonContainer}>
        <View style={styles.skeletonChart}>
          <RNAnimated.View style={[styles.skeletonShimmer, { opacity }]} />
        </View>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.skeletonItem}>
            <RNAnimated.View style={[styles.skeletonShimmer, { opacity }]} />
          </View>
        ))}
      </View>
    );
  };

  // Add methods for manage modal actions
  const handleAddCategory = () => {
    // TODO: Implement add category logic
    setAlertMessage('Add category feature coming soon!');
    setAlertType('info');
    setShowAlert(true);
  };

  const handleEditCategory = (category) => {
    // TODO: Implement edit category logic
    setAlertMessage(`Edit category "${category.name}" feature coming soon!`);
    setAlertType('info');
    setShowAlert(true);
  };

  const handleDeleteCategory = (category) => {
    // TODO: Implement delete category logic
    setAlertMessage(`Delete category "${category.name}" feature coming soon!`);
    setAlertType('info');
    setShowAlert(true);
  };

  const handleAddFrequency = () => {
    // TODO: Implement add frequency logic
    setAlertMessage('Add frequency feature coming soon!');
    setAlertType('info');
    setShowAlert(true);
  };

  const handleEditFrequency = (frequency) => {
    // TODO: Implement edit frequency logic
    setAlertMessage(`Edit frequency "${frequency.name}" feature coming soon!`);
    setAlertType('info');
    setShowAlert(true);
  };

  const handleDeleteFrequency = (frequency) => {
    // TODO: Implement delete frequency logic
    setAlertMessage(`Delete frequency "${frequency.name}" feature coming soon!`);
    setAlertType('info');
    setShowAlert(true);
  };

  return (
    <View style={styles.container}>
      {showAlert && <AlertComponent type={alertType} message={alertMessage} onClose={() => setShowAlert(false)} />}

      <Header title="Income Management" />

      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <>
          <View style={styles.chartContainer}>
            <Chart
              key={chartRenderKey}
              incomes={incomes}
              categories={categories}
              frequencies={frequencies}
              chartTypes={['Bar', 'Pie']}
              onCategorySelect={handleChartCategorySelect}
            />
          </View>

          {/* Se existir um filtro ativo, mostrar botão para limpar */}
          {filteredIncomes.length > 0 && (
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
          )}

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {incomesWithButtons.map((item, index) => renderIncomeItem(item, index))}
          </ScrollView>
        </>
      )}

      {/* Add/Edit Modal - Fixed */}
      {isModalVisible && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onPress={() => setModalVisible(false)}
            activeOpacity={1}
          />
          <View
            style={{
              width: '90%',
              maxWidth: 350,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              maxHeight: '80%',
              alignSelf: 'center',
            }}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#FF9800',
                marginBottom: 16,
                textAlign: 'center',
              }}>
                {selectedIncome ? 'Edit Income' : 'Add Income'}
              </Text>
              
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#E65100',
                marginBottom: 4,
              }}>Income Name</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#FFE082',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  backgroundColor: '#FFFFFF',
                  fontSize: 16,
                  color: '#E65100',
                  minHeight: 44,
                }}
                placeholder="Enter income name"
                placeholderTextColor="#B0BEC5"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#E65100',
                marginBottom: 4,
              }}>Amount</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#FFE082',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  backgroundColor: '#FFFFFF',
                  fontSize: 16,
                  color: '#E65100',
                  minHeight: 44,
                }}
                placeholder="Enter amount"
                placeholderTextColor="#B0BEC5"
                keyboardType="numeric"
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
              />
              
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#E65100',
                marginBottom: 4,
              }}>Frequency</Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#FFE082',
                borderRadius: 8,
                marginBottom: 12,
                backgroundColor: '#FFFFFF',
                minHeight: 44,
              }}>
                <Picker
                  selectedValue={formData.frequency_id}
                  onValueChange={(itemValue) => setFormData({ ...formData, frequency_id: itemValue })}
                >
                  <Picker.Item label="Select Frequency" value="" />
                  {frequencies.map((frequency) => (
                    <Picker.Item key={frequency.id} label={frequency.name} value={frequency.id} />
                  ))}
                </Picker>
              </View>
              
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#E65100',
                marginBottom: 4,
              }}>Category</Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#FFE082',
                borderRadius: 8,
                marginBottom: 16,
                backgroundColor: '#FFFFFF',
                minHeight: 44,
              }}>
                <Picker
                  selectedValue={formData.category_id}
                  onValueChange={(itemValue) => setFormData({ ...formData, category_id: itemValue })}
                >
                  <Picker.Item label="Select Category" value="" />
                  {categories.map((category) => (
                    <Picker.Item key={category.id} label={category.name} value={category.id} />
                  ))}
                </Picker>
              </View>
              
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#E0E0E0',
                    padding: 16,
                    borderRadius: 8,
                    alignItems: 'center',
                    minHeight: 48,
                    justifyContent: 'center',
                  }}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    color: '#616161',
                    fontWeight: '600',
                    fontSize: 16,
                  }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{
                    flex: 1,
                    backgroundColor: '#FF9800',
                    padding: 16,
                    borderRadius: 8,
                    alignItems: 'center',
                    minHeight: 48,
                    justifyContent: 'center',
                  }}
                  onPress={handleSaveIncome}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontWeight: '600',
                    fontSize: 16,
                  }}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Delete Confirmation Modal - Fixed */}
      {isDeleteModalVisible && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          activeOpacity={1}
          onPress={() => setDeleteModalVisible(false)}
        >
          <TouchableOpacity
            style={{
              width: '90%',
              maxWidth: 350,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              alignSelf: 'center',
            }}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              gap: 12,
            }}>
              <Ionicons name="warning" size={32} color="#FF6B6B" />
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#FF5722',
                letterSpacing: 0.5,
              }}>Delete Income</Text>
            </View>
            <Text style={{
              fontSize: 16,
              color: '#E65100',
              textAlign: 'center',
              marginBottom: 8,
              letterSpacing: 0.3,
            }}>
              Are you sure you want to delete "{incomeToDelete?.name}"?
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#F57C00',
              textAlign: 'center',
              marginBottom: 20,
              letterSpacing: 0.2,
            }}>
              This action cannot be undone.
            </Text>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#FF5722',
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  minHeight: 48,
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
                onPress={handleDeleteIncome}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 16,
                  letterSpacing: 0.5,
                }}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#FFE082',
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  minHeight: 48,
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
                onPress={() => setDeleteModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#E65100" style={{ marginRight: 8 }} />
                <Text style={{
                  color: '#E65100',
                  fontWeight: '600',
                  fontSize: 16,
                  letterSpacing: 0.5,
                }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Management Modal with Tabs - Fixed */}
      {isManageModalVisible && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          activeOpacity={1}
          onPress={() => setManageModalVisible(false)}
        >
          <TouchableOpacity
            style={{
              width: '90%',
              maxWidth: 400,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              maxHeight: '80%',
              alignSelf: 'center',
            }}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#FF9800',
              marginBottom: 16,
              textAlign: 'center',
              letterSpacing: 0.5,
            }}>Manage Settings</Text>
            
            {/* Tab Selection */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: '#FFF8E1',
              borderRadius: 8,
              padding: 4,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#FFE082',
            }}>
              <TouchableOpacity 
                style={[
                  {
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 6,
                    alignItems: 'center',
                  },
                  activeManageTab === 'categories' && {
                    backgroundColor: '#FF9800',
                  }
                ]}
                onPress={() => setActiveManageTab('categories')}
                activeOpacity={0.7}
              >
                <Text style={[
                  {
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#F57C00',
                  },
                  activeManageTab === 'categories' && {
                    color: '#FFFFFF',
                    fontWeight: '700',
                  }
                ]}>
                  Categories
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  {
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 6,
                    alignItems: 'center',
                  },
                  activeManageTab === 'frequencies' && {
                    backgroundColor: '#FF9800',
                  }
                ]}
                onPress={() => setActiveManageTab('frequencies')}
                activeOpacity={0.7}
              >
                <Text style={[
                  {
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#F57C00',
                  },
                  activeManageTab === 'frequencies' && {
                    color: '#FFFFFF',
                    fontWeight: '700',
                  }
                ]}>
                  Frequencies
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={{ maxHeight: 200 }} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Categories Section */}
              {activeManageTab === 'categories' && (
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#E65100',
                    marginBottom: 12,
                    letterSpacing: 0.3,
                  }}>Income Categories</Text>
                  {categories.map((category) => (
                    <View key={category.id} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#FFF8E1',
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: '#FFE082',
                    }}>
                      <Text style={{
                        fontSize: 14,
                        color: '#F57C00',
                        fontWeight: '500',
                        flex: 1,
                      }}>{category.name}</Text>
                      <View style={{
                        flexDirection: 'row',
                        gap: 8,
                      }}>
                        <TouchableOpacity 
                          style={{
                            padding: 8,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FFC107',
                          }}
                          onPress={() => handleEditCategory(category)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="pencil" size={14} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={{
                            padding: 8,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FF5722',
                          }}
                          onPress={() => handleDeleteCategory(category)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity 
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FF9800',
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                    onPress={handleAddCategory}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={{
                      color: '#FFFFFF',
                      fontWeight: '600',
                      fontSize: 14,
                      marginLeft: 6,
                    }}>Add Category</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Frequencies Section */}
              {activeManageTab === 'frequencies' && (
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#E65100',
                    marginBottom: 12,
                    letterSpacing: 0.3,
                  }}>Frequencies</Text>
                  {frequencies.map((frequency) => (
                    <View key={frequency.id} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#FFF8E1',
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: '#FFE082',
                    }}>
                      <Text style={{
                        fontSize: 14,
                        color: '#F57C00',
                        fontWeight: '500',
                        flex: 1,
                      }}>{frequency.name} ({frequency.days} days)</Text>
                      <View style={{
                        flexDirection: 'row',
                        gap: 8,
                      }}>
                        <TouchableOpacity 
                          style={{
                            padding: 8,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FFC107',
                          }}
                          onPress={() => handleEditFrequency(frequency)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="pencil" size={14} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={{
                            padding: 8,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FF5722',
                          }}
                          onPress={() => handleDeleteFrequency(frequency)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity 
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FF9800',
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                    onPress={handleAddFrequency}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={{
                      color: '#FFFFFF',
                      fontWeight: '600',
                      fontSize: 14,
                      marginLeft: 6,
                    }}>Add Frequency</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 16,
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#FF9800',
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  minHeight: 44,
                  justifyContent: 'center',
                }}
                onPress={() => setManageModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 14,
                }}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default IncomePage;