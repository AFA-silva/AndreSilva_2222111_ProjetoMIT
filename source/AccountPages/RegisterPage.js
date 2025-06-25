import React, { useState, useEffect } from 'react'; // Import of React components
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, ActivityIndicator, Image } from 'react-native'; // Import of React Native visual components
import { supabase } from '../../Supabase'; // Import of Database (supabase)
import styles from '../Styles/AccountPageStyles/RegisterPageStyle'; // Import of styling for Register
import { isEmailValid, isPhoneValid, isPasswordValid, isFieldNotEmpty, isNameValid } from '../Utility/Validations'; // Import of validations for fields
import Alert from '../Utility/Alerts'; // Import of alert component
import { fetchCountries } from '../Utility/FetchCountries'; // Import of function that fetches the list of countries (Countries API)

// Creates the RegisterPage component. Navigation is used to switch pages
const RegisterPage = ({ navigation }) => {   

  // const X - Creates a variable/constant
  // set X - Function used to change the variable value
  // useState - React component used to update the interface/front-end (it creates the "set X")

  // Components/Elements for user account creation
  const [phone, setPhone] = useState(''); // Phone
  const [name, setName] = useState(''); // Name
  const [email, setEmail] = useState(''); // Email
  const [password, setPassword] = useState(''); // Password
  const [confirmPassword, setConfirmPassword] = useState(''); // Password confirmation
  const [region, setRegion] = useState(''); // Region/Country
  const [countries, setCountries] = useState([]); // Defines the countries in the search
  const [filteredCountries, setFilteredCountries] = useState([]); // Defines filtered countries
  const [isLoading, setIsLoading] = useState(false); // Disables the register button if an operation is in progress

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false); // Controls password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Controls confirm password visibility

  // Alert Components
  const [alertMessage, setAlertMessage] = useState(''); // Defines the message to be shown
  const [alertType, setAlertType] = useState(''); // Defines the type of alert
  const [showAlert, setShowAlert] = useState(false); 

  // Modal and search bar for countries
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  // useEffect - used to execute code automatically when the screen loads or when some value changes
  useEffect(() => {
    const loadCountries = async () => {
      const countryList = await fetchCountries(); // Fetches countries from the API
      setCountries(countryList); // Saves countries in the variable
      setFilteredCountries(countryList); // Starts the filtered list with all countries
    };

    loadCountries(); // Loads the function above
  }, []); 

  // Country search function
  const handleSearch = (query) => {
    setSearchQuery(query); // Updates the text the user is searching for
    setFilteredCountries( 
      countries.filter((country) =>
        country.name.toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  // Function to show the alert
  const showAlertMessage = (message, type) => {
    setAlertMessage(message); // Shows the message
    setAlertType(type); // Shows the alert type
    setShowAlert(true); // Sets the alert as true, i.e., shows it
    setTimeout(() => setShowAlert(false), 3000); // Closes the alert after 3 seconds
  };

  // Register Function
  const handleRegister = async () => {
    // Does all the field validations
    if (
      !isFieldNotEmpty(phone) ||
      !isFieldNotEmpty(name) ||
      !isFieldNotEmpty(email) ||
      !isFieldNotEmpty(password) ||
      !isFieldNotEmpty(confirmPassword) ||
      !isFieldNotEmpty(region)
    ) {
      showAlertMessage('Please fill out all fields.', 'error');
      return;
    }

    if (!isPhoneValid(phone)) {
      showAlertMessage('Please enter a valid phone number (9 digits).', 'error');
      return;
    }

    if (!isNameValid(name)) {
      showAlertMessage('Name must be at most 20 characters long.', 'error');
      return;
    }

    if (!isEmailValid(email)) {
      showAlertMessage('Please enter a valid email address.', 'error');
      return;
    }

    if (!isPasswordValid(password, confirmPassword)) {
      showAlertMessage('Password must be 6-16 characters long and match the confirmation.', 'error');
      return;
    }

    if (isLoading) {
      showAlertMessage('Please wait before trying again.', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      // Checks if the email or phone is already registered
      const { data: existingUserByEmail  } = await supabase.from('users').select('id').eq('email', email);
      const { data: existingUserByPhone } = await supabase.from('users').select('id').eq('phone', phone);

      // If email already exists, shows a warning
      if (existingUserByEmail?.length > 0) {
        showAlertMessage('A user with this email already exists.', 'error');
        setIsLoading(false);
        return;
      }
      // If phone already exists, shows a warning
      if (existingUserByPhone?.length > 0) {
        showAlertMessage('A user with this phone number already exists.', 'error');
        setIsLoading(false);
        return;
      }

      // Registers the user in Supabase Auth (Database)
      const { data, error } = await supabase.auth.signUp({ email, password });

      // In case of error when registering the user
      if (error) {
        showAlertMessage(`Error registering: ${error.message}`, 'error');
        setIsLoading(false);
        return;
      }

      // Newly created user data
      const user = data.user;

      if (!user) {
        showAlertMessage('Error retrieving user data.', 'error');
        setIsLoading(false);
        return;
      }

      // Inserts user data in the `users` table
      const { error: insertError } = await supabase
        .from('users')
        .insert([{ id: user.id, phone, name, email, password, region }]);

      // Alert message in case of error
      if (insertError) {
        showAlertMessage(`Error saving data: ${insertError.message}`, 'error');
        setIsLoading(false);
        return;
      }

      showAlertMessage('Account created successfully!', 'success');

      // After 1.5 seconds redirects the user to the Login page
      setTimeout(() => {
        navigation.navigate('Login');
      }, 1500);

    } catch (e) {
      console.error('Unexpected error:', e);
      showAlertMessage('An unexpected error occurred. Please try again.', 'error');
      // Deactivates loading even if there's an error (Finally - executes the code at the end despite errors)
    } finally {
      setIsLoading(false);
    }
  };


  // "Front-end" of the project
  return (
    <View style={styles.container}>
      {showAlert && <Alert message={alertMessage} type={alertType} onClose={() => setShowAlert(false)} />}
      <Text style={styles.title}>Register Account</Text>
      <Text style={styles.subtitle}>Create your account to start using MIT</Text>

      <TextInput style={styles.input} placeholder="📞 Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="👤 Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="✉️ Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

      {/* Password Input */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="🔒 Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity 
          style={styles.eyeButton} 
          onPress={() => setShowPassword(!showPassword)}
        >
          <Image 
            source={showPassword ? require('../../assets/eye-open.png') : require('../../assets/eye-closed.png')} 
            style={styles.eyeIcon}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="🔒 Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity 
          style={styles.eyeButton} 
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Image 
            source={showConfirmPassword ? require('../../assets/eye-open.png') : require('../../assets/eye-closed.png')} 
            style={styles.eyeIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Country Picker */}
      <TouchableOpacity style={styles.input} onPress={() => setModalVisible(true)}>
        <View style={styles.countryPickerRow}>
          {region ? (
            <Image source={{ uri: `https://flagcdn.com/w40/${region.toLowerCase()}.png` }} style={styles.flagIcon} />
          ) : (
            <Image source={require('../../assets/flag-placeholder.png')} style={styles.flagIcon} />
          )}
          <Text style={[styles.inputText, { color: region ? '#333' : '#999' }]}>
            {region ? countries.find((c) => c.code === region)?.name || 'Select your region' : 'Select your region'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a country..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setRegion(item.code);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Register Button. It's disabled if isLoading is true */}
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
        <Text style={styles.buttonText}>
          {isLoading ? <ActivityIndicator size="small" color="#FFF" /> : 'Register'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.logintext}>
        Already have an account?{' '}
        <Text style={styles.loginlink} onPress={() => navigation.navigate('Login')}>
          Login!
        </Text>
      </Text>
    </View>
  );
};

export default RegisterPage;