import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2', // Light gray
    padding: 20,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000', // Black
    marginBottom: 20,
    textAlign: 'center',
  },
  passwordButton: {
    backgroundColor: '#F57C00', // Orange
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  emailButton: {
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
  featuresSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#FFFDE7', // Light yellow
    borderRadius: 8,
    maxHeight: '60%', // Scrollable height for features
  },
  featuresHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F57C00', // Orange
    marginBottom: 10,
  },
  feature: {
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
    backgroundColor: '#F57C00', // Orange
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
  modalGoBackButton: {
    backgroundColor: '#F57C00', // Orange
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  goBackButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default styles;