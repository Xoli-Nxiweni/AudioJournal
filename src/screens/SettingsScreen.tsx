import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Pressable } from 'react-native';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [audioQuality, setAudioQuality] = useState('High');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  const [storageUsed, setStorageUsed] = useState<number | null>(null);

  useEffect(() => {
    // Load settings from AsyncStorage or other methods here.
    // Placeholder values for now
  }, []);

  const handleDarkModeToggle = async () => {
    const newDarkModeState = !isDarkMode;
    setIsDarkMode(newDarkModeState);
    // Save to AsyncStorage or similar
  };

  const requestAudioPermission = async () => {
    // Request permission logic here
    setAudioPermission(true); // Just a placeholder
  };

  const toggleAudioQuality = async () => {
    const newQuality = audioQuality === 'High' ? 'Low' : 'High';
    setAudioQuality(newQuality);
    // Save to AsyncStorage or similar
  };

  const increasePlaybackSpeed = async () => {
    const newSpeed = playbackSpeed >= 2.0 ? 0.5 : playbackSpeed + 0.5;
    setPlaybackSpeed(newSpeed);
    // Save to AsyncStorage or similar
  };

  const handleResetSettings = async () => {
    Alert.alert('Reset', 'All settings will be reset to default.');
    // Reset settings logic here
  };

  const handleBackup = async () => {
    Alert.alert('Backup', 'Backing up data...');
  };

  const handleRestore = async () => {
    Alert.alert('Restore', 'Restoring data...');
  };

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.darkBackground]}>
      <Text style={styles.header}>Settings</Text>

      {/* Dark Mode */}
      <View style={styles.settingRow}>
        <Text style={[styles.settingText, isDarkMode && styles.darkText]}>Dark Mode</Text>
        <Switch value={isDarkMode} onValueChange={handleDarkModeToggle} />
      </View>

      {/* Audio Quality */}
      <Pressable style={styles.card} onPress={toggleAudioQuality}>
        <Ionicons name="volume-high" size={24} color="#fff" style={styles.icon} />
        <Text style={styles.cardText}>Audio Quality: {audioQuality}</Text>
      </Pressable>

      {/* Playback Speed */}
      {/* <Pressable style={styles.card} onPress={increasePlaybackSpeed}>
        <Ionicons name="speedometer" size={24} color="#fff" style={styles.icon} />
        <Text style={styles.cardText}>Playback Speed: x{playbackSpeed}</Text>
      </Pressable> */}

      {/* Audio Recording Permission */}
      <Pressable style={styles.card} onPress={requestAudioPermission}>
        <Ionicons
          name={audioPermission ? 'checkmark-circle' : 'close-circle'}
          size={24}
          color={audioPermission ? 'green' : 'red'}
          style={styles.icon}
        />
        <Text style={styles.cardText}>
          Audio Permission: {audioPermission ? 'Granted' : 'Request Permission'}
        </Text>
      </Pressable>

      {/* Storage Management */}
      <View style={styles.settingRow}>
        <Text style={[styles.settingText, isDarkMode && styles.darkText]}>
          Storage Used: {storageUsed ? `${storageUsed} bytes` : 'Loading...'}
        </Text>
        <Pressable style={styles.resetButton} onPress={handleResetSettings}>
          <Text style={styles.resetButtonText}>Clear Storage</Text>
        </Pressable>
      </View>

      {/* Backup and Restore */}
      <View style={styles.settingRow}>
        <Text style={[styles.settingText, isDarkMode && styles.darkText]}>Backup & Restore</Text>
        <View style={styles.buttonGroup}>
          <Pressable style={styles.button} onPress={handleBackup}>
            <Text style={styles.buttonText}>Backup</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleRestore}>
            <Text style={styles.buttonText}>Restore</Text>
          </Pressable>
        </View>
      </View>

      {/* Reset All Settings */}
      <Pressable style={styles.card} onPress={handleResetSettings}>
        <Ionicons name="refresh" size={24} color="red" style={styles.icon} />
        <Text style={styles.cardText}>Reset All Settings</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f4f4',
  },
  darkBackground: {
    backgroundColor: '#333',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 10,
  },
  settingText: {
    fontSize: 16,
  },
  darkText: {
    color: '#fff',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#999',
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  cardText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  icon: {
    marginRight: 10,
  },
  resetButton: {
    backgroundColor: 'red',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '50%',
  },
  button: {
    backgroundColor: '#388E3C',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginVertical: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SettingsScreen;
