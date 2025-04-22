import React, { useState, useEffect } from 'react'; // Import de componentes react
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, ActivityIndicator, Image } from 'react-native'; // Import de componentes visuais do React Native
import { supabase } from '../../Supabase'; // Import da Database (supabae)
import styles from '../Styles/AccountPageStyles/RegisterPageStyle'; // Import da estilização para o Register
import { isEmailValid, isPhoneValid, isPasswordValid, isFieldNotEmpty, isNameValid } from '../Utility/Validations'; // Import das validações para os campos
import Alert from '../Utility/Alerts'; // Import do componenete de alertas
import { fetchCountries } from '../Utility/FetchCountries'; // Import de um função que busca a lista de paises (API DE Paises)

// Cria o componente RegiserPage. O Navigation é usado para trocar de página
const RegisterPage = ({ navigation }) => {   

  // const X - Cria uma varivavel/constante
  // set X - Função usada para mudar o valor da variavel
  // UseState - Componente do React usado para atualizar a interface/front-end (ele que cria o "set X")

  // Componentes/Elementos para a criação da conta do user.
  const [phone, setPhone] = useState(''); // Telefone
  const [name, setName] = useState(''); // Nome
  const [email, setEmail] = useState(''); // Email
  const [password, setPassword] = useState(''); // Password
  const [confirmPassword, setConfirmPassword] = useState(''); // Confirmação da password
  const [region, setRegion] = useState(''); // Região/Pais
  const [countries, setCountries] = useState([]); // Define os paises na pesquisa
  const [filteredCountries, setFilteredCountries] = useState([]); // Define os paises filtrados 
  const [isLoading, setIsLoading] = useState(false); // Desativa o botão de register se uma operação tiver a decorrer

  // Componentes Alertas
  const [alertMessage, setAlertMessage] = useState(''); // Define a mensagem a ser amostrada
  const [alertType, setAlertType] = useState(''); // Define o tipo de alerta
  const [showAlert, setShowAlert] = useState(false); 

  // Modal e barra de pesquisa para os paises
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  // useEffect - usasdo para executar código automaticamente quando a tela carrega ou quando algum valor muda
  useEffect(() => {
    const loadCountries = async () => {
      const countryList = await fetchCountries(); // Busca os paises na API
      setCountries(countryList); // Salva os paises na variavel
      setFilteredCountries(countryList); // Começa a lista filtrada com todos os países
    };

    loadCountries(); // Carrega a função acima
  }, []); 

  // Função de busca dos paises
  const handleSearch = (query) => {
    setSearchQuery(query); // Atualiza o texto que o user está a procurar
    setFilteredCountries( 
      countries.filter((country) =>
        country.name.toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  // Função para mostrar o alerta
  const showAlertMessage = (message, type) => {
    setAlertMessage(message); // Mostra a mensagem
    setAlertType(type); // Mostra o tipo de Alerta
    setShowAlert(true); // Define o alerta como true ou seja , amostra ele.
    setTimeout(() => setShowAlert(false), 3000); // Fecha o alerta após 3 segundos
  };

  // Função de Register
  const handleRegister = async () => {
    // Faz as validações todas dos campos.
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
      // Verifica se o email ou telefone já está registrado
      const { data: existingUserByEmail  } = await supabase.from('users').select('id').eq('email', email);
      const { data: existingUserByPhone } = await supabase.from('users').select('id').eq('phone', phone);

      // Se ja existir email mostra um aviso
      if (existingUserByEmail?.length > 0) {
        showAlertMessage('A user with this email already exists.', 'error');
        setIsLoading(false);
        return;
      }
      // Se ja existir o telefone mostra um aviso
      if (existingUserByPhone?.length > 0) {
        showAlertMessage('A user with this phone number already exists.', 'error');
        setIsLoading(false);
        return;
      }

      // Registra o user no Supabase Auth (Database)
      const { data, error } = await supabase.auth.signUp({ email, password });

      // Em caso de erro ao registrar o user
      if (error) {
        showAlertMessage(`Error registering: ${error.message}`, 'error');
        setIsLoading(false);
        return;
      }

      // Dados do user recém-criados
      const user = data.user;

      if (!user) {
        showAlertMessage('Error retrieving user data.', 'error');
        setIsLoading(false);
        return;
      }

      // Insere os dados do user na tabela `users`
      const { error: insertError } = await supabase
        .from('users')
        .insert([{ id: user.id, phone, name, email, password, region }]);

      // Mensagem de alerta em caso de erro 
      if (insertError) {
        showAlertMessage(`Error saving data: ${insertError.message}`, 'error');
        setIsLoading(false);
        return;
      }

      showAlertMessage('Account created successfully!', 'success');

      // Após 1.5 segundos redireciona o user para a página de Login
      setTimeout(() => {
        navigation.navigate('Login');
      }, 1500);

    } catch (e) {
      console.error('Unexpected error:', e);
      showAlertMessage('An unexpected error occurred. Please try again.', 'error');
      // Desativa o loading mesmo se der erro. (Finally - executa o código no final apesar de dar erros.)
    } finally {
      setIsLoading(false);
    }
  };


  // "Front-end" do projeto. 
  return (
    <View style={styles.container}>
      {showAlert && <Alert message={alertMessage} type={alertType} onClose={() => setShowAlert(false)} />}
      <Text style={styles.title}>Register Account</Text>
      <Text style={styles.subtitle}>Create your account to start using MIT</Text>

      <TextInput style={styles.input} placeholder="📞 Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="👤 Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="✉️ Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

      {/* Password Input */}
      <TextInput
        style={styles.input}
        placeholder="🔒 Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="🔒 Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

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

      {/* Botão de Register. Fica desativo se o isLoading for true */}
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
        <Text style={styles.buttonText}>
          {isLoading ? <ActivityIndicator size="small" color="#FFF" /> : 'Register'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.logintext}>
        Ja tem uma conta?{' '}
        <Text style={styles.loginlink} onPress={() => navigation.navigate('Login')}>
          Faça Login!
        </Text>
      </Text>
    </View>
  );
};

export default RegisterPage;