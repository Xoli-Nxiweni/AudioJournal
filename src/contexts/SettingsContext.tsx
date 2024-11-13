// src/contexts/SettingsContext.tsx
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsContextProps {
  isDarkMode: boolean;
  audioQuality: string;
  playbackSpeed: number;
  setDarkMode: (value: boolean) => void;
  updateAudioQuality: (value: string) => void;
  updatePlaybackSpeed: (value: number) => void;
}

export const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [audioQuality, setAudioQuality] = useState('High');
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0); // Renamed to avoid conflict

  useEffect(() => {
    const loadSettings = async () => {
      const darkMode = await AsyncStorage.getItem('darkMode');
      const savedAudioQuality = await AsyncStorage.getItem('audioQuality');
      const savedPlaybackSpeed = await AsyncStorage.getItem('playbackSpeed');
      
      if (darkMode !== null) setIsDarkMode(JSON.parse(darkMode));
      if (savedAudioQuality) setAudioQuality(savedAudioQuality);
      if (savedPlaybackSpeed) setPlaybackSpeedState(parseFloat(savedPlaybackSpeed));
    };
    loadSettings();
  }, []);

  // Update dark mode
  const setDarkMode = async (value: boolean) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem('darkMode', JSON.stringify(value));
  };

  // Update audio quality
  const updateAudioQuality = async (value: string) => {
    setAudioQuality(value);
    await AsyncStorage.setItem('audioQuality', value);
  };

  // Update playback speed (avoided name conflict)
  const updatePlaybackSpeed = async (value: number) => {
    setPlaybackSpeedState(value);
    await AsyncStorage.setItem('playbackSpeed', value.toString());
  };

  return (
    <SettingsContext.Provider value={{ isDarkMode, audioQuality, playbackSpeed: playbackSpeed, setDarkMode, updateAudioQuality, updatePlaybackSpeed }}>
      {children}
    </SettingsContext.Provider>
  );
};
