import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import styles from '../../Styles/Settings/SupportPageStyle';
import { Ionicons } from '@expo/vector-icons';

const SupportPage = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isFAQModalVisible, setFAQModalVisible] = useState(false);
  const [expandedFAQs, setExpandedFAQs] = useState({}); // Track which FAQs are expanded

  const faqs = [
    { id: 1, question: 'How can I contact support?', answer: 'Fill out the form on this page and submit your request. Our team will respond via email as soon as possible.' },
    { id: 2, question: 'What should I include in my message?', answer: 'Please include detailed information about the issue you are facing, including any error messages, steps to reproduce the problem, and what you were trying to accomplish.' },
    { id: 3, question: 'How long does it take to get a response?', answer: 'Our support team typically responds within 24-48 hours on business days. For urgent matters, we prioritize response times.' },
    { id: 4, question: 'Can I track my support request?', answer: 'Currently, we do not have a tracking system, but our team will reach out to you via the email associated with your account.' },
    { id: 5, question: 'Are there any charges for support?', answer: 'No, our support services are free for all users. We are committed to providing quality assistance to help you get the most out of our platform.' },
  ];

  const handleFAQToggle = (id) => {
    setExpandedFAQs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      alert('Please fill in both subject and message fields.');
      return;
    }
    alert('Your support request has been submitted! We will contact you soon.');
    // Clear form after submission
    setSubject('');
    setMessage('');
    setAdditionalInfo('');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <View style={styles.container}>
        {/* Icon and Header */}
        <Ionicons name="help-circle-outline" size={80} color="#F9A825" style={styles.icon} />
        <Text style={styles.header}>Support Center</Text>
        <Text style={styles.content}>
          Need help? Fill out the form below to contact our support team. We'll respond as soon as possible.
        </Text>

        {/* Form Inputs */}
        <View style={{ width: '100%' }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#2D3436', marginBottom: 6 }}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="What's your question about?"
            value={subject}
            onChangeText={setSubject}
            placeholderTextColor="#A0AEC0"
          />
          
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#2D3436', marginBottom: 6, marginTop: 10 }}>Message</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe your issue in detail..."
            value={message}
            onChangeText={setMessage}
            multiline
            placeholderTextColor="#A0AEC0"
          />
          
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#2D3436', marginBottom: 6, marginTop: 10 }}>Additional Information (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Any other details that might help us"
            value={additionalInfo}
            onChangeText={setAdditionalInfo}
            placeholderTextColor="#A0AEC0"
          />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit Request</Text>
        </TouchableOpacity>

        {/* FAQ Button */}
        <TouchableOpacity style={styles.faqButton} onPress={() => setFAQModalVisible(true)}>
          <Ionicons name="help-circle" size={20} color="#2D3436" />
          <Text style={styles.faqButtonText}>Frequently Asked Questions</Text>
        </TouchableOpacity>

        {/* FAQ Modal */}
        <Modal visible={isFAQModalVisible} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalHeader}>Frequently Asked Questions</Text>
              <ScrollView style={styles.faqScrollView} showsVerticalScrollIndicator={false}>
                {faqs.map((faq) => (
                  <View key={faq.id} style={styles.faqItem}>
                    <TouchableOpacity
                      style={styles.faqTitleContainer}
                      onPress={() => handleFAQToggle(faq.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <Ionicons
                        name={expandedFAQs[faq.id] ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#2D3436"
                      />
                    </TouchableOpacity>
                    {expandedFAQs[faq.id] && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.closeButton} onPress={() => setFAQModalVisible(false)}>
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