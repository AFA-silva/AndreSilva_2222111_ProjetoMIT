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
      question: 'How do I reset my password?'
    },
    { 
      id: 2, 
      question: 'How can I update my profile information?'
    },
    { 
      id: 3, 
      question: 'Why is my data not syncing properly?'
    },
    { 
      id: 4, 
      question: 'How do I add or edit my financial goals?'
    },
    { 
      id: 5, 
      question: 'Can I export my financial data?'
    },
    { 
      id: 6, 
      question: 'How do I change my email address?'
    },
    { 
      id: 7, 
      question: 'What currencies are supported?'
    },
    { 
      id: 8, 
      question: 'How do I delete my account?'
    },
    { 
      id: 9, 
      question: 'Why am I not receiving notifications?'
    },
    { 
      id: 10, 
      question: 'How do I contact customer support?'
    },
  ];

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
              <Text style={styles.supportInfoText}>AndreSupabase@gmail.com</Text>
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
              onPress={() => setFAQModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="help-circle" size={20} color="#FF9800" />
              <Text style={styles.faqButtonText}>Frequently Asked Questions</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* FAQ Modal */}
        <Modal visible={isFAQModalVisible} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Frequently Asked Questions</Text>
                <TouchableOpacity onPress={() => setFAQModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.faqScrollView}>
                {faqs.map((faq) => (
                  <TouchableOpacity
                    key={faq.id}
                    style={styles.faqItem}
                    onPress={() => handleFAQToggle(faq.id)}
                  >
                    <View style={styles.faqTitleContainer}>
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <Ionicons
                        name={expandedFAQs[faq.id] ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#FF9800"
                      />
                    </View>
                    {expandedFAQs[faq.id] && (
                      <Text style={styles.faqAnswer}>
                        This is a placeholder answer for: {faq.question}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

export default SupportPage;