// types/settings.ts
export interface AppSettings {
  isDarkMode: boolean;
  audioQuality: 'Low' | 'Medium' | 'High';
  notificationsEnabled: boolean;
  dataCollection: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  profileImage?: string;
  createdAt: string;
  lastUpdated: string;
}

export interface LocalUserProfile extends UserProfile {
  settings: AppSettings;
  uid: string;
}

// components/SettingsScreen.tsx
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
  Platform,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import validator from 'validator';
import useAuth from '../hooks/useAuth';

const DEFAULT_SETTINGS: AppSettings = {
  isDarkMode: false,
  audioQuality: 'Medium',
  notificationsEnabled: true,
  dataCollection: false
};

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  email: '',
  profileImage: undefined,
  createdAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString()
};

const STORAGE_KEYS = {
  USER_DATA: 'user_data_',
  FEEDBACK: 'feedback_',
  THEME: 'theme_'
};

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, loading: authLoading } = useAuth();
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [feedbackText, setFeedbackText] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigation.navigate('Login' as never);
      return;
    }

    if (user) {
      loadUserData();
    }
  }, [user, authLoading]);

  // Enhanced loading with error handling and retry mechanism
  const loadUserData = async (retryCount = 3) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const storageKey = `${STORAGE_KEYS.USER_DATA}${user.uid}`;
      const storedData = await AsyncStorage.getItem(storageKey);

      if (storedData) {
        const userData: LocalUserProfile = JSON.parse(storedData);
        setProfile({
          name: userData.name,
          email: userData.email,
          profileImage: userData.profileImage,
          createdAt: userData.createdAt,
          lastUpdated: userData.lastUpdated
        });
        setSettings(userData.settings);
      } else {
        // Initialize with default data
        const defaultData: LocalUserProfile = {
          ...DEFAULT_PROFILE,
          name: user.displayName || '',
          email: user.email || '',
          profileImage: user.photoURL || undefined,
          settings: DEFAULT_SETTINGS,
          uid: user.uid
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(defaultData));
        setProfile(defaultData);
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      if (retryCount > 0) {
        setTimeout(() => loadUserData(retryCount - 1), 1000);
      } else {
        Alert.alert(
          'Error',
          'Failed to load user data. Would you like to retry?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => loadUserData() }
          ]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced settings update with optimistic updates and rollback
  const updateSettings = async (updatedSettings: Partial<AppSettings>) => {
    if (!user) return;

    const previousSettings = { ...settings };
    const newSettings = { ...settings, ...updatedSettings };
    
    // Optimistic update
    setSettings(newSettings);
    
    try {
      setIsSaving(true);
      const storageKey = `${STORAGE_KEYS.USER_DATA}${user.uid}`;
      const storedData = await AsyncStorage.getItem(storageKey);
      const userData: LocalUserProfile = storedData 
        ? JSON.parse(storedData)
        : {
            ...DEFAULT_PROFILE,
            name: user.displayName || '',
            email: user.email || '',
            settings: newSettings,
            uid: user.uid
          };

      userData.settings = newSettings;
      userData.lastUpdated = new Date().toISOString();

      await AsyncStorage.setItem(storageKey, JSON.stringify(userData));

      // Save theme preference separately for quick access
      if ('isDarkMode' in updatedSettings) {
        await AsyncStorage.setItem(
          `${STORAGE_KEYS.THEME}${user.uid}`, 
          JSON.stringify({ isDarkMode: newSettings.isDarkMode })
        );
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      // Rollback on error
      setSettings(previousSettings);
      Alert.alert('Error', 'Failed to save settings. Changes have been reverted.');
    } finally {
      setIsSaving(false);
    }
  };

  // Enhanced profile save with validation
  const saveProfile = async () => {
    if (!user) return;
    
    if (!validator.isEmail(profile.email)) {
      setEmailError('Invalid email address');
      return;
    }

    if (!profile.name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      const storageKey = `${STORAGE_KEYS.USER_DATA}${user.uid}`;
      const storedData = await AsyncStorage.getItem(storageKey);
      const userData: LocalUserProfile = storedData 
        ? JSON.parse(storedData)
        : {
            ...DEFAULT_PROFILE,
            settings: settings,
            uid: user.uid
          };

      userData.name = profile.name;
      userData.email = profile.email;
      userData.lastUpdated = new Date().toISOString();

      await AsyncStorage.setItem(storageKey, JSON.stringify(userData));
      setIsEditingProfile(false);
      setEmailError('');
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Enhanced image picker with compression and local storage
  const pickProfileImage = async () => {
    if (!user) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to update your profile image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.5, // Compressed for storage efficiency
      });

      if (!result.canceled) {
        setIsSaving(true);
        const imageUri = result.assets[0].uri;
        
        const storageKey = `${STORAGE_KEYS.USER_DATA}${user.uid}`;
        const storedData = await AsyncStorage.getItem(storageKey);
        const userData: LocalUserProfile = storedData 
          ? JSON.parse(storedData)
          : {
              ...DEFAULT_PROFILE,
              settings: settings,
              uid: user.uid
          };

        userData.profileImage = imageUri;
        userData.lastUpdated = new Date().toISOString();

        await AsyncStorage.setItem(storageKey, JSON.stringify(userData));
        setProfile(prev => ({ ...prev, profileImage: imageUri }));
        Alert.alert('Success', 'Profile image updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Error', 'Failed to update profile image. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Enhanced feedback system with local storage
  const sendFeedback = async () => {
    if (!user || !feedbackText.trim()) {
      Alert.alert('Error', 'Please provide feedback details');
      return;
    }

    try {
      setIsSaving(true);
      const feedbackKey = `${STORAGE_KEYS.FEEDBACK}${user.uid}_${Date.now()}`;
      const feedback = {
        userId: user.uid,
        userEmail: profile.email,
        feedback: feedbackText,
        deviceInfo: Platform.OS,
        createdAt: new Date().toISOString()
      };

      await AsyncStorage.setItem(feedbackKey, JSON.stringify(feedback));
      Alert.alert('Success', 'Thank you for your feedback! It has been saved locally.');
      setFeedbackText('');
    } catch (error) {
      console.error('Error saving feedback:', error);
      Alert.alert('Error', 'Failed to save feedback. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderProfileSection = () => {
    return (
      <View style={[
        styles.profileContainer,
        settings.isDarkMode && styles.darkProfileContainer
      ]}>
        <TouchableOpacity onPress={pickProfileImage}>
          {profile.profileImage ? (
            <Image
              source={{ uri: profile.profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={50} color="#666" />
            </View>
          )}
        </TouchableOpacity>

        {isEditingProfile ? (
          <View style={styles.profileEditForm}>
            <TextInput
              style={[
                styles.profileInput,
                emailError && styles.errorInput,
                settings.isDarkMode && styles.darkInput
              ]}
              value={profile.name}
              onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
              placeholder="Name"
              placeholderTextColor={settings.isDarkMode ? '#666' : '#999'}
            />
            <TextInput
              style={[
                styles.profileInput,
                emailError && styles.errorInput,
                settings.isDarkMode && styles.darkInput
              ]}
              value={profile.email}
              onChangeText={(text) => {
                setProfile(prev => ({ ...prev, email: text }));
                setEmailError('');
              }}
              placeholder="Email"
              placeholderTextColor={settings.isDarkMode ? '#666' : '#999'}
              keyboardType="email-address"
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
            <View style={styles.profileButtonContainer}>
              <TouchableOpacity
                style={[styles.profileButton, { backgroundColor: '#666' }]}
                onPress={() => setIsEditingProfile(false)}
              >
                <Text style={styles.profileButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={saveProfile}
              >
                <Text style={styles.profileButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text style={[
              styles.profileName,
              settings.isDarkMode && styles.darkText
            ]}>
              {profile.name}
            </Text>
            <Text style={[
              styles.profileEmail,
              settings.isDarkMode && styles.darkSubText
            ]}>
              {profile.email}
            </Text>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setIsEditingProfile(true)}
            >
              <Text style={styles.editProfileButtonText}>
                Edit Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderGeneralSettings = () => {
    return (
      <View style={[
        styles.settingsContainer,
        settings.isDarkMode && styles.darkSettingsContainer
      ]}>
        <Text style={[
          styles.sectionTitle,
          settings.isDarkMode && styles.darkText
        ]}>
          General Settings
        </Text>

        <View style={styles.settingRow}>
          <View>
            <Text style={[
              styles.settingLabel,
              settings.isDarkMode && styles.darkText
            ]}>
              Dark Mode
            </Text>
            <Text style={[
              styles.settingDescription,
              settings.isDarkMode && styles.darkSubText
            ]}>
              Enable dark theme
            </Text>
          </View>
          <Switch
            value={settings.isDarkMode}
            onValueChange={(value) => updateSettings({ isDarkMode: value })}
          />
        </View>

        <View style={styles.settingRow}>
          <View>
            <Text style={[
              styles.settingLabel,
              settings.isDarkMode && styles.darkText
            ]}>
              Audio Quality
            </Text>
          </View>
          <View style={styles.audioQualityContainer}>
            {['Low', 'Medium', 'High'].map((quality) => (
              <TouchableOpacity
                key={quality}
                style={[
                  styles.audioQualityOption,
                  settings.audioQuality === quality && styles.selectedAudioQuality
                ]}
                onPress={() => updateSettings({ audioQuality: quality as 'Low' | 'Medium' | 'High' })}
              >
                <Text style={[
                  settings.audioQuality === quality && styles.selectedAudioQualityText,
                  settings.isDarkMode && styles.darkText
                ]}>
                  {quality}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.settingRow}>
          <View>
            <Text style={[
              styles.settingLabel,
              settings.isDarkMode && styles.darkText
            ]}>
              Notifications
            </Text>
            <Text style={[
              styles.settingDescription,
              settings.isDarkMode && styles.darkSubText
            ]}>
              Enable push notifications
            </Text>
          </View>
          <Switch            value={settings.notificationsEnabled}
            onValueChange={(value) => updateSettings({ notificationsEnabled: value })}
          />
        </View>

        <View style={styles.settingRow}>
          <View>
            <Text style={[
              styles.settingLabel,
              settings.isDarkMode && styles.darkText
            ]}>
              Data Collection
            </Text>
            <Text style={[
              styles.settingDescription,
              settings.isDarkMode && styles.darkSubText
            ]}>
              Allow app to collect analytics data
            </Text>
          </View>
          <Switch
            value={settings.dataCollection}
            onValueChange={(value) => updateSettings({ dataCollection: value })}
          />
        </View>
      </View>
    );
  };

  const renderPrivacySection = () => {
    return (
      <View style={[
        styles.settingsContainer,
        settings.isDarkMode && styles.darkSettingsContainer
      ]}>
        <Text style={[
          styles.sectionTitle,
          settings.isDarkMode && styles.darkText
        ]}>
          Privacy Settings
        </Text>

        <TouchableOpacity
          style={styles.privacyButton}
          onPress={() => Linking.openURL('https://example.com/privacy-policy')}
        >
          <Text style={[
            styles.privacyButtonText,
            settings.isDarkMode && styles.darkText
          ]}>
            View Privacy Policy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.privacyButton}
          onPress={() => Linking.openURL('https://example.com/terms-of-service')}
        >
          <Text style={[
            styles.privacyButtonText,
            settings.isDarkMode && styles.darkText
          ]}>
            View Terms of Service
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFeedbackSection = () => {
    return (
      <View style={[
        styles.settingsContainer,
        settings.isDarkMode && styles.darkSettingsContainer
      ]}>
        <Text style={[
          styles.sectionTitle,
          settings.isDarkMode && styles.darkText
        ]}>
          Feedback
        </Text>
        <TextInput
          style={[
            styles.feedbackInput,
            settings.isDarkMode && styles.darkInput
          ]}
          placeholder="Write your feedback here..."
          placeholderTextColor={settings.isDarkMode ? '#666' : '#999'}
          value={feedbackText}
          onChangeText={setFeedbackText}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.feedbackButton,
            { opacity: isSaving ? 0.7 : 1 }
          ]}
          onPress={sendFeedback}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.feedbackButtonText}>Send Feedback</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading || authLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {renderProfileSection()}
      {renderGeneralSettings()}
      {renderPrivacySection()}
      {renderFeedbackSection()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  editProfileButton: {
    marginTop: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#007BFF',
    borderRadius: 5,
  },
  editProfileButtonText: {
    color: '#007BFF',
  },
  profileInput: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 5,
    padding: 10,
    marginVertical: 5,
    width: '80%',
  },
  errorInput: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
  profileButtonContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  profileButton: {
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: '#007BFF',
    borderRadius: 5,
  },
  profileButtonText: {
    color: '#FFF',
  },
  profileEditForm: {
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  settingsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  settingLabel: {
    fontSize: 14,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  audioQualityContainer: {
    flexDirection: 'row',
  },
  audioQualityOption: {
    padding: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 5,
  },
  selectedAudioQuality: {
    borderColor: '#007BFF',
    backgroundColor: '#007BFF',
  },
  selectedAudioQualityText: {
    color: '#FFF',
  },
  privacyButton: {
    marginVertical: 5,
  },
  privacyButtonText: {
    color: '#007BFF',
    textDecorationLine: 'underline',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
    textAlignVertical: 'top',
  },
  feedbackButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  feedbackButtonText: {
    color: '#FFF',
  },
  darkProfileContainer: {
    backgroundColor: '#333',
  },
  darkSettingsContainer: {
    backgroundColor: '#333',
  },
  darkText: {
    color: '#FFF',
  },
  darkSubText: {
    color: '#AAA',
  },
  darkInput: {
    backgroundColor: '#555',
    color: '#FFF',
    borderColor: '#777',
  },
});

export default SettingsScreen;
