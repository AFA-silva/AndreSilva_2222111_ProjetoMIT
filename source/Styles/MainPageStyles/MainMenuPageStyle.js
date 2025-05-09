import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 45,
    backgroundColor: '#FAFAFA', // Fundo mais claro
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F57C00', // Título laranja forte
    marginBottom: 28,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 183, 77, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  menuItem: {
    width: '46%',
    aspectRatio: 1,
    backgroundColor: '#FFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#FFECB3',
    padding: 10,
  },
  menuIcon: {
    fontSize: 44,
    color: '#FFA726', // Ícones laranja vibrante
    marginBottom: 12,
    textShadowColor: 'rgba(255, 183, 77, 0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  menuText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default styles;