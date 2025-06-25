import { StyleSheet, Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  // Loading Screen
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  // Error Screen
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Header - Beautiful hero section
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  
  // Profile avatar section
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 20,
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 12px 24px rgba(255, 152, 0, 0.2)'
    } : {
      shadowColor: '#FF9800',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    }),
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarInitials: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    }),
  },
  
  // User info section
  userInfoSection: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 24,
    fontWeight: '500',
  },
  
  // Content sections
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  
  // Information sections
  infoSection: {
    marginBottom: 32,
  },
  actionsSection: {
    marginBottom: 32,
  },
  appInfoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  
  // Info cards
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.06)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  infoCardEditable: {
    borderColor: '#FF9800',
    borderWidth: 2,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 8px rgba(255, 152, 0, 0.15)'
    } : {
      shadowColor: '#FF9800',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  infoCardReadOnly: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1,
  },
  infoInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D3748',
    borderWidth: 1,
    borderColor: 'transparent',
    marginTop: 2,
  },
  infoInputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
    opacity: 0.8,
  },
  infoInputEditable: {
    backgroundColor: '#FFFBF5',
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  infoHint: {
    fontSize: 12,
    color: '#718096',
    marginTop: 6,
    fontStyle: 'italic',
  },
  infoSelector: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  infoSelectorEditable: {
    backgroundColor: '#FFFBF5',
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  infoSelectorText: {
    fontSize: 15,
    color: '#2D3748',
    flex: 1,
  },
  versionText: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },
  statisticValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FF9800',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  
  // Action buttons
  editButton: {
    backgroundColor: '#FF9800',
    borderRadius: 14,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(255, 152, 0, 0.25)'
    } : {
      shadowColor: '#FF9800',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    }),
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(16, 185, 129, 0.25)'
    } : {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    }),
  },
  secondaryActionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 152, 0, 0.2)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  secondaryActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  secondaryActionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 0,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.2)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.2,
      shadowRadius: 40,
      elevation: 20,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F9FC',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    flex: 1,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F9FC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 24,
    paddingTop: 0,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalButtonConfirm: {
    backgroundColor: '#FF9800',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Country search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#2D3748',
  },
  clearSearchButton: {
    padding: 4,
  },
  
  // Countries list styles
  countriesContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  clearCountryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearIcon: {
    marginRight: 12,
  },
  clearCountryText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
  countriesList: {
    flex: 1,
  },
  countryItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F7F9FC',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    }),
  },
  countryText: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '500',
  },
  countrySeparator: {
    height: 1,
    backgroundColor: 'transparent',
  },
  
  // Logout button
  logoutSection: {
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  logoutButton: {
    backgroundColor: '#F44336',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(244, 67, 54, 0.3)'
    } : {
      shadowColor: '#F44336',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    }),
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default styles;