import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 16,
    textAlign: 'center',
  },
  goalItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  warningIcon: {
    marginRight: 8,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
  },
  goalAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00B894',
  },
  goalProgressContainer: {
    height: 8,
    backgroundColor: '#DFE6E9',
    borderRadius: 4,
    marginBottom: 8,
    position: 'relative',
  },
  goalProgressBar: {
    height: '100%',
    backgroundColor: '#00B894',
    borderRadius: 4,
  },
  goalProgressText: {
    position: 'absolute',
    right: 0,
    top: -20,
    fontSize: 14,
    color: '#7F8C8D',
  },
  goalDeadlineContainer: {
    marginTop: 8,
  },
  goalDeadline: {
    fontSize: 14,
    color: '#7F8C8D',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  deadlineLabel: {
    color: '#7F8C8D',
  },
  deadlineValue: {
    color: '#2D3436',
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#00B894',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 24,
  },
  modalInputContainer: {
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2D3436',
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  saveButton: {
    backgroundColor: '#00B894',
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIcon: {
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 16,
    lineHeight: 24,
  },
  originalSettingsText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 12,
    marginBottom: 4,
  },
  originalSettingsValue: {
    fontSize: 14,
    color: '#2D3436',
    lineHeight: 20,
  },
  financialMetricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
  },
  availableMoney: {
    color: '#00B894',
  },
  savingsPercentage: {
    color: '#FDCB6E',
  },
  listWrapper: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 16,
  },
  alertContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  closeButton: {
    padding: 8,
  },
  detailsGrid: {
    marginBottom: 24,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailsItem: {
    flex: 1,
    marginRight: 16,
  },
  detailsLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  detailsValue: {
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '600',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#DFE6E9',
    borderRadius: 4,
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00B894',
    borderRadius: 4,
  },
  progressText: {
    position: 'absolute',
    right: 0,
    top: -20,
    fontSize: 14,
    color: '#7F8C8D',
  },
  detailsActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  editButton: {
    backgroundColor: '#00B894',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
    marginLeft: 8,
  },
  deleteModalText: {
    fontSize: 18,
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalSubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  savingsDescription: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  deleteModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 16,
  },
  deleteModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  deleteModalCancelButton: {
    backgroundColor: '#DFE6E9',
  },
  deleteModalConfirmButton: {
    backgroundColor: '#E74C3C',
  },
  deleteModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalCancelButtonText: {
    color: '#2D3436',
  },
  deadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  datePickerButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#2D3436',
  },
});

export default styles;
