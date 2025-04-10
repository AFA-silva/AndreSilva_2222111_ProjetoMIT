import { StyleSheet } from 'react-native';

export const getSettingsPageStyles = (isDarkMode) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#121212' : '#fff',
      padding: 20,
    },
    header: {
      fontSize: 26,
      fontWeight: 'bold',
      color: isDarkMode ? '#FFA726' : '#FF9800',
      marginBottom: 30,
      marginTop: 20,
    },
    button: {
      width: '80%',
      padding: 15,
      backgroundColor: isDarkMode ? '#333333' : '#FFB300',
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 15,
    },
    buttonText: {
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000',
      fontWeight: 'bold',
    },
    logoutButton: {
      width: '80%',
      padding: 15,
      backgroundColor: isDarkMode ? '#D32F2F' : '#D84315',
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 20,
    },
    logoutText: {
      fontSize: 16,
      color: '#FFF',
      fontWeight: 'bold',
    },
  });
};