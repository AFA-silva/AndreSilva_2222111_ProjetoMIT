import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Fundo branco
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FF9800', // Laranja vibrante para o título
    marginBottom: 20,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#FFD700', // Amarelo vibrante
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#000', // Preto para contraste
    fontSize: 16,
    fontWeight: 'bold',
  },
  manageButton: {
    backgroundColor: '#FF9800', // Laranja
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  manageButtonText: {
    color: '#FFF', // Branco para contraste
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeItem: {
    backgroundColor: '#FFD700', // Fundo amarelo
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  incomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000', // Preto para contraste
  },
  incomeAmount: {
    fontSize: 16,
    color: '#FF4500', // Laranja escuro para valores
    marginTop: 5,
  },
  incomeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fundo semitransparente
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF', // Fundo branco
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800', // Laranja vibrante
    marginBottom: 15,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#D84315', // Vermelho para chamar atenção
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: '#FFF', // Branco para contraste
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default styles;