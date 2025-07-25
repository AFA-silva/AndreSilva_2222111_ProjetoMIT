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
  menuContainer: {
    marginTop: 15,
    paddingHorizontal: 5,
  },
  managerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 3px 8px rgba(26, 54, 93, 0.08)'
    } : {
      shadowColor: '#1A365D',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    }),
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    transform: [{ translateX: 0 }],
    transition: 'transform 0.2s',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginLeft: 16,
    letterSpacing: 0.3,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
    marginLeft: 16,
    letterSpacing: 0.2,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
    backgroundColor: '#F5F7FA',
    borderLeftColor: '#CBD5E0',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(113, 128, 150, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  comingSoonText: {
    fontSize: 10,
    color: '#718096',
    fontWeight: '600',
  },
});

export default styles;