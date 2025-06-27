import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Função de ajuda para aplicar sombras de forma compatível
const applyBoxShadow = (params) => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${params.x}px ${params.y}px ${params.blur}px ${params.spread}px ${params.color}`
    };
  } else {
    return {
      shadowColor: params.color,
      shadowOffset: { width: params.x, height: params.y },
      shadowOpacity: params.opacity,
      shadowRadius: params.blur / 2,
      elevation: params.android,
    };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 250,
  },
  contentContainer: {
    flex: 1,
  },
  converterContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
    marginTop: -8,
  },
  converterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...applyBoxShadow({
      x: 0,
      y: 4,
      blur: 12,
      spread: 0,
      color: '#1A365D1A',
      opacity: 0.1,
      android: 6
    }),
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.1)',
  },
  converterInputRow: {
    marginBottom: 16,
  },
  converterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 6,
  },
  converterAmountInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#2D3748',
    backgroundColor: '#F7FAFC',
  },
  currencySelectionContainer: {
    marginBottom: 20,
  },
  currencySelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  currencySelection: {
    flex: 1,
  },
  currencySelectorButton: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F7FAFC',
  },
  currencySelectorCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  currencySelectorSymbol: {
    fontSize: 16,
    color: '#718096',
    marginHorizontal: 8,
  },
  swapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  conversionResultContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.2)',
    backgroundColor: 'rgba(255, 152, 0, 0.05)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  conversionResultText: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
  },
  conversionResultValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  inputRow: {
    marginBottom: 16,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#2D3748',
    backgroundColor: '#F7FAFC',
    fontWeight: '600',
  },
  baseCurrencyBox: {
    height: 56,
    paddingHorizontal: 16,
    marginLeft: 12,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    ...applyBoxShadow({
      x: 0,
      y: 2,
      blur: 4,
      spread: 0,
      color: '#FF98004D',
      opacity: 0.3,
      android: 4
    }),
  },
  baseCurrencyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  popularCurrenciesContainer: {
    marginBottom: 16,
    marginTop: 20,
  },
  popularCurrenciesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  saveInstructionText: {
    fontSize: 12,
    color: '#718096',
    fontStyle: 'italic',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  popularCurrencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedPopularCurrency: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    ...applyBoxShadow({
      x: 0,
      y: 2,
      blur: 3,
      spread: 0,
      color: '#FF980033',
      opacity: 0.2,
      android: 3
    }),
  },
  userCurrencyChip: {
    backgroundColor: 'transparent',
    borderColor: '#FFB74D',
    borderWidth: 1.5,
  },
  userCurrencyIcon: {
    marginRight: 4,
  },
  popularCurrencySymbol: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A5568',
    marginRight: 4,
  },
  popularCurrencyCode: {
    fontSize: 14,
    color: '#4A5568',
  },
  selectedPopularCurrencyText: {
    color: '#FF9800',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  infoText: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 4,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listHeaderTitles: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    width: '100%',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: '#2D3748',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: width * 0.85,
    alignItems: 'center',
    ...applyBoxShadow({
      x: 0,
      y: 8,
      blur: 24,
      spread: 0,
      color: '#1A365D33',
      opacity: 0.2,
      android: 8
    }),
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.1)',
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 24,
  },
  loadingProgress: {
    height: 4,
    width: '100%',
    borderRadius: 2,
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...applyBoxShadow({
      x: 0,
      y: 2,
      blur: 6,
      spread: 0,
      color: '#1A365D14',
      opacity: 0.08,
      android: 3
    }),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  selectedItem: {
    borderWidth: 2,
    borderColor: '#FF9800',
    backgroundColor: '#FFF8E1',
  },
  baseCurrencyItem: {
    backgroundColor: '#FFF9C4',
    opacity: 0.9,
    borderColor: '#FFB74D',
    borderWidth: 1,
  },
  userPreferredItem: {
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  savedCurrencyItem: {
    borderColor: '#2196F3',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  noSavedCurrenciesText: {
    color: '#718096',
    fontStyle: 'italic',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
    width: '100%',
  },
  currencyActions: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  bookmarkButton: {
    padding: 8,
    borderRadius: 50,
    marginTop: 10,
    alignSelf: 'center',
  },
  saveButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  removeButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  currencyInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  currencyDetails: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  currencyName: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  primaryBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rateContainer: {
    alignItems: 'flex-end',
  },
  rateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 2,
  },
  baseAmount: {
    fontSize: 12,
    color: '#718096',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginTop: 16,
  },
  actionBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '60%',
    ...applyBoxShadow({
      x: 0,
      y: -8,
      blur: 24,
      spread: 0,
      color: '#0000001A',
      opacity: 0.15,
      android: 12
    }),
  },
  selectedCurrencyInfo: {
    marginBottom: 16,
  },
  selectedCurrencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedCurrencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedCurrencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectedCurrencyDetails: {
    flex: 1,
  },
  selectedCurrencyCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 1,
  },
  selectedCurrencyName: {
    fontSize: 13,
    color: '#718096',
  },
  deselectButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionOptionsContainer: {
    marginBottom: 6,
  },
  actionOptionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
    textAlign: 'center',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    ...applyBoxShadow({
      x: 0,
      y: 1,
      blur: 4,
      spread: 0,
      color: '#0000000A',
      opacity: 0.04,
      android: 2
    }),
  },
  actionCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 1,
  },
  actionCardSubtitle: {
    fontSize: 10,
    color: '#718096',
    textAlign: 'center',
  },
  fromCurrencyCard: {
    borderColor: '#FF9800',
    backgroundColor: '#FFFAF0',
  },
  toCurrencyCard: {
    borderColor: '#2196F3',
    backgroundColor: '#F0F9FF',
  },
  mainCurrencyCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FDF4',
  },
  saveCurrencyCard: {
    borderColor: '#9C27B0',
    backgroundColor: '#FAF5FF',
  },
  actionButtonsContainer: {
    display: 'none',
  },
  actionButton: {
    display: 'none',
  },
  actionButtonHalf: {
    display: 'none',
  },
  primaryActionButtonContent: {
    display: 'none',
  },
  primaryActionButtonIcon: {
    display: 'none',
  },
  primaryActionButtonTextContainer: {
    display: 'none',
  },
  primaryActionButtonText: {
    display: 'none',
  },
  primaryActionButtonSubtext: {
    display: 'none',
  },
  secondaryActionButtonContent: {
    display: 'none',
  },
  secondaryActionButtonIcon: {
    display: 'none',
  },
  secondaryActionButtonTextContainer: {
    display: 'none',
  },
  secondaryActionButtonText: {
    display: 'none',
  },
  secondaryActionButtonSubtext: {
    display: 'none',
  },
  setMainActionButton: {
    display: 'none',
  },
  setMainActionButtonContent: {
    display: 'none',
  },
  setMainActionButtonIcon: {
    display: 'none',
  },
  setMainActionButtonTextContainer: {
    display: 'none',
  },
  setMainActionButtonText: {
    display: 'none',
  },
  setMainActionButtonSubtext: {
    display: 'none',
  },
  cancelActionButton: {
    display: 'none',
  },
  cancelActionButtonContent: {
    display: 'none',
  },
  cancelActionButtonIcon: {
    display: 'none',
  },
  cancelActionButtonTextContainer: {
    display: 'none',
  },
  cancelActionButtonText: {
    display: 'none',
  },
  cancelActionButtonSubtext: {
    display: 'none',
  },
  listContentContainer: {
    paddingBottom: 80,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  successIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    height: height * 0.7,
    ...applyBoxShadow({
      x: 0,
      y: -5,
      blur: 20,
      spread: 0,
      color: 'rgba(0,0,0,0.3)',
      opacity: 0.3,
      android: 10
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSearchIcon: {
    marginRight: 10,
  },
  modalSearchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#2D3748',
  },
  modalList: {
    flex: 1,
  },
  modalCurrencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  modalCurrencySymbol: {
    width: 40, 
    height: 40,
    borderRadius: 20,
    textAlign: 'center',
    lineHeight: 40,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCurrencyInfo: {
    flex: 1,
  },
  modalCurrencyCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  modalCurrencyName: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  modalSelectedIcon: {
    marginLeft: 8,
  },
  modalSelectedItem: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  modalUserPreferredItem: {
    backgroundColor: 'rgba(255, 152, 0, 0.05)',
  },
});

export default styles; 