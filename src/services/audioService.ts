// src/services/audioService.ts
import { Audio } from 'expo-av';
import { VoiceNote } from '../types';

export const startRecording = async (): Promise<Audio.Recording> => {
  try {
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    await recording.startAsync();
    return recording;
  } catch (error) {
    throw new Error('Failed to start recording');
  }
};

export const stopRecording = async (recording: Audio.Recording): Promise<VoiceNote> => {
  await recording.stopAndUnloadAsync();
  const { uri } = await recording.createNewLoadedSoundAsync();
  return {
    id: Date.now().toString(),
    uri,
    date: new Date().toLocaleString(),
  };
};

export const playSound = async (uri: string) => {
  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true }
  );
  await sound.playAsync();
};
