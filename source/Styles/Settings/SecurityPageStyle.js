import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2', // White
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000', // Black
    marginBottom: 20,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#F9A825', // Yellow
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tipsSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#FFFDE7', // Light yellow
    borderRadius: 8,
  },
  tipsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F57C00', // Orange
    marginBottom: 10,
  },
  tip: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#F57C00',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  goBackButton: {
    backgroundColor: '#F9A825', // Grey
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  goBackButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default styles;