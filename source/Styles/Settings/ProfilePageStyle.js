import { StyleSheet, Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden', // Ensure proper clipping
  },
  // Loading Screen
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#E65100',
    fontWeight: '600',
  },
  // Error Screen
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    color: '#E65100',
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
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Header - Enhanced with gradient and visual effects
  headerContainer: {
    backgroundColor: '#FF9800', // Fallback color
    paddingTop: Platform.OS === 'ios' ? 40 : 20, // Reduced padding
    paddingBottom: 80, // Significantly reduced height
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    // Enhanced curved bottom shape - increased radius
    borderBottomLeftRadius: 50, // Increased for more visible curves
    borderBottomRightRadius: 50, // Increased for more visible curves
    marginTop: 0,
    marginBottom: -40, // Reduced overlap
    // Gradient-like effect for mobile
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(135deg, #FF9800 0%, #FF7043 50%, #FF5722 100%)',
      boxShadow: '0px 12px 32px rgba(255, 152, 0, 0.4)',
      borderBottomLeftRadius: '50px', // Ensure web compatibility
      borderBottomRightRadius: '50px', // Ensure web compatibility
    } : {
      shadowColor: '#FF5722',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 32,
      elevation: 20,
    }),
  },
  
  // Profile avatar section - Simplified and smaller design
  avatarSection: {
    alignItems: 'center',
    marginTop: 20, // Reduced margin
    marginBottom: 16, // Reduced margin
    position: 'relative',
    zIndex: 10,
  },
  avatarContainer: {
    width: 90, // Reduced size
    height: 90, // Reduced size
    borderRadius: 45,
    marginBottom: 12, // Reduced margin
    position: 'relative',
    backgroundColor: '#FFFFFF',
    padding: 4, // Reduced padding
    // Simplified border effect
    borderWidth: 2, // Reduced border
    borderColor: '#FFE082',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 8px 16px rgba(255, 152, 0, 0.2)' // Reduced shadow
    } : {
      shadowColor: '#FF9800',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  avatarPlaceholder: {
    width: 82, // Reduced size
    height: 82, // Reduced size
    borderRadius: 41,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  avatarImage: {
    width: 82, // Reduced size
    height: 82, // Reduced size
    borderRadius: 41,
    borderWidth: 0,
  },
  avatarInitials: {
    fontSize: 32, // Reduced font size
    fontWeight: '700', // Reduced weight
    color: '#FF9800',
    letterSpacing: 0.5, // Reduced spacing
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 2, // Adjusted position
    right: 2, // Adjusted position
    width: 28, // Reduced size
    height: 28, // Reduced size
    borderRadius: 14,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2, // Reduced border
    borderColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 8px rgba(255, 87, 34, 0.3)' // Reduced shadow
    } : {
      shadowColor: '#FF5722',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    }),
  },
  
  // User info section - Simplified typography
  userInfoSection: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 28, // Reduced font size
    fontWeight: '700', // Reduced weight
    color: '#FFFFFF',
    marginBottom: 6, // Reduced margin
    letterSpacing: -0.3, // Reduced spacing
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16, // Reduced font size
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20, // Reduced margin
    fontWeight: '500', // Reduced weight
    letterSpacing: 0.2, // Reduced spacing
  },
  
  // Content sections
  contentContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
    paddingTop: 50, // Reduced space for smaller avatar
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    color: '#E65100',
    marginBottom: 20,
    letterSpacing: -0.3,
    paddingHorizontal: 4,
  },
  
  // Statistics Cards - New colorful design
  statisticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  statisticCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE082',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(255, 152, 0, 0.15)'
    } : {
      shadowColor: '#FF9800',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    }),
  },
  statisticIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statisticLabel: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  statisticValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF9800',
    letterSpacing: -0.5,
  },
  
  // Info cards with more color
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFE082',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(255, 152, 0, 0.1)'
    } : {
      shadowColor: '#FF9800',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 3,
    }),
  },
  infoCardEditable: {
    borderColor: '#FF9800',
    borderWidth: 2,
    backgroundColor: '#FFFBF5',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 6px 16px rgba(255, 152, 0, 0.2)'
    } : {
      shadowColor: '#FF9800',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 6,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FF9800', // Default orange background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoIconEditing: {
    backgroundColor: '#FFC107', // Brighter orange when editing
  },
  infoIconReadOnly: {
    backgroundColor: '#94A3B8', // Gray for read-only fields (like email)
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E65100',
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
    borderWidth: 2,
  },
  infoHint: {
    fontSize: 12,
    color: '#E65100',
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
    borderWidth: 2,
  },
  infoSelectorText: {
    fontSize: 15,
    color: '#2D3748',
    flex: 1,
  },
  versionText: {
    fontSize: 16,
    color: '#E65100',
    fontWeight: '600',
  },
  
  // Action buttons with vibrant colors
  editButton: {
    backgroundColor: '#FF9800',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 6px 16px rgba(255, 152, 0, 0.3)'
    } : {
      shadowColor: '#FF9800',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  saveButton: {
    backgroundColor: '#00B894',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 6px 16px rgba(0, 184, 148, 0.3)'
    } : {
      shadowColor: '#00B894',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  secondaryActionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFE082',
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(255, 152, 0, 0.15)'
    } : {
      shadowColor: '#FF9800',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    }),
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  secondaryActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE082',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  secondaryActionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  secondaryActionSubtext: {
    fontSize: 14,
    color: '#F57C00',
    lineHeight: 18,
  },
  
  // Modal styles with project colors
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
    borderWidth: 3,
    borderColor: '#FFE082',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 20px 40px rgba(255, 152, 0, 0.2)'
    } : {
      shadowColor: '#FF9800',
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
    borderBottomWidth: 2,
    borderBottomColor: '#FFE082',
    backgroundColor: '#FFF8E1',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E65100',
    flex: 1,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#E65100',
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
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  modalButtonConfirm: {
    backgroundColor: '#FF9800',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 8px rgba(255, 152, 0, 0.3)'
    } : {
      shadowColor: '#FF9800',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Country search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBF5', // Light orange background
    borderRadius: 12,
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#FFE082',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#E65100',
  },
  clearSearchButton: {
    padding: 4,
    backgroundColor: '#FF9800',
    borderRadius: 12,
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
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFCDD2',
  },
  clearIcon: {
    marginRight: 12,
  },
  clearCountryText: {
    fontSize: 16,
    color: '#F44336',
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
    borderColor: '#FFE082',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 6px rgba(255, 152, 0, 0.1)'
    } : {
      shadowColor: '#FF9800',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
    }),
  },
  countryText: {
    fontSize: 16,
    color: '#E65100',
    fontWeight: '500',
  },
  countrySeparator: {
    height: 1,
    backgroundColor: 'transparent',
  },
  
  // Logout button with project styling
  logoutSection: {
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  logoutButton: {
    backgroundColor: '#F44336',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFCDD2',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 6px 16px rgba(244, 67, 54, 0.3)'
    } : {
      shadowColor: '#F44336',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  
  // Custom Header styles - Enhanced with gradient and visual appeal
  customHeaderWrapper: {
    width: '100%',
    position: 'relative',
    zIndex: 1,
    overflow: 'hidden',
  },
  customHeaderContainer: {
    backgroundColor: '#FF9800', // Fallback color
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // Add gradient-like effect with shadows
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(135deg, #FF9800 0%, #FF7043 50%, #FF5722 100%)',
      boxShadow: '0px 8px 24px rgba(255, 152, 0, 0.4)'
    } : {
      shadowColor: '#FF5722',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 15,
    }),
  },
  customTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 2,
    position: 'relative',
    zIndex: 2,
  },
  customHeaderTitle: {
    fontSize: 24, // Larger font
    fontWeight: '800', // Bolder weight
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1, // More letter spacing
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  customTitleUnderline: {
    height: 3, // Thicker underline
    width: 60, // Wider underline
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    borderRadius: 2,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(255, 255, 255, 0.3)'
    } : {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  
  // Decorative elements for the custom header
  decorativeCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -30,
    left: -20,
    zIndex: 0,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -10,
    right: -15,
    zIndex: 0,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -15,
    left: '50%',
    marginLeft: -30,
    zIndex: 0,
  },
});

export default styles;