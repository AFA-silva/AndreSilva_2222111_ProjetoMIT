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
    { id: 1, question: 'How can I contact support?', answer: 'Fill out the form on this page and submit your request.' },
    { id: 2, question: 'What should I include in my message?', answer: 'Please include detailed information about the issue you are facing.' },
    { id: 3, question: 'How long does it take to get a response?', answer: 'Our support team typically responds within 24-48 hours.' },
    { id: 4, question: 'Can I track my support request?', answer: 'Currently, we do not have a tracking system, but our team will reach out to you.' },
    { id: 5, question: 'Are there any charges for support?', answer: 'No, our support services are free for all users.' },
  ];

  const handleFAQToggle = (id) => {
    setExpandedFAQs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = () => {
    alert('Your support request has been submitted!');
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}>
      <View style={styles.container}>
        {/* Icon */}
        <Ionicons name="help-circle-outline" size={80} color="#F9A825" style={styles.icon} />

        <Text style={styles.header}>Support Page</Text>
        <Text style={styles.content}>Fill out the form below to contact our support team.</Text>

        {/* Form Inputs */}
        <TextInput
          style={styles.input}
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
        />
        <TextInput
          style={styles.textArea}
          placeholder="Message"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Additional Information"
          value={additionalInfo}
          onChangeText={setAdditionalInfo}
        />
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>

        {/* FAQ Button */}
        <TouchableOpacity style={styles.faqButton} onPress={() => setFAQModalVisible(true)}>
          <Text style={styles.faqButtonText}>F.A.Q</Text>
        </TouchableOpacity>

        {/* FAQ Modal */}
        <Modal visible={isFAQModalVisible} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalHeader}>Frequently Asked Questions</Text>
              <ScrollView style={styles.faqScrollView}>
                {faqs.map((faq) => (
                  <View key={faq.id} style={styles.faqItem}>
                    <TouchableOpacity
                      style={styles.faqTitleContainer}
                      onPress={() => handleFAQToggle(faq.id)}
                    >
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <Ionicons
                        name={expandedFAQs[faq.id] ? 'chevron-up-outline' : 'chevron-down-outline'}
                        size={20}
                        color="#333"
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