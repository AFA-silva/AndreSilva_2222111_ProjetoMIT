import React, { useState, useRef, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import styles from '../../Styles/Settings/SupportPageStyle';
import { Ionicons } from '@expo/vector-icons';
import Alert from '../../Utility/Alerts';
import { supabase } from '../../../Supabase';

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
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const faqButtonAnim = useRef(new Animated.Value(0)).current;
  const floatingAnim1 = useRef(new Animated.Value(0)).current;
  const floatingAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // ScrollView ref for scroll to top functionality
  const scrollViewRef = useRef(null);
  
  // Alert state
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  
  // User session state
  const [userSession, setUserSession] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FAQ data
  const faqs = [
    { 
      id: 1, 
      question: 'How do I reset my password?',
      answer: 'To reset your password, go to the security page and tap "Password Security". Enter your old password and new password. Then tap "Update Password".',
      category: 'Account',
      icon: 'key-outline'
    },
    { 
      id: 2, 
      question: 'How can I update my profile information?',
      answer: 'Navigate to Settings > Profile to update your personal information. You can change your name, profile picture, and other account details.',
      category: 'Account',
      icon: 'person-outline'
    },
    { 
      id: 3, 
      question: 'Why is my data not syncing properly?',
      answer: 'Check your internet connection first. If the issue persists, try logging out and back in or contact us.',
      category: 'Technical',
      icon: 'sync-outline'
    },
    { 
      id: 4, 
      question: 'How do I add or edit my financial goals?',
      answer: 'Go to the Goals section in the manage page. Tap the "+" button to create a new goal or tap on existing goals to edit them. You can set target amounts, deadlines, and track your progress.',
      category: 'Features',
      icon: 'flag-outline'
    },
    { 
      id: 5, 
      question: 'Can I export my financial data?',
      answer: 'Currently, data export is not available. We are working on it.',
      category: 'Features',
      icon: 'download-outline'
    },
    { 
      id: 6, 
      question: 'How do I change my email address?',
      answer: 'Go to Settings > Security and tap "Email Security". Enter your new email and verify it through the confirmation link sent to your new email address.',
      category: 'Account',
      icon: 'mail-outline'
    },
    { 
      id: 7, 
      question: 'What currencies are supported?',
      answer: 'We support all major world currencies including USD, EUR, GBP, JPY, CAD, AUD, and many more. You can change your default currency in Manage > Currency Market.',
      category: 'Features',
      icon: 'cash-outline'
    },
    { 
      id: 8, 
      question: 'How do I delete my account?',
      answer: 'To delete your account, you need to do a request to us on the Support page.',
      category: 'Account',
      icon: 'trash-outline'
    },
  ];

  // FAQ Modal state
  const [faqModalAnim] = useState(new Animated.Value(0));

  // Get user session on component mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error fetching session:', error);
          setAlertMessage('Failed to load user session. Please log in again.');
          setAlertType('error');
          setShowAlert(true);
          return;
        }
        if (data?.session) {
          setUserSession(data.session);
        } else {
          setAlertMessage('No active session found. Please log in again.');
          setAlertType('error');
          setShowAlert(true);
        }
      } catch (error) {
        console.error('Error in fetchSession:', error);
      }
    };
    
    fetchSession();
  }, []);

  // Animation on component mount
  React.useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    
    // Main entrance animations
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver,
      }),
      Animated.parallel([
        Animated.timing(headerSlideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver,
        }),
        Animated.timing(formAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver,
        }),
      ]),
      Animated.timing(faqButtonAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver,
      })
    ]).start();

    // Floating animations for decorative elements
    const startFloatingAnimations = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatingAnim1, {
            toValue: 1,
            duration: 3000,
            useNativeDriver,
          }),
          Animated.timing(floatingAnim1, {
            toValue: 0,
            duration: 3000,
            useNativeDriver,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(floatingAnim2, {
            toValue: 1,
            duration: 4000,
            useNativeDriver,
          }),
          Animated.timing(floatingAnim2, {
            toValue: 0,
            duration: 4000,
            useNativeDriver,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 2000,
            useNativeDriver,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver,
          }),
        ])
      ).start();
    };

    const timer = setTimeout(startFloatingAnimations, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleFAQToggle = (id) => {
    setExpandedFAQs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    // Validation checks
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

    if (!userSession) {
      setAlertMessage('No active session. Please log in again.');
      setAlertType('error');
      setShowAlert(true);
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Submitting support request...');
      
      // Prepare support request data
      const supportRequestData = {
        user_id: userSession.user.id,
        subject: subject.trim(),
        message: message.trim(),
        additional_info: additionalInfo.trim() || null,
        status: 'open'
      };

      console.log('Support request data:', supportRequestData);

      // Insert into database
      const { data, error } = await supabase
        .from('support_requests')
        .insert([supportRequestData])
        .select();

      if (error) {
        console.error('Error inserting support request:', error);
        setAlertMessage(`Failed to submit support request: ${error.message}`);
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      console.log('Support request inserted successfully:', data);
      
      setAlertMessage('Your support request has been submitted! We will contact you soon.');
      setAlertType('success');
      setShowAlert(true);
      
      // Clear form after successful submission
      setSubject('');
      setMessage('');
      setAdditionalInfo('');
      
      // Scroll to top of the page
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }

    } catch (error) {
      console.error('Unexpected error submitting support request:', error);
      setAlertMessage('An unexpected error occurred. Please try again.');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-hide alert after 5 seconds (consistent with SecurityPage)
  React.useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Remove search and category filter state/logic
  // (delete searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, searchAnim, categories, filteredFAQs)

  // Instead, just use faqs and expandedFAQs

  // Remove openFAQModal/closeFAQModal's search/category logic
  const openFAQModal = () => {
    setFAQModalVisible(true);
    setExpandedFAQs({});
    Animated.timing(faqModalAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeFAQModal = () => {
    Animated.timing(faqModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setFAQModalVisible(false);
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FCFCFD' }}>
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
      {showAlert && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}
      
      <View style={styles.contentContainer}>
        {/* Decorative elements */}
        <View style={styles.gradientHeader} />
        <View style={styles.decorationCircle} />
        <View style={styles.decorationDot} />
      
        {/* Beautiful Modern Header */}
        <Animated.View 
          style={[
            { 
              opacity: fadeAnim,
              transform: [
                { translateY: headerSlideAnim },
                { scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1]
                })}
              ]
            }
          ]}
        >
          <LinearGradient
            colors={['#FF6B35', '#F79B35', '#FFD662']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modernHeaderContainer}
          >
            {/* Floating decorative elements */}
            <View style={styles.floatingCircle1} />
            <View style={styles.floatingCircle2} />
            <View style={styles.floatingCircle3} />
            <View style={styles.geometricShape} />
            
            <View style={styles.headerContent}>
              {/* Beautiful headset icon with glow effect */}
              <View style={styles.shieldContainer}>
                <View style={styles.shieldGlow} />
                <View style={styles.shieldBackground}>
                  <Ionicons name="headset" size={40} color="#FF6B35" />
                </View>
              </View>
              
              <View style={styles.textSection}>
                <Text style={styles.modernTitle}>Support Center</Text>
                <View style={styles.modernUnderline} />
              </View>
            </View>
          </LinearGradient>
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
              <TouchableOpacity 
                style={[
                  styles.submitButton, 
                  isSubmitting && styles.submitButtonDisabled
                ]} 
                onPress={handleSubmit} 
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                <Ionicons 
                  name={isSubmitting ? "hourglass" : "paper-plane"} 
                  size={18} 
                  color="#FFFFFF" 
                  style={styles.submitIcon} 
                />
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Text>
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
              <Text style={styles.supportInfoText}>projectmiteste@gmail.com</Text>
            </View>
          </View>

          {/* FAQ Button */}
          <Animated.View 
            style={[
              styles.faqButtonContainer,
              {
                opacity: faqButtonAnim,
                transform: [{ 
                  translateY: faqButtonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  }) 
                }]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.faqButton} 
              onPress={openFAQModal}
              activeOpacity={0.7}
            >
              <Ionicons name="help-circle" size={20} color="#FF9800" />
              <Text style={styles.faqButtonText}>Frequently Asked Questions</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Enhanced FAQ Modal */}
        <Modal visible={isFAQModalVisible} transparent={true} animationType="none">
          <Animated.View 
            style={[
              styles.modalOverlay,
              {
                opacity: faqModalAnim,
                backgroundColor: faqModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.6)']
                })
              }
            ]}
          >
            <Animated.View 
              style={[
                styles.enhancedModalContainer,
                {
                  transform: [
                    {
                      scale: faqModalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    },
                    {
                      translateY: faqModalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0]
                      })
                    }
                  ]
                }
              ]}
            >
              {/* Enhanced Modal Header */}
              <LinearGradient
                colors={['#FF6B35', '#F79B35', '#FFD662']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.enhancedModalHeader}
              >
                <View style={styles.enhancedHeaderContent}>
                  <View style={styles.enhancedHeaderIcon}>
                    <Ionicons name="help-circle" size={32} color="#FFFFFF" />
                  </View>
                  <View style={styles.enhancedHeaderText}>
                    <Text style={styles.enhancedModalTitle}>Help Center</Text>
                    <Text style={styles.enhancedModalSubtitle}>Find answers to common questions</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.enhancedCloseButton}
                    onPress={closeFAQModal}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* FAQ List (no search/filter) */}
              <ScrollView 
                style={styles.enhancedFaqScrollView}
                showsVerticalScrollIndicator={false}
              >
                {faqs.length > 0 ? (
                  faqs.map((faq) => (
                    <View
                      key={faq.id}
                      style={[
                        styles.enhancedFaqItem,
                        expandedFAQs[faq.id] && styles.enhancedFaqItemExpanded
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.enhancedFaqHeader}
                        onPress={() => handleFAQToggle(faq.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.enhancedFaqIcon}>
                          <Ionicons name={faq.icon} size={20} color="#FF9800" />
                        </View>
                        <View style={styles.enhancedFaqContent}>
                          <Text style={styles.enhancedFaqQuestion}>{faq.question}</Text>
                          <Text style={styles.enhancedFaqCategory}>{faq.category}</Text>
                        </View>
                        <View style={styles.enhancedFaqChevron}>
                          <Ionicons name="chevron-down" size={20} color="#FF9800" style={{ transform: [{ rotate: expandedFAQs[faq.id] ? '180deg' : '0deg' }] }} />
                        </View>
                      </TouchableOpacity>
                      {expandedFAQs[faq.id] && (
                        <View style={styles.enhancedFaqAnswer}>
                          <View style={styles.enhancedAnswerContent}>
                            <Text style={styles.enhancedAnswerText}>{faq.answer}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={48} color="#A0AEC0" />
                    <Text style={styles.noResultsText}>No questions found</Text>
                  </View>
                )}
              </ScrollView>

              {/* Enhanced Modal Footer */}
              <View style={styles.enhancedModalFooter}>
                <TouchableOpacity 
                  style={styles.enhancedContactButton}
                  onPress={closeFAQModal}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.enhancedContactButtonText}>I Understood! Go Back!</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>
        </Modal>
      </ScrollView>
    </View>
  );
};

export default SupportPage;