// src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

const SettingsScreen: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [audioQuality, setAudioQuality] = useState('High');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  const [storageUsed, setStorageUsed] = useState<number | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const darkMode = await AsyncStorage.getItem('darkMode');
        const savedAudioQuality = await AsyncStorage.getItem('audioQuality');
        const savedPlaybackSpeed = await AsyncStorage.getItem('playbackSpeed');

        setIsDarkMode(darkMode === 'true');
        setAudioQuality(savedAudioQuality || 'High');
        setPlaybackSpeed(parseFloat(savedPlaybackSpeed || '1.0'));

        // Get audio recording permission status
        const permissionResponse = await MediaLibrary.getPermissionsAsync();
        setAudioPermission(permissionResponse.granted);

        // Calculate storage usage
        const storedNotes = await AsyncStorage.getItem('voiceNotes');
        setStorageUsed(storedNotes ? new Blob([storedNotes]).size : 0);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleDarkModeToggle = async () => {
    const newDarkModeState = !isDarkMode;
    setIsDarkMode(newDarkModeState);
    await AsyncStorage.setItem('darkMode', JSON.stringify(newDarkModeState));
  };

  const requestAudioPermission = async () => {
    const { granted } = await MediaLibrary.requestPermissionsAsync();
    setAudioPermission(granted);
  };

  const toggleAudioQuality = async () => {
    const newQuality = audioQuality === 'High' ? 'Low' : 'High';
    setAudioQuality(newQuality);
    await AsyncStorage.setItem('audioQuality', newQuality);
  };

  const increasePlaybackSpeed = async () => {
    const newSpeed = playbackSpeed >= 2.0 ? 0.5 : playbackSpeed + 0.5;
    setPlaybackSpeed(newSpeed);
    await AsyncStorage.setItem('playbackSpeed', newSpeed.toString());
  };

  const handleBackup = async () => {
    Alert.alert("Backup", "Backing up data to cloud storage...");
    // Mock backup function: integrate with a real cloud storage provider like Firebase
  };

  const handleRestore = async () => {
    Alert.alert("Restore", "Restoring data from cloud storage...");
    // Mock restore function: integrate with cloud storage provider
  };

  const handleResetSettings = async () => {
    await AsyncStorage.clear();
    setIsDarkMode(false);
    setAudioQuality('High');
    setPlaybackSpeed(1.0);
    setAudioPermission(null);
    setStorageUsed(0);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      {/* Dark Mode */}
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Dark Mode</Text>
        <Switch value={isDarkMode} onValueChange={handleDarkModeToggle} />
      </View>

      {/* Audio Quality */}
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Audio Quality</Text>
        <Button title={audioQuality} onPress={toggleAudioQuality} />
      </View>

      {/* Playback Speed */}
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Playback Speed</Text>
        <Button title={`x${playbackSpeed}`} onPress={increasePlaybackSpeed} />
      </View>

      {/* Audio Recording Permission */}
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Audio Recording Permission</Text>
        <Button
          title={audioPermission ? "Permission Granted" : "Request Permission"}
          onPress={requestAudioPermission}
          color={audioPermission ? "green" : "red"}
        />
      </View>

      {/* Storage Management */}
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Storage Used: {storageUsed ? `${storageUsed} bytes` : "Loading..."}</Text>
        <Button title="Clear Storage" onPress={handleResetSettings} color="red" />
      </View>

      {/* Backup and Restore */}
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Backup & Restore</Text>
        <View style={styles.buttonGroup}>
          <Button title="Backup" onPress={handleBackup} />
          <Button title="Restore" onPress={handleRestore} />
        </View>
      </View>

      {/* Reset All Settings */}
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Reset All Settings</Text>
        <Button title="Reset" onPress={handleResetSettings} color="red" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
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
    marginVertical: 15,
  },
  settingText: {
    fontSize: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '50%',
  },
});

export default SettingsScreen;
