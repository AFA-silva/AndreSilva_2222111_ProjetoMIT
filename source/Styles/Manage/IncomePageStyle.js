import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  addButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    minHeight: 50,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  incomeItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FFE082',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  incomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E65100',
    letterSpacing: 0.3,
  },
  incomeDetails: {
    fontSize: 15,
    color: '#FF9800',
    letterSpacing: 0.2,
    fontWeight: '600',
  },
  actionButton: {
    padding: 5,
    backgroundColor: '#F7FAFC',
    borderRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
    maxHeight: '85%',
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF9800',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#E0E0E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  closeButtonText: {
    color: '#616161',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#F57C00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#F57C00',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
    marginLeft: 8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  actionButtonEdit: {
    padding: 10,
    backgroundColor: '#FFC107',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonDelete: {
    padding: 10,
    backgroundColor: '#FF5722',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  categoryHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E65100',
    letterSpacing: 0.3,
  },
  addCategoryButton: {
    padding: 8,
  },
  categoryTag: {
    backgroundColor: '#FFE082',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryText: {
    color: '#E65100',
    fontSize: 12,
    fontWeight: '600',
  },
  frequencyTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  frequencyText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF5722',
    letterSpacing: 0.5,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#E65100',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  deleteModalSubtext: {
    fontSize: 14,
    color: '#F57C00',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE082',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    color: '#E65100',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  filterInfoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FFE082',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  filterInfoText: {
    color: '#F57C00',
    fontSize: 13,
    fontWeight: '600',
  },
  modalScrollView: {
    maxHeight: 400,
    paddingRight: 4,
  },
  modalIncomeItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE082',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  modalItemAmount: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '600',
  },
  modalItemDetails: {
    fontSize: 14,
    color: '#F57C00',
    marginTop: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  filterButtonText: {
    color: '#FF9800',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 12,
    alignSelf: 'center',
    shadowColor: '#F57C00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F57C00',
  },
  clearFilterButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 1,
  },
  categoryFilterItem: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    margin: 6,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '45%',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  categoryFilterItemSelected: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FF9800',
    borderWidth: 2,
  },
  categoryFilterText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryFilterTextSelected: {
    color: '#E65100',
    fontWeight: '700',
  },
  categoryFilterRow: {
    justifyContent: 'space-between',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  filterHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F57C00',
  },
  categoryList: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  categoryChipSelected: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FF9800',
    borderWidth: 2,
  },
  categoryChipText: {
    color: '#E65100',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: '#E65100',
    fontWeight: '700',
  },
  categoryChipIndicator: {
    backgroundColor: '#FF9800',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  chartContainer: {
    width: '100%',
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  highlightedIncomeItem: {
    borderColor: '#FF9800',
    borderWidth: 2,
    backgroundColor: '#FFF8E1',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    transform: [{scale: 1.02}],
  },
  highlightedCategoryTag: {
    backgroundColor: '#FF9800',
    borderWidth: 1,
    borderColor: '#F57C00',
  },
  highlightedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 1,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: '#FF9800',
  },
  manageButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{scale: 0.98}],
  },
  manageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  manageButtonIcon: {
    backgroundColor: '#FF9800',
    borderRadius: 20,
    padding: 8,
    marginRight: 10,
    shadowColor: '#F57C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  manageButtonText: {
    color: '#F57C00',
    fontSize: 18,
    fontWeight: '700',
  },
  manageButtonSubtext: {
    color: '#FF9800',
    fontSize: 12,
    fontStyle: 'italic',
  },
  manageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageModalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
    borderWidth: 2,
    borderColor: '#FFE082',
    maxHeight: '80%',
  },
  manageModalHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF9800',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  manageTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  manageTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  manageTabActive: {
    backgroundColor: '#FF9800',
    shadowColor: '#F57C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  manageTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
  },
  manageTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  manageSection: {
    flex: 1,
  },
  manageSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  manageItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  manageItemText: {
    fontSize: 14,
    color: '#F57C00',
    fontWeight: '500',
    flex: 1,
  },
  manageItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  manageActionButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageEditButton: {
    backgroundColor: '#FFC107',
  },
  manageDeleteButton: {
    backgroundColor: '#FF5722',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
  },
  addItemButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  manageModalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  manageCloseButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#F57C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  manageCloseButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  manageScrollView: {
    maxHeight: 200,
  },
  // Skeleton loading styles
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  skeletonChart: {
    height: 180,
    backgroundColor: '#FFF8E1',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  skeletonItem: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    height: 120,
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  // Manage button styles aligned with add button
  manageItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{scale: 0.98}],
  },
  manageButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{scale: 0.98}],
  },
});

export default styles;