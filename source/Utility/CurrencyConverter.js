import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchExchangeRates, getCurrentCurrency, formatCurrency, formatCurrencyWithCode, shouldConvertCurrencyValues } from './FetchCountries';

// Cache exchange rates to avoid multiple API calls
let exchangeRatesCache = {
  rates: {},
  lastUpdated: null,
  baseCurrency: null
};

// Fixed exchange rates as fallback when API fails
const getFixedRate = (fromCurrency, toCurrency) => {
  const fixedRates = {
    'EUR': { 'USD': 1.1, 'GBP': 0.85, 'JPY': 130 },
    'USD': { 'EUR': 0.91, 'GBP': 0.77, 'JPY': 118 },
    'GBP': { 'EUR': 1.18, 'USD': 1.30, 'JPY': 153 },
    'JPY': { 'EUR': 0.0077, 'USD': 0.0085, 'GBP': 0.0065 }
  };
  
  return fixedRates[fromCurrency]?.[toCurrency] || null;
};

// Function to automatically convert values based on current currency
export const convertCurrency = async (value, fromCurrency, toCurrency, shouldConvert = true) => {
  try {
    // Check if conversion is enabled
    if (!shouldConvert) {
      // Removed console.log - not essential
      return value;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      console.error('Invalid value for conversion:', value);
      return value;
    }

    // Get current currency
    const currentCurrency = getCurrentCurrency();
    if (!currentCurrency || !currentCurrency.code) {
      console.error('No current currency available');
      return value;
    }

    // If fromCurrency is not provided, use current currency
    if (!fromCurrency) {
      fromCurrency = currentCurrency.code;
    }

    // If currencies are the same, no conversion needed
    if (fromCurrency === currentCurrency.code) {
      // Removed console.log - not essential
      return value;
    }

    // Try to get conversion rate
    let rate = null;
    
    // First try to get from cache
    if (exchangeRatesCache && exchangeRatesCache.rates && exchangeRatesCache.rates[fromCurrency]) {
      rate = exchangeRatesCache.rates[fromCurrency];
      // Removed console.log - not essential
    } else {
      // Try to fetch from API
      try {
        const rates = await fetchExchangeRates(fromCurrency);
        if (rates && rates[currentCurrency.code]) {
          rate = rates[currentCurrency.code];
          // Removed console.log - not essential
        }
      } catch (apiError) {
        console.error('Error fetching exchange rates:', apiError);
      }
    }

    // If still no rate, try fixed rates as fallback
    if (!rate) {
      const fixedRate = getFixedRate(fromCurrency, currentCurrency.code);
      if (fixedRate) {
        // Removed console.log - not essential
        const result = numValue * fixedRate;
        // Removed console.log - not essential
        return result.toFixed(2);
      }
      
      console.error(`No conversion rate available for ${fromCurrency} to ${currentCurrency.code}`);
      return value;
    }

    // Removed console.log - not essential
    const convertedValue = numValue * rate;
    // Removed console.log - not essential
    
    return convertedValue.toFixed(2);
  } catch (error) {
    console.error('Error in convertCurrency:', error);
    return value;
  }
};

export const CurrencyConverterField = ({ value, onValueChange, style = {} }) => {
  const [amount, setAmount] = useState(value ? value.toString() : '');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

      // Load rates and initialize
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        
        // Get current currency
        const currentCurrency = getCurrentCurrency();
        
        // Fetch exchange rates
        const rates = await fetchExchangeRates(currentCurrency.code);
        
        // Prepare list of available currencies
        const currencies = Object.keys(rates).map(code => ({
          code,
          rate: rates[code]
        }));
        
        setAvailableCurrencies(currencies);
        
        // If no currency selected, use EUR as default
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
          setConvertedAmount('Rate not available');
          return;
        }
        
        const result = inputValue * rates[targetCurrency];
        const formatted = await formatCurrencyWithCode(result, targetCurrency);
        setConvertedAmount(formatted);
        
        // Update value in parent component
        if (onValueChange) {
          onValueChange(inputValue);
        }
      } catch (error) {
        console.error('Error in conversion:', error);
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
          placeholder="Enter amount"
        />
        <Text style={styles.currencySymbol}>
          {getCurrentCurrency().symbol}
        </Text>
      </View>
      
      {convertedAmount ? (
        <View style={styles.convertedContainer}>
          <Text style={styles.convertedLabel}>Converted value:</Text>
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
      
      {/* Currency selection modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>
            
            {isLoading ? (
              <Text style={styles.loadingText}>Loading currencies...</Text>
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

// Helper function to convert a value from a source currency to the current currency
export const convertValueToCurrentCurrency = async (value, fromCurrency) => {
  try {
    // Get current currency
    const currentCurrency = getCurrentCurrency();
    if (!currentCurrency || !currentCurrency.code) {
      console.error('No current currency available');
      return value;
    }

    // Check if conversion should be performed
    const shouldConvert = shouldConvertCurrencyValues();
    
    // Use the existing convertCurrency function
    return await convertCurrency(value, fromCurrency, currentCurrency.code, shouldConvert);
  } catch (error) {
    console.error('Error in convertValueToCurrentCurrency:', error);
    return value;
  }
};

export default CurrencyConverterField; 