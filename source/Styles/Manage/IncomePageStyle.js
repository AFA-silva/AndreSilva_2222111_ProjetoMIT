import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  header: {
    fontSize: 22, // Reduzido de 24 para 22
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#e38e20',
    padding: 12, // Reduzido de 15 para 12
    borderRadius: 8, // Reduzido de 10 para 8
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14, // Reduzido de 16 para 14
  },
  incomeItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8, // Reduzido de 10 para 8
    padding: 12, // Reduzido de 15 para 12
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  incomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  incomeTitle: {
    fontSize: 16, // Reduzido de 18 para 16
    fontWeight: 'bold',
    color: '#333',
  },
  incomeDetails: {
    fontSize: 14, // Reduzido de 16 para 14
    color: '#666',
  },
  actionButton: {
    padding: 5,
    backgroundColor: '#e3e3e3',
    borderRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%', // Reduzido de 90% para 80%
    backgroundColor: '#FFFFFF',
    borderRadius: 8, // Reduzido de 10 para 8
    padding: 15, // Reduzido de 20 para 15
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    fontSize: 18, // Reduzido de 22 para 18
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#F9F9F9',
    fontSize: 14, // Adicionado para reduzir o tamanho do texto de entrada
  },
  picker: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#F9F9F9',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12, // Reduzido de 15 para 12
    borderRadius: 6, // Reduzido de 8 para 6
    alignItems: 'center',
    marginRight: 5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14, // Reduzido de 16 para 14
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#D84315',
    padding: 12, // Reduzido de 15 para 12
    borderRadius: 6, // Reduzido de 8 para 6
    alignItems: 'center',
    marginLeft: 5,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14, // Reduzido de 16 para 14
  },
  actionButtonEdit: {
    padding: 8, // Reduzido de 10 para 8
    backgroundColor: '#FFD700', // Amarelo para o botão de edição
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDelete: {
    padding: 8, // Reduzido de 10 para 8
    backgroundColor: '#FF6347', // Vermelho para o botão de exclusão
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default styles;