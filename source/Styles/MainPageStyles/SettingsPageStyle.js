import { StyleSheet, Platform } from 'react-native';

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  container: {
    padding: 16,
    paddingTop: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 30,
    textAlign: 'center',
    letterSpacing: 0.5,
    ...(Platform.OS === 'web' ? {
      textShadow: '0px 1px 3px rgba(255, 152, 0, 0.15)'
    } : {
      textShadowColor: 'rgba(255, 152, 0, 0.15)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    }),
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 3px 8px rgba(26, 54, 93, 0.1)'
    } : {
      shadowColor: '#1A365D',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    letterSpacing: 0.3,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 5,
    flexWrap: 'wrap',
    maxWidth: '100%',
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: '#F56565',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 10px rgba(245, 101, 101, 0.25)'
    } : {
      shadowColor: '#F56565',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
    }),
  },
  logoutText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 12,
    marginTop: 12,
    paddingLeft: 4,
    letterSpacing: 0.5,
  },
});

export default styles;