import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconProfile: {
    marginBottom: 10,
    alignSelf: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 40,
    padding: 12,
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 183, 77, 0.10)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFCC80',
    borderRadius: 14,
    padding: 16,
    marginBottom: 22,
    fontSize: 16,
    color: '#222',
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: '#43A047', // verde
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#43A047',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default styles;