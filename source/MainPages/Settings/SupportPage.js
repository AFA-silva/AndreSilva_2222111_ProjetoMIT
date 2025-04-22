import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import styles from '../../Styles/Settings/SupportPageStyle';

const SupportPage = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isFAQModalVisible, setFAQModalVisible] = useState(false);

  const faqs = [
    { question: 'How can I contact support?', answer: 'Fill out the form on this page and submit your request.' },
    { question: 'What should I include in my message?', answer: 'Please include detailed information about the issue you are facing.' },
    { question: 'How long does it take to get a response?', answer: 'Our support team typically responds within 24-48 hours.' },
  ];

  const handleSubmit = () => {
    alert('Your support request has been submitted!');
  };

  return (
    <View style={styles.container}>
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
            <FlatList
              data={faqs}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
              )}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setFAQModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SupportPage;