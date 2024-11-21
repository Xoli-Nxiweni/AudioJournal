import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const AuthScreen: React.FC = () => {
  const navigation = useNavigation();
  const { login, signup } = useAuth();
  
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    cellNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFormChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const { name, surname, cellNumber, email, password, confirmPassword } = formData;

    if (isSignup) {
      if (!name) newErrors.name = 'First Name required';
      if (!surname) newErrors.surname = 'Surname required';
      if (!cellNumber) newErrors.cellNumber = 'Cell Number required';
      if (!email) newErrors.email = 'Email required';
      if (!password) newErrors.password = 'Password required';
      if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    } else {
      if (!email) newErrors.email = 'Email required';
      if (!password) newErrors.password = 'Password required';
    }

    return newErrors;
  };

  const handleAuthAction = async () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    try {
      const success = isSignup 
        ? await signup(formData.email, formData.password)
        : await login(formData.email, formData.password);

      success 
        ? navigation.replace('Home')
        : setErrors({ general: 'Authentication failed' });
    } catch (error) {
      setErrors({ general: 'Network error occurred' });
    }
  };

  const renderSignupFields = () => (
    <>
      <AuthInput
        icon="person"
        placeholder="First Name"
        value={formData.name}
        onChangeText={(text) => handleFormChange('name', text)}
        error={errors.name}
      />
      <AuthInput
        icon="person"
        placeholder="Surname"
        value={formData.surname}
        onChangeText={(text) => handleFormChange('surname', text)}
        error={errors.surname}
      />
      <AuthInput
        icon="call"
        placeholder="Cell Number"
        value={formData.cellNumber}
        onChangeText={(text) => handleFormChange('cellNumber', text)}
        keyboardType="phone-pad"
        error={errors.cellNumber}
      />
    </>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollViewContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Text style={styles.header}>
              {isSignup ? 'Sign Up' : 'Sign In'}
            </Text>

            {errors.general && (
              <Text style={styles.errorText}>{errors.general}</Text>
            )}

            {isSignup && renderSignupFields()}

            <AuthInput
              icon="mail"
              placeholder="Email"
              value={formData.email}
              onChangeText={(text) => handleFormChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <AuthInput
              icon="lock-closed"
              placeholder="Password"
              value={formData.password}
              onChangeText={(text) => handleFormChange('password', text)}
              secureTextEntry
              error={errors.password}
            />

            {isSignup && (
              <AuthInput
                icon="lock-closed"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(text) => handleFormChange('confirmPassword', text)}
                secureTextEntry
                error={errors.confirmPassword}
              />
            )}

            <Pressable
              style={({ pressed }) => [
                styles.authButton,
                { backgroundColor: pressed ? '#444' : '#555' }
              ]}
              onPress={handleAuthAction}
            >
              <Text style={styles.buttonText}>
                {isSignup ? 'Sign Up' : 'Sign In'}
              </Text>
            </Pressable>

            <Pressable onPress={() => setIsSignup(!isSignup)}>
              <Text style={styles.toggleText}>
                {isSignup
                  ? 'Already have an account? Log In'
                  : "Don't have an account? Sign Up"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const AuthInput = ({ 
  icon, 
  error, 
  ...props 
}: {
  icon: string, 
  error?: string
} & React.ComponentProps<typeof TextInput>) => (
  <>
    <View style={styles.inputContainer}>
      <Ionicons name={icon as any} size={24} color="#555" style={styles.icon} />
      <TextInput style={styles.input} {...props} />
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#a3cffa',
  },
  safeArea: {
    flex: 1,
  },
  scrollViewContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    paddingVertical: 30,
    borderRadius: 30,
    borderColor: '#fff',
    borderWidth: 2,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 10,
    width: 300,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    padding: 10,
    fontSize: 16,
  },
  icon: {
    marginRight: 10,
  },
  authButton: {
    marginTop: 20,
    width: '90%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#555',
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
  },
  toggleText: {
    marginTop: 20,
    fontSize: 14,
    color: '#fff',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginLeft: 10,
  },
});

export default AuthScreen;