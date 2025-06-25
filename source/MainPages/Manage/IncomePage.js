import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated as RNAnimated, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../../Supabase';
import styles from '../../Styles/Manage/IncomePageStyle';
import AlertComponent from '../../Utility/Alerts';
import { useFocusEffect } from '@react-navigation/native';
import Chart from '../../Utility/Chart';
import Header from '../../Utility/Header';
import { formatCurrency, getCurrentCurrency, addCurrencyChangeListener, removeCurrencyChangeListener, shouldConvertCurrencyValues } from '../../Utility/FetchCountries';
import { convertValueToCurrentCurrency } from '../../Utility/CurrencyConverter';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IncomePage = ({ navigation }) => {
  const [incomes, setIncomes] = useState([]);
  const [originalIncomes, setOriginalIncomes] = useState([]);
  const [filteredIncomes, setFilteredIncomes] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [chartRenderKey, setChartRenderKey] = useState(Date.now());
  const [frequencies, setFrequencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency_id: '',
    category_id: '',
  });
  const [originalCurrency, setOriginalCurrency] = useState('EUR');

  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Estados simples dos modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Use filteredIncomes para a lista e se estiver vazia, use incomes
  const incomesToDisplay = filteredIncomes.length > 0 ? filteredIncomes : incomes;
  const incomesWithButtons = [...incomesToDisplay, { isAddButton: true }];
  


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

  // Funções simples dos modais
  const openAddModal = () => {
    setSelectedIncome(null);
    setFormData({
      name: '',
      amount: '',
      frequency_id: '',
      category_id: '',
    });
    setShowAddModal(true);
  };

  const openEditModal = (income) => {
    setSelectedIncome(income);
    setFormData({
      name: income.name,
      amount: income.amount.toString(),
      frequency_id: income.frequency_id,
      category_id: income.category_id,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (income) => {
    setIncomeToDelete(income);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedIncome(null);
    setIncomeToDelete(null);
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
        alert('Error: Unauthenticated user. Unable to save income.');
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
      
      // Limpar o filtro quando um income é editado
      setFilteredIncomes([]);
      setSelectedCategoryId(null);
    } catch (error) {
      console.error('Unexpected error saving income:', error);
      alert('Unexpected error. Please try again.');
    } finally {
      closeModals(); // Fecha todos os modais após salvar
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
      closeModals(); // Fecha todos os modais após concluir a exclusão
    }
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
    // Agora só renderiza income cards, não o botão Add

    const isHighlighted = selectedCategoryId === item.category_id;

    return (
      <View 
        key={item.id || `income-${index}`}
        style={[
          beautifulStyles.incomeCard, 
          isHighlighted && beautifulStyles.highlightedCard
        ]}
      >
        {/* Header Row */}
        <View style={beautifulStyles.cardHeader}>
          <View style={beautifulStyles.cardHeaderLeft}>
            <View style={beautifulStyles.incomeIcon}>
              <Ionicons name="trending-up" size={18} color="#FF9800" />
            </View>
            <View>
              <Text style={beautifulStyles.incomeTitle}>{item.name}</Text>
              <Text style={beautifulStyles.incomeAmount}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          </View>
          <View style={beautifulStyles.actionButtons}>
            <TouchableOpacity
              style={beautifulStyles.editButton}
              onPress={() => {
                console.log('Edit button clicked for:', item.name); // Debug
                openEditModal(item);
              }}
            >
              <Ionicons name="pencil" size={14} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={beautifulStyles.deleteButton}
              onPress={() => {
                console.log('Delete button clicked for:', item.name); // Debug
                openDeleteModal(item);
              }}
            >
              <Ionicons name="trash" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tags Row */}
        <View style={beautifulStyles.tagsRow}>
          {item.categories && (
            <View style={[
              beautifulStyles.categoryTag,
              isHighlighted && beautifulStyles.highlightedTag
            ]}>
              <Ionicons name="folder" size={12} color={isHighlighted ? "#FFFFFF" : "#E65100"} />
              <Text style={[
                beautifulStyles.tagText,
                isHighlighted && beautifulStyles.highlightedTagText
              ]}>
                {item.categories.name}
              </Text>
            </View>
          )}
          {item.frequencies && (
            <View style={beautifulStyles.frequencyTag}>
              <Ionicons name="time" size={12} color="#2196F3" />
              <Text style={beautifulStyles.frequencyText}>
                {item.frequencies.name}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
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

  return (
    <View style={styles.container}>
      {showAlert && <AlertComponent type={alertType} message={alertMessage} onClose={() => setShowAlert(false)} />}

      <Header title="Income Management" />

      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <ScrollView 
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={beautifulStyles.pageScrollContent}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Section Header */}
          <View style={beautifulStyles.sectionHeader}>
            <Text style={beautifulStyles.sectionTitle}>Your Incomes</Text>
            <Text style={beautifulStyles.sectionSubtitle}>
              {filteredIncomes.length > 0 ? `${filteredIncomes.length} filtered` : `${incomes.length} total`}
            </Text>
          </View>

          {/* Income Cards - agora renderizados diretamente no scroll principal */}
          {incomesToDisplay.map((item, index) => renderIncomeItem(item, index))}
          
          {/* Add Button - sempre renderizado */}
          <TouchableOpacity
            style={beautifulStyles.addButton}
            onPress={openAddModal}
            activeOpacity={0.7}
          >
            <View style={beautifulStyles.addButtonIcon}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={beautifulStyles.addButtonText}>Add New Income</Text>
              <Text style={beautifulStyles.addButtonSubtext}>Track your income sources</Text>
            </View>
          </TouchableOpacity>
          
          {/* Empty State */}
          {incomes.length === 0 && (
            <View style={beautifulStyles.emptyState}>
              <Ionicons name="wallet-outline" size={64} color="#FFE082" />
              <Text style={beautifulStyles.emptyTitle}>No Incomes Yet</Text>
              <Text style={beautifulStyles.emptySubtitle}>
                Start by adding your first income source to track your earnings
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add/Edit Modal - Copied from ExpensesPage */}
      {showAddModal && (
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
            onPress={closeModals}
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
                Add Income
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
                  onValueChange={(value) => setFormData({ ...formData, frequency_id: value })}
                >
                  <Picker.Item label="Select Frequency" value="" />
                  {frequencies.map((frequency) => (
                    <Picker.Item
                      key={frequency.id}
                      label={frequency.name}
                      value={frequency.id}
                    />
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
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <Picker.Item label="Select Category" value="" />
                  {categories.map((category) => (
                    <Picker.Item
                      key={category.id}
                      label={category.name}
                      value={category.id}
                    />
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
                  onPress={closeModals}
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

      {/* Edit Modal - Copied from ExpensesPage */}
      {showEditModal && (
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
            onPress={closeModals}
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
                Edit Income
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
                  onValueChange={(value) => setFormData({ ...formData, frequency_id: value })}
                >
                  <Picker.Item label="Select Frequency" value="" />
                  {frequencies.map((frequency) => (
                    <Picker.Item
                      key={frequency.id}
                      label={frequency.name}
                      value={frequency.id}
                    />
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
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <Picker.Item label="Select Category" value="" />
                  {categories.map((category) => (
                    <Picker.Item
                      key={category.id}
                      label={category.name}
                      value={category.id}
                    />
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
                  onPress={closeModals}
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

      {/* Delete Confirmation Modal - Copied from ExpensesPage */}
      {showDeleteModal && (
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
          onPress={closeModals}
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
                color: '#FF9800',
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
                  backgroundColor: '#FF9800',
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
                onPress={closeModals}
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
    </View>
  );
};



// Estilos bonitos para elementos visuais
const beautifulStyles = {
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#FFE082',
    marginHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF8E1',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E65100',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  pageScrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#F57C00',
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#FF9800',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 8,
    marginRight: 16,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  addButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  incomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  highlightedCard: {
    borderLeftColor: '#E65100',
    backgroundColor: '#FFF8E1',
    shadowOpacity: 0.2,
    elevation: 6,
    transform: [{scale: 1.02}],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  incomeIcon: {
    backgroundColor: '#FFE082',
    borderRadius: 10,
    padding: 8,
    marginRight: 12,
  },
  incomeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 2,
  },
  incomeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#FFC107',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  deleteButton: {
    backgroundColor: '#FF5722',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryTag: {
    backgroundColor: '#FFE082',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  highlightedTag: {
    backgroundColor: '#FF9800',
  },
  frequencyTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
  },
  highlightedTagText: {
    color: '#FFFFFF',
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
};

export default IncomePage;