import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from '../../Styles/Settings/SupportPageStyle'; // Import styles

const SupportPage = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    console.log('Support request submitted:', { subject, message });
    alert('Your support request has been submitted!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Support Page</Text>
      <Text style={styles.content}>Fill out the form below to contact our support team.</Text>

      {/* Subject Input */}
      <TextInput
        style={styles.input}
        placeholder="Subject"
        value={subject}
        onChangeText={setSubject}
      />

      {/* Message Input */}
      <TextInput
        style={styles.textArea}
        placeholder="Message"
        value={message}
        onChangeText={setMessage}
        multiline
      />

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SupportPage;