import { StyleSheet, Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: '#F7F9FC',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 30,
    textAlign: 'center',
    letterSpacing: 0.5,
    ...(Platform.OS === 'web' ? {
      textShadow: '0 1px 3px rgba(255, 152, 0, 0.15)'
    } : {
      textShadowColor: 'rgba(255, 152, 0, 0.15)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    }),
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  menuItem: {
    width: '46%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 5px 12px rgba(26, 54, 93, 0.1)'
    } : {
      shadowColor: '#1A365D',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    }),
    borderWidth: 0,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  menuItemGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#FF9800',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  menuIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuIcon: {
    fontSize: 34,
    color: '#FF9800',
    ...(Platform.OS === 'web' ? {
      textShadow: '0 2px 3px rgba(255, 152, 0, 0.2)'
    } : {
      textShadowColor: 'rgba(255, 152, 0, 0.2)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 3,
    }),
  },
  menuText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  menuSubtext: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    marginTop: 4,
  },
  statsContainer: {
    marginBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statsCard: {
    width: '46%',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 3px 8px rgba(26, 54, 93, 0.08)'
    } : {
      shadowColor: '#1A365D',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    }),
    marginBottom: 16,
  },
  statsLabel: {
    fontSize: 14, 
    color: '#718096',
    marginBottom: 6,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  dashboardSection: {
    marginBottom: 24,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginLeft: 8,
  },
  sectionIcon: {
    opacity: 0.9,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  currencyButtonText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
    marginLeft: 5,
  },
  
  // Financial Modal Styles
  financialModal: {
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
      width: '85%',
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 0,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    closeButton: {
      padding: 4,
    },
    headerGradient: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    summaryBox: {
      padding: 20,
      backgroundColor: '#F9FAFB',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    summaryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    summaryLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#4A5568',
      flex: 1,
      marginLeft: 8,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '700',
      color: '#2D3748',
    },
    summaryDivider: {
      height: 1,
      backgroundColor: '#E2E8F0',
      marginBottom: 16,
    },
    contentContainer: {
      padding: 20,
    },
    balanceSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#4A5568',
      marginBottom: 12,
    },
    balanceCard: {
      backgroundColor: '#F7FAFC',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
      shadowColor: '#1A365D',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    balanceLabel: {
      fontSize: 14,
      color: '#718096',
      marginBottom: 8,
      fontWeight: '500',
    },
    balanceValue: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    allocationSection: {
      marginBottom: 10,
    },
    allocationCard: {
      backgroundColor: '#F7FAFC',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
      shadowColor: '#1A365D',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    allocationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    allocationAmount: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#2D3748',
    },
    percentageBadge: {
      backgroundColor: '#FF9800',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    percentageText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    progressBarContainer: {
      height: 12,
      backgroundColor: '#EDF2F7',
      borderRadius: 6,
      marginBottom: 16,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 6,
    },
    allocationDescription: {
      fontSize: 14,
      color: '#718096',
      textAlign: 'center',
      lineHeight: 20,
    },
    icon: {
      width: 24,
    },
    okButton: {
      margin: 20,
      marginTop: 10,
      borderRadius: 12,
      overflow: 'hidden',
    },
    buttonGradient: {
      padding: 14,
      alignItems: 'center',
    },
    okButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
  }
});

export default styles;