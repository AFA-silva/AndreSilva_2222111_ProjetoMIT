import React, { useState } from 'react'; // Import de componentes do React
import { View, Text, TextInput, TouchableOpacity } from 'react-native'; // Import de componentes do react native
import styles from '../Styles/AccountPageStyles/LoginPageStyle'; // Import do estilo para a página de login
import { supabase } from '../../Supabase'; // Import da Database
import Alert from '../Utility/Alerts'; // Import dos Alertas customs
import { updateUser, getSession } from '../Utility/MainQueries'; // Import das queries para atualizar usuário e obter a sessão

const LoginPage = ({ navigation }) => {
  // Cria as variáveis para os alertas.
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  // Cria as variáveis para o login (email e password)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Função para mostrar o alerta
  const showAlertMessage = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  // Função para tentar fazer o login
  const handleLogin = async () => {
    try {
      // Mostra na consola as credenciais
      console.log('A Tentar login com:', email, password);

      // Usa a database (supabase) para verificar o email e password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Verificação para caso de erro no login
      if (error) {
        console.error('Erro ao autenticar:', error.message);
        showAlertMessage('Email ou senha estão incorretos.', 'error');
        return;
      }

      // Verifica se `data` existe para validar o login.
      if (data?.user) {
        console.log('Usuário autenticado:', data);

        showAlertMessage(`Bem-vindo, ${data.user.email}!`, 'success');

        // Obtém a sessão para acessar o ID do usuário
        const session = await getSession();
        const userId = session?.user?.id;

        if (userId) {
          try {
            console.log('Atualizando email diretamente no banco de dados...');
            const { error: updateError } = await updateUser(userId, { email: data.user.email });

            if (updateError) {
              console.error('Erro ao atualizar email no banco de dados:', updateError.message);
              showAlertMessage('Erro ao sincronizar email no banco de dados.', 'error');
              return;
            }

            showAlertMessage('Email atualizado com sucesso no banco de dados.', 'success');
          } catch (dbError) {
            console.error('Erro ao atualizar o email:', dbError.message);
            showAlertMessage('Erro ao sincronizar dados do usuário.', 'error');
            return;
          }
        }

        // Espera de 1.5 segundos antes de ir para a MainPage
        setTimeout(() => {
          navigation.navigate('MainPages');
        }, 1500);
      } else {
        // Se não existir `data.user`, exibe erro
        showAlertMessage('Ocorreu um problema ao autenticar o usuário.', 'error');
      }
    } catch (exception) {
      // Se o bloco try falhar, captura o erro e exibe uma mensagem
      console.error('Exceção ao fazer login:', exception);
      showAlertMessage('Ocorreu um erro. Tente novamente mais tarde.', 'error');
    }
  };

  // Front-end da Login Page
  return (
    <View style={styles.container}>
      {showAlert && (
        <Alert message={alertMessage} type={alertType} onClose={() => setShowAlert(false)} />
      )}

      <Text style={styles.title}>Login Account</Text>
      <Text style={styles.subtitle}>Faça login com suas credenciais</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <Text style={styles.registerText}>
        Não tem uma conta?{' '}
        <Text style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
          Crie uma Conta
        </Text>
      </Text>
    </View>
  );
};

export default LoginPage;