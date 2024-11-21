import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Switch, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  TouchableOpacity, 
  TextInput,
  Linking,
  Image,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import validator from 'validator';

interface AppSettings {
  isDarkMode: boolean;
  audioQuality: 'Low' | 'Medium' | 'High';
  notificationsEnabled: boolean;
  dataCollection: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  profileImage?: string;
}

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<AppSettings>({
    isDarkMode: false,
    audioQuality: 'Medium',
    notificationsEnabled: true,
    dataCollection: false
  });
  
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    profileImage: undefined
  });

  const [feedbackText, setFeedbackText] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [savedSettings, savedProfile] = await Promise.all([
        AsyncStorage.getItem('@app_settings'),
        AsyncStorage.getItem('@user_profile')
      ]);

      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error('Error loading initial data', error);
    }
  };

  const updateSettings = async (updatedSettings: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updatedSettings };
    setSettings(newSettings);
    
    try {
      await AsyncStorage.setItem('@app_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings', error);
    }
  };

  const saveProfile = async () => {
    if (!validator.isEmail(profile.email)) {
      setEmailError('Invalid email address');
      return;
    }

    try {
      await AsyncStorage.setItem('@user_profile', JSON.stringify(profile));
      setIsEditingProfile(false);
      setEmailError('');
    } catch (error) {
      console.error('Error saving profile', error);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const sendFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please provide feedback details');
      return;
    }

    try {
      await submitFeedbackToBackend({
        userId: profile.email,
        feedback: feedbackText,
        deviceInfo: Platform.OS
      });
      
      Alert.alert('Success', 'Feedback sent successfully');
      setFeedbackText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send feedback');
    }
  };

  const submitFeedbackToBackend = async (feedbackData: {
    userId: string;
    feedback: string;
    deviceInfo: string;
  }) => {
    // Placeholder for actual backend submission
    console.log('Submitting feedback:', feedbackData);
    // Replace with actual API call
  };

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll permissions required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
    });

    if (!result.canceled) {
      const newProfile = { 
        ...profile, 
        profileImage: result.assets[0].uri 
      };
      setProfile(newProfile);
      await AsyncStorage.setItem('@user_profile', JSON.stringify(newProfile));
    }
  };

  const renderProfileSection = () => (
    <View style={styles.profileContainer}>
      <TouchableOpacity onPress={pickProfileImage}>
        {profile.profileImage ? (
          <Image 
            source={{ uri: profile.profileImage }} 
            style={styles.profileImage} 
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person-circle" size={80} color="#999" />
        )}
      </TouchableOpacity>

      {isEditingProfile ? (
        <>
          <TextInput
            style={styles.profileInput}
            value={profile.name}
            onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
            placeholder="Your Name"
          />
          <View>
            <TextInput
              style={[styles.profileInput, emailError && styles.errorInput]}
              value={profile.email}
              onChangeText={(text) => {
                setProfile(prev => ({ ...prev, email: text }));
                setEmailError('');
              }}
              placeholder="Email Address"
              keyboardType="email-address"
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>
          <View style={styles.profileButtonContainer}>
            <TouchableOpacity style={styles.profileButton} onPress={saveProfile}>
              <Text style={styles.profileButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileButton} 
              onPress={() => setIsEditingProfile(false)}
            >
              <Text style={styles.profileButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <TouchableOpacity 
            style={styles.editProfileButton} 
            onPress={() => setIsEditingProfile(true)}
          >
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderGeneralSettings = () => (
    <View style={styles.settingsContainer}>
      <Text style={styles.sectionTitle}>General Settings</Text>
      
      <View style={styles.settingRow}>
        <Text>Dark Mode</Text>
        <Switch
          value={settings.isDarkMode}
          onValueChange={(value) => updateSettings({ isDarkMode: value })}
        />
      </View>
      
      <View style={styles.settingRow}>
        <Text>Notifications</Text>
        <Switch
          value={settings.notificationsEnabled}
          onValueChange={(value) => updateSettings({ notificationsEnabled: value })}
        />
      </View>

      <View style={styles.settingRow}>
        <View>
          <Text>Data Collection</Text>
          <Text style={styles.settingDescription}>Help improve the app</Text>
        </View>
        <Switch
          value={settings.dataCollection}
          onValueChange={(value) => updateSettings({ dataCollection: value })}
        />
      </View>
      
      <View style={styles.settingRow}>
        <Text>Audio Quality</Text>
        <View style={styles.audioQualityContainer}>
          {(['Low', 'Medium', 'High'] as const).map((quality) => (
            <TouchableOpacity 
              key={quality}
              style={[
                styles.audioQualityOption,
                settings.audioQuality === quality && styles.selectedAudioQuality
              ]}
              onPress={() => updateSettings({ audioQuality: quality })}
            >
              <Text style={settings.audioQuality === quality && styles.selectedAudioQualityText}>
                {quality}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderPrivacySection = () => (
    <View style={styles.settingsContainer}>
      <Text style={styles.sectionTitle}>Privacy & Legal</Text>
      
      <TouchableOpacity 
        style={styles.privacyButton}
        onPress={() => Linking.openURL('https://your-app-privacy-policy-url.com')}
      >
        <Text style={styles.privacyButtonText}>View Privacy Policy</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.privacyButton}
        onPress={() => Linking.openURL('https://your-app-terms-of-service-url.com')}
      >
        <Text style={styles.privacyButtonText}>Terms of Service</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFeedbackSection = () => (
    <View style={styles.settingsContainer}>
      <Text style={styles.sectionTitle}>Feedback</Text>
      
      <TextInput
        multiline
        numberOfLines={4}
        style={styles.feedbackInput}
        placeholder="Share your thoughts, suggestions, or report an issue"
        value={feedbackText}
        onChangeText={setFeedbackText}
      />
      
      <TouchableOpacity 
        style={styles.feedbackButton}
        onPress={sendFeedback}
      >
        <Text style={styles.feedbackButtonText}>Send Feedback</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView 
      style={[
        styles.container, 
        settings.isDarkMode ? styles.darkBackground : styles.lightBackground
      ]}
    >
      {renderProfileSection()}
      {renderGeneralSettings()}
      {renderFeedbackSection()}
      {renderPrivacySection()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  lightBackground: {
    backgroundColor: '#fff',
  },
  darkBackground: {
    backgroundColor: '#121212',
    color: '#fff',
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f4f4f4',
    borderRadius: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  profileInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  errorInput: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  profileButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  profileButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  profileButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  editProfileButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  editProfileButtonText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  profileEmail: {
    color: '#666',
    marginBottom: 10,
  },
  settingsContainer: {
    backgroundColor: '#f4f4f4',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#007AFF',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  audioQualityContainer: {
    flexDirection: 'row',
  },
  audioQualityOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 5,
    borderRadius: 5,
  },
  selectedAudioQuality: {
    backgroundColor: '#007AFF',
  },
  selectedAudioQualityText: {
    color: 'white',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    height: 100,
  },
  feedbackButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  feedbackButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  privacyButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  privacyButtonText: {
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default SettingsScreen;