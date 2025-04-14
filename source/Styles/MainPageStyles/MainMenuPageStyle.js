import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#F4F4F4', // Fundo suave e neutro
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333333', // Título em cinza escuro
    marginBottom: 20,
    textAlign: 'center',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  menuItem: {
    width: '45%',
    aspectRatio: 1, // Mantém quadrados proporcionais
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4, // Sombra para Android
    borderWidth: 1,
    borderColor: '#E0E0E0', // Borda sutil
  },
  menuIcon: {
    fontSize: 40,
    color: '#FF9800', // Ícones com cor vibrante
    marginBottom: 10,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444444', // Texto em cinza médio
    textAlign: 'center',
  },
});

export default styles;