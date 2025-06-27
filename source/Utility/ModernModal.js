import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  runOnJS
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ModernModal = ({ 
  visible, 
  onClose, 
  title, 
  children, 
  colorScheme = 'orange',
  size = 'medium',
  showCloseButton = true,
  animationType = 'scale'
}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);
  const backdropOpacity = useSharedValue(0);
  const rotation = useSharedValue(-2);

  // Color configurations by scheme
  const colorSchemes = {
    orange: {
      primary: '#FF9800',
      secondary: '#FFF8E1',
      border: '#FFE082',
      text: '#E65100',
      shadow: '#FF9800',
      accent: '#F57C00'
    },
    red: {
      primary: '#F44336',
      secondary: '#FFEBEE',
      border: '#FFCDD2',
      text: '#C62828',
      shadow: '#F44336',
      accent: '#D32F2F'
    },
    yellow: {
      primary: '#FFC107',
      secondary: '#FFFDE7',
      border: '#FFECB3',
      text: '#F9A825',
      shadow: '#FFC107',
      accent: '#F57F17'
    }
  };

  const colors = colorSchemes[colorScheme] || colorSchemes.orange;

  // Size configurations
  const sizes = {
    small: Math.min(screenWidth * 0.7, 300),
    medium: Math.min(screenWidth * 0.85, 400),
    large: Math.min(screenWidth * 0.95, 500)
  };

  const modalWidth = sizes[size];

  useEffect(() => {
    if (visible) {
      // More elaborate entrance animation
      scale.value = 0;
      opacity.value = 0;
      translateY.value = 50;
      backdropOpacity.value = 0;
      rotation.value = -2;
      
              // Sequential animation for entrance
      backdropOpacity.value = withTiming(1, { duration: 200 });
      
      withDelay(50, () => {
        opacity.value = withTiming(1, { 
          duration: 300, 
          easing: Easing.out(Easing.quad) 
        });
        
        translateY.value = withSpring(0, { 
          damping: 20, 
          stiffness: 200,
          mass: 0.8
        });
        
        rotation.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0, { duration: 150, easing: Easing.out(Easing.quad) })
        );
        
        scale.value = withSequence(
          withTiming(1.1, { 
            duration: 250, 
            easing: Easing.out(Easing.back(1.2)) 
          }),
          withTiming(1, { 
            duration: 150, 
            easing: Easing.inOut(Easing.quad) 
          })
        );
      });
          } else {
        // Exit animation
      const exitDuration = 200;
      opacity.value = withTiming(0, { duration: exitDuration });
      scale.value = withTiming(0.8, { duration: exitDuration });
      translateY.value = withTiming(30, { duration: exitDuration });
      backdropOpacity.value = withTiming(0, { duration: exitDuration });
    }
  }, [visible]);

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
      { rotateZ: `${rotation.value}deg` }
    ],
    opacity: opacity.value,
  }));

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scale.value, [0, 1], [0.8, 1]) }
    ],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <Animated.View 
          style={[
            styles.container, 
            {
              width: modalWidth,
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
            animatedModalStyle
          ]}
        >
          {/* Header with animation */}
          <Animated.View style={[styles.header, animatedHeaderStyle]}>
            <View style={styles.titleContainer}>
              <View style={[styles.titleIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="document-text" size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.title, { color: colors.primary }]}>
                {title}
              </Text>
            </View>
            {showCloseButton && (
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.border }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Separator line */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  overlayTouchable: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  container: {
    borderRadius: 24,
    padding: 28,
    maxHeight: '85%',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 25,
    borderWidth: 2,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleIcon: {
    padding: 8,
    borderRadius: 16,
    marginRight: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  separator: {
    height: 2,
    marginBottom: 20,
    borderRadius: 1,
    opacity: 0.3,
  },
  content: {
    flex: 1,
  },
});

export default ModernModal;

// Specialized component for forms
export const FormModal = ({ 
  visible, 
  onClose, 
  title, 
  children, 
  onSave,
  onCancel,
  saveText = "Save",
  cancelText = "Cancel",
  colorScheme = 'orange',
  saveDisabled = false
}) => {
  return (
    <ModernModal 
      visible={visible} 
      onClose={onClose} 
      title={title} 
      colorScheme={colorScheme}
      showCloseButton={false}
    >
      <View style={modalStyles.formContent}>
        {children}
      </View>
      
      <View style={modalStyles.buttonContainer}>
        <TouchableOpacity
          style={[modalStyles.button, modalStyles.cancelButton]}
          onPress={onCancel || onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color="#616161" />
          <Text style={modalStyles.cancelButtonText}>{cancelText}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[modalStyles.button, modalStyles.saveButton, saveDisabled && modalStyles.disabledButton]}
          onPress={onSave}
          activeOpacity={0.7}
          disabled={saveDisabled}
        >
          <Ionicons name="save" size={18} color="#FFFFFF" />
          <Text style={modalStyles.saveButtonText}>{saveText}</Text>
        </TouchableOpacity>
      </View>
    </ModernModal>
  );
};

// Specialized component for delete confirmation
export const DeleteModal = ({ 
  visible, 
  onClose, 
  onConfirm,
  title = "Delete Item",
  message = "Are you sure you want to delete this item?",
  subMessage = "This action cannot be undone.",
  itemName = "",
  confirmText = "Delete",
  cancelText = "Cancel"
}) => {
  return (
    <ModernModal 
      visible={visible} 
      onClose={onClose} 
      title={title} 
      colorScheme="red"
      size="small"
      showCloseButton={false}
    >
      <View style={modalStyles.deleteContent}>
        <View style={modalStyles.deleteHeader}>
          <Ionicons name="warning" size={32} color="#FF5722" />
        </View>
        
        <Text style={modalStyles.deleteMessage}>
          {message} {itemName && `"${itemName}"`}
        </Text>
        
        {subMessage && (
          <Text style={modalStyles.deleteSubMessage}>
            {subMessage}
          </Text>
        )}
        
        <View style={modalStyles.buttonContainer}>
          <TouchableOpacity
            style={[modalStyles.button, modalStyles.cancelButton]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="#616161" />
            <Text style={modalStyles.cancelButtonText}>{cancelText}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[modalStyles.button, modalStyles.deleteButton]}
            onPress={onConfirm}
            activeOpacity={0.7}
          >
            <Ionicons name="trash" size={18} color="#FFFFFF" />
            <Text style={modalStyles.deleteButtonText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModernModal>
  );
};

// Componente especializado para gerenciamento (com tabs)
export const ManageModal = ({ 
  visible, 
  onClose, 
  title = "Manage Settings",
  tabs = [],
  activeTab = 0,
  onTabChange,
  children,
  colorScheme = 'orange'
}) => {
  return (
    <ModernModal 
      visible={visible} 
      onClose={onClose} 
      title={title} 
      colorScheme={colorScheme}
      size="large"
    >
      {tabs.length > 1 && (
        <View style={modalStyles.tabContainer}>
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={index}
              style={[
                modalStyles.tab,
                activeTab === index && modalStyles.activeTab
              ]}
              onPress={() => onTabChange?.(index)}
              activeOpacity={0.7}
            >
              <Text style={[
                modalStyles.tabText,
                activeTab === index && modalStyles.activeTabText
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <View style={modalStyles.manageContent}>
        {children}
      </View>
    </ModernModal>
  );
};

const modalStyles = StyleSheet.create({
  formContent: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#FF9800',
    shadowColor: '#F57C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#E0E0E0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  deleteButton: {
    backgroundColor: '#FF5722',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  cancelButtonText: {
    color: '#616161',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  deleteContent: {
    alignItems: 'center',
  },
  deleteHeader: {
    marginBottom: 16,
  },
  deleteMessage: {
    fontSize: 16,
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  deleteSubMessage: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FF9800',
    shadowColor: '#F57C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  manageContent: {
    flex: 1,
    maxHeight: 400,
  },
  // Specific styles for income forms
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  // Estilos para lista de gerenciamento
  manageItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  manageItemText: {
    fontSize: 14,
    color: '#F57C00',
    fontWeight: '500',
    flex: 1,
  },
  manageItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  manageActionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageEditButton: {
    backgroundColor: '#FFC107',
  },
  manageDeleteButton: {
    backgroundColor: '#FF5722',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  addItemButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  manageSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
});

// Specific components for the income page

// Form modal for adding/editing incomes
export const IncomeFormModal = ({ 
  visible, 
  onClose, 
  onSave,
  selectedIncome,
  formData,
  setFormData,
  frequencies,
  categories
}) => {
  return (
    <FormModal
      visible={visible}
      onClose={onClose}
      onSave={onSave}
      title={selectedIncome ? 'Edit Income' : 'Add Income'}
      saveText="Save"
      colorScheme="orange"
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={modalStyles.inputLabel}>Income Name</Text>
        <TextInput
          style={modalStyles.input}
          placeholder="Enter income name"
          placeholderTextColor="#B0BEC5"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />
        
        <Text style={modalStyles.inputLabel}>Amount</Text>
        <TextInput
          style={modalStyles.input}
          placeholder="Enter amount"
          placeholderTextColor="#B0BEC5"
          keyboardType="numeric"
          value={formData.amount}
          onChangeText={(text) => setFormData({ ...formData, amount: text })}
        />
        
        <Text style={modalStyles.inputLabel}>Frequency</Text>
        <View style={modalStyles.picker}>
          <Picker
            selectedValue={formData.frequency_id}
            onValueChange={(itemValue) => setFormData({ ...formData, frequency_id: itemValue })}
          >
            <Picker.Item label="Select Frequency" value="" />
            {frequencies.map((frequency) => (
              <Picker.Item key={frequency.id} label={frequency.name} value={frequency.id} />
            ))}
          </Picker>
        </View>
        
        <Text style={modalStyles.inputLabel}>Category</Text>
        <View style={modalStyles.picker}>
          <Picker
            selectedValue={formData.category_id}
            onValueChange={(itemValue) => setFormData({ ...formData, category_id: itemValue })}
          >
            <Picker.Item label="Select Category" value="" />
            {categories.map((category) => (
              <Picker.Item key={category.id} label={category.name} value={category.id} />
            ))}
          </Picker>
        </View>
      </ScrollView>
    </FormModal>
  );
};

// Confirmation modal for deleting incomes
export const IncomeDeleteModal = ({ 
  visible, 
  onClose, 
  onConfirm,
  incomeToDelete
}) => {
  return (
    <DeleteModal
      visible={visible}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Income"
      message="Are you sure you want to delete"
      itemName={incomeToDelete?.name}
      subMessage="This action cannot be undone."
      confirmText="Delete"
      cancelText="Cancel"
    />
  );
};

// Management modal for categories and frequencies
export const IncomeManageModal = ({ 
  visible, 
  onClose,
  activeTab,
  setActiveTab,
  categories,
  frequencies,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddFrequency,
  onEditFrequency,
  onDeleteFrequency
}) => {
  return (
    <ManageModal
      visible={visible}
      onClose={onClose}
      title="Manage Settings"
      tabs={['Categories', 'Frequencies']}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      colorScheme="orange"
    >
      <ScrollView 
        style={{ maxHeight: 300 }} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 0 && (
          <View>
            <Text style={modalStyles.manageSectionTitle}>Income Categories</Text>
            {categories.map((category) => (
              <View key={category.id} style={modalStyles.manageItemContainer}>
                <Text style={modalStyles.manageItemText}>{category.name}</Text>
                <View style={modalStyles.manageItemActions}>
                  <TouchableOpacity 
                    style={[modalStyles.manageActionButton, modalStyles.manageEditButton]}
                    onPress={() => onEditCategory(category)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={14} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[modalStyles.manageActionButton, modalStyles.manageDeleteButton]}
                    onPress={() => onDeleteCategory(category)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity 
              style={modalStyles.addItemButton}
              onPress={onAddCategory}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={modalStyles.addItemButtonText}>Add Category</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 1 && (
          <View>
            <Text style={modalStyles.manageSectionTitle}>Frequencies</Text>
            {frequencies.map((frequency) => (
              <View key={frequency.id} style={modalStyles.manageItemContainer}>
                <Text style={modalStyles.manageItemText}>
                  {frequency.name} ({frequency.days} days)
                </Text>
                <View style={modalStyles.manageItemActions}>
                  <TouchableOpacity 
                    style={[modalStyles.manageActionButton, modalStyles.manageEditButton]}
                    onPress={() => onEditFrequency(frequency)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={14} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[modalStyles.manageActionButton, modalStyles.manageDeleteButton]}
                    onPress={() => onDeleteFrequency(frequency)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity 
              style={modalStyles.addItemButton}
              onPress={onAddFrequency}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={modalStyles.addItemButtonText}>Add Frequency</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ManageModal>
  );
}; 