import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchExchangeRates, getCurrentCurrency, formatCurrency, formatCurrencyWithCode } from './FetchCountries';

export const CurrencyConverterField = ({ value, onValueChange, style = {} }) => {
  const [amount, setAmount] = useState(value ? value.toString() : '');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar taxas e inicializar
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        
        // Obter a moeda atual
        const currentCurrency = getCurrentCurrency();
        
        // Buscar taxas de câmbio
        const rates = await fetchExchangeRates(currentCurrency.code);
        
        // Preparar lista de moedas disponíveis
        const currencies = Object.keys(rates).map(code => ({
          code,
          rate: rates[code]
        }));
        
        setAvailableCurrencies(currencies);
        
        // Se não houver moeda selecionada, usar EUR como padrão
        if (!targetCurrency) {
          setTargetCurrency('EUR');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Erro inicializando conversor:', error);
        setIsLoading(false);
      }
    };
    
    init();
  }, []);
  
  // Converter valor quando o input mudar
  useEffect(() => {
    const convert = async () => {
      try {
        const inputValue = parseFloat(amount);
        if (isNaN(inputValue)) {
          setConvertedAmount('');
          return;
        }
        
        const currentCurrency = getCurrentCurrency();
        const rates = await fetchExchangeRates(currentCurrency.code);
        
        if (!rates[targetCurrency]) {
          setConvertedAmount('Taxa não disponível');
          return;
        }
        
        const result = inputValue * rates[targetCurrency];
        const formatted = await formatCurrencyWithCode(result, targetCurrency);
        setConvertedAmount(formatted);
        
        // Atualizar valor no componente pai
        if (onValueChange) {
          onValueChange(inputValue);
        }
      } catch (error) {
        console.error('Erro na conversão:', error);
      }
    };
    
    convert();
  }, [amount, targetCurrency]);
  
  // Renderizar item da lista de moedas
  const renderCurrencyItem = ({ item }) => (
    <TouchableOpacity
      style={styles.currencyItem}
      onPress={() => {
        setTargetCurrency(item.code);
        setModalVisible(false);
      }}
    >
      <Text style={styles.currencyCode}>{item.code}</Text>
      <Text style={styles.currencyRate}>{item.rate.toFixed(4)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="Digite o valor"
        />
        <Text style={styles.currencySymbol}>
          {getCurrentCurrency().symbol}
        </Text>
      </View>
      
      {convertedAmount ? (
        <View style={styles.convertedContainer}>
          <Text style={styles.convertedLabel}>Valor convertido:</Text>
          <View style={styles.convertedRow}>
            <Text style={styles.convertedAmount}>{convertedAmount}</Text>
            <TouchableOpacity 
              style={styles.currencySelectorButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.currencySelectorButtonText}>{targetCurrency}</Text>
              <Ionicons name="chevron-down" size={16} color="#555" />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      
      {/* Modal de seleção de moeda */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Moeda</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>
            
            {isLoading ? (
              <Text style={styles.loadingText}>Carregando moedas...</Text>
            ) : (
              <FlatList
                data={availableCurrencies}
                renderItem={renderCurrencyItem}
                keyExtractor={(item) => item.code}
                style={styles.currencyList}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    padding: 10,
    fontSize: 16,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#555',
    marginLeft: 5,
  },
  convertedContainer: {
    marginTop: 5,
  },
  convertedLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  convertedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convertedAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  currencySelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  currencySelectorButtonText: {
    fontSize: 14,
    marginRight: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
  },
  currencyList: {
    maxHeight: 300,
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  currencyRate: {
    fontSize: 14,
    color: '#666',
  },
});

export default CurrencyConverterField; 