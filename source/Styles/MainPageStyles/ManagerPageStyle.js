import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 35,
    marginTop: 15,
  },
  menuContainer: {
    width: '100%',
    alignItems: 'center',
  },
  managerButton: {
    width: '85%',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#FFB300',
    borderWidth: 2,
    borderColor: '#FF9800',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 2, height: 2 },
    shadowRadius: 4,
    elevation: 3, // Para Android
  },
  buttonText: {
    fontSize: 17,
    color: '#000',
    fontWeight: 'bold',
  },
});

export default styles;
