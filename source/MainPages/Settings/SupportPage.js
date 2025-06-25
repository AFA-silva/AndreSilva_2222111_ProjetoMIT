import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  Animated,
  Platform
} from 'react-native';
import styles from '../../Styles/Settings/SupportPageStyle';
import { Ionicons } from '@expo/vector-icons';
import Alert from '../../Utility/Alerts';

const SupportPage = () => {
  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isFAQModalVisible, setFAQModalVisible] = useState(false);
  const [expandedFAQs, setExpandedFAQs] = useState({});
  
  // Input focus states
  const [focusedInput, setFocusedInput] = useState(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  
  // Alert state
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');

  // FAQ data
  const faqs = [
    { 
      id: 1, 
      question: 'How can I contact support?', 
      answer: 'Fill out the form on this page and submit your request. Our team will respond via email as soon as possible, typically within 24 hours on business days.' 
    },
    { 
      id: 2, 
      question: 'What should I include in my message?', 
      answer: 'Please include detailed information about the issue you are facing, including any error messages, steps to reproduce the problem, and what you were trying to accomplish. Screenshots can be very helpful.' 
    },
    { 
      id: 3, 
      question: 'How long does it take to get a response?', 
      answer: 'Our support team typically responds within 24-48 hours on business days. For urgent matters, we prioritize response times and aim to get back to you as soon as possible.' 
    },
    { 
      id: 4, 
      question: 'Can I track my support request?', 
      answer: 'Currently, we do not have a tracking system, but our team will reach out to you via the email associated with your account. If you need to follow up, simply reply to the email thread.' 
    },
    { 
      id: 5, 
      question: 'Are there any charges for support?', 
      answer: 'No, our support services are free for all users. We are committed to providing quality assistance to help you get the most out of our platform without any additional fees.' 
    },
    { 
      id: 6, 
      question: 'What hours is support available?', 
      answer: 'Our support team is available Monday through Friday from 9:00 AM to 6:00 PM (GMT). While we may respond outside these hours, official support is provided during business days.' 
    },
  ];

  // Animation on component mount
  React.useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver,
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver,
      })
    ]).start();
  }, []);

  const handleFAQToggle = (id) => {
    setExpandedFAQs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = () => {
    if (!subject.trim()) {
      setAlertMessage('Please fill in the subject field');
      setAlertType('error');
      setShowAlert(true);
      return;
    }
    
    if (!message.trim()) {
      setAlertMessage('Please fill in the message field');
      setAlertType('error');
      setShowAlert(true);
      return;
    }
    
    setAlertMessage('Your support request has been submitted! We will contact you soon.');
    setAlertType('success');
    setShowAlert(true);
    
    // Clear form after submission
    setSubject('');
    setMessage('');
    setAdditionalInfo('');
  };

  // Auto-hide alert after 3 seconds
  React.useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {showAlert && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}
      
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          {/* Decorative elements */}
          <View style={styles.gradientHeader} />
          <View style={styles.decorationCircle} />
          <View style={styles.decorationDot} />
          
          {/* Icon and Header */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: fadeAnim }] }}>
            <View style={styles.iconBackground}>
              <Ionicons name="help-circle-outline" size={80} color="#F9A825" style={styles.icon} />
            </View>
            <Text style={styles.header}>Support Center</Text>
            <Text style={styles.content}>
              Need help? Fill out the form below to contact our support team. We'll respond as soon as possible.
            </Text>
          </Animated.View>

          {/* Form Inputs */}
          <Animated.View 
            style={[
              styles.formCard,
              { 
                opacity: formAnim,
                transform: [{ 
                  translateY: formAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  })
                }]
              }
            ]}
          >
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput
                style={[
                  styles.input, 
                  focusedInput === 'subject' && styles.focusedInput
                ]}
                placeholder="What's your question about?"
                placeholderTextColor="#A0AEC0"
                value={subject}
                onChangeText={setSubject}
                onFocus={() => setFocusedInput('subject')}
                onBlur={() => setFocusedInput(null)}
              />
              <Text style={styles.inputHelpText}>Choose a clear subject that describes your issue</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[
                  styles.textArea, 
                  focusedInput === 'message' && styles.focusedInput
                ]}
                placeholder="Describe your issue in detail..."
                placeholderTextColor="#A0AEC0"
                value={message}
                onChangeText={setMessage}
                multiline
                onFocus={() => setFocusedInput('message')}
                onBlur={() => setFocusedInput(null)}
                textAlignVertical="top"
              />
              <Text style={styles.inputHelpText}>Include all relevant details that might help us assist you better</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Additional Information (Optional)</Text>
              <TextInput
                style={[
                  styles.input, 
                  focusedInput === 'additionalInfo' && styles.focusedInput
                ]}
                placeholder="Any other details that might help us"
                placeholderTextColor="#A0AEC0"
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
                onFocus={() => setFocusedInput('additionalInfo')}
                onBlur={() => setFocusedInput(null)}
              />
              <Text style={styles.inputHelpText}>You can include account information or specific steps to reproduce the issue</Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}>
                <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={styles.submitIcon} />
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={styles.divider} />

          {/* Contact Information */}
          <View style={styles.supportInfoContainer}>
            <Text style={styles.supportInfoTitle}>Contact Information</Text>
            
            <View style={styles.supportInfo}>
              <View style={styles.supportInfoIcon}>
                <Ionicons name="mail-outline" size={20} color="#F9A825" />
              </View>
              <Text style={styles.supportInfoText}>AndreSupabase@gmail.com</Text>
            </View>
          </View>

          {/* FAQ Button */}
          <View style={styles.faqButtonContainer}>
            <TouchableOpacity 
              style={styles.faqButton} 
              onPress={() => setFAQModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="help-circle" size={20} color="#2D3436" />
              <Text style={styles.faqButtonText}>Frequently Asked Questions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Modal */}
        <Modal visible={isFAQModalVisible} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderContainer}>
                <Text style={styles.modalHeader}>Frequently Asked Questions</Text>
                <TouchableOpacity 
                  style={styles.closeIcon} 
                  onPress={() => setFAQModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#2D3436" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.faqScrollView} showsVerticalScrollIndicator={false}>
                {faqs.map((faq) => (
                  <View 
                    key={faq.id} 
                    style={[
                      styles.faqItem,
                      expandedFAQs[faq.id] && styles.activeFaqItem
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.faqTitleContainer}
                      onPress={() => handleFAQToggle(faq.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <Ionicons
                        name={expandedFAQs[faq.id] ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={expandedFAQs[faq.id] ? "#F9A825" : "#2D3436"}
                      />
                    </TouchableOpacity>
                    {expandedFAQs[faq.id] && (
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
              
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setFAQModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={20} color="#4A5568" style={{ marginRight: 8 }} />
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

export default SupportPage;