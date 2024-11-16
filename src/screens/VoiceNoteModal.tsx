import React, { useState, useEffect, useCallback } from "react";
import { Modal, View, TextInput, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import Slider from '@react-native-community/slider';
import ErrorBoundary from "../components/ErrorBoundary";

// Define default colors
const defaultColors = {
  card: '#FFFFFF',
  text: '#000000',
  inputBackground: '#F0F0F0',
  placeholder: '#999999',
  buttonText: '#FFFFFF',
  primary: '#007AFF'
};

interface VoiceNoteModalProps {
  visible: boolean;
  onClose: () => void;
  noteText: string;
  onNoteTextChange: (text: string) => void;
  onUpdateNote: () => void;
  onDeleteNote: () => void;
  audioUri: string;
  colors?: {
    card: string;
    text: string;
    inputBackground: string;
    placeholder: string;
    buttonText: string;
    primary: string;
  };
}

interface AudioStatus {
  isLoading: boolean;
  error: string | null;
}

const VoiceNoteModal: React.FC<VoiceNoteModalProps> = ({
  visible,
  onClose,
  noteText,
  onNoteTextChange,
  onUpdateNote,
  onDeleteNote,
  audioUri,
  colors = defaultColors,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [duration, setDuration] = useState(0);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>({
    isLoading: false,
    error: null,
  });

  // Format time in mm:ss format
  const formatTime = useCallback((milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Memoized audio loading function
  const loadAudio = useCallback(async () => {
    if (!audioUri) {
      setAudioStatus({ isLoading: false, error: "No audio URI provided" });
      return;
    }

    setAudioStatus({ isLoading: true, error: null });

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false, isLooping: false },
        onPlaybackStatusUpdate
      );

      setSound(sound);
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        setDuration(status.durationMillis);
      }
      setAudioStatus({ isLoading: false, error: null });
    } catch (error) {
      setAudioStatus({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : "Failed to load audio" 
      });
    }
  }, [audioUri]);

  useEffect(() => {
    if (visible && audioUri) {
      loadAudio();
    }

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [visible, audioUri, loadAudio]);

  const onPlaybackStatusUpdate = useCallback((status: Audio.SoundStatus) => {
    if (!status.isLoaded) return;

    setIsPlaying(status.isPlaying);
    if (status.positionMillis !== undefined) {
      setPlaybackPosition(status.positionMillis);
    }

    // Auto-stop at the end
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPlaybackPosition(0);
    }
  }, []);

  const onPlayPausePress = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        if (playbackPosition >= duration) {
          await sound.setPositionAsync(0);
        }
        await sound.playAsync();
      }
    } catch (error) {
      setAudioStatus({ 
        isLoading: false, 
        error: "Failed to play/pause audio" 
      });
    }
  };

  const onStopPress = async () => {
    if (!sound) return;

    try {
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      setPlaybackPosition(0);
    } catch (error) {
      setAudioStatus({ 
        isLoading: false, 
        error: "Failed to stop audio" 
      });
    }
  };

  const onSeekSliderComplete = async (value: number) => {
    if (!sound) return;

    try {
      const newPosition = value * duration;
      await sound.setPositionAsync(newPosition);
      setPlaybackPosition(newPosition);
    } catch (error) {
      setAudioStatus({ 
        isLoading: false, 
        error: "Failed to seek audio" 
      });
    }
  };

  const onSkipPress = async (skipAmount: number) => {
    if (!sound) return;

    try {
      const newPosition = Math.max(0, Math.min(playbackPosition + skipAmount, duration));
      await sound.setPositionAsync(newPosition);
    } catch (error) {
      setAudioStatus({ 
        isLoading: false, 
        error: "Failed to skip audio" 
      });
    }
  };

  const safeColors = {
    card: colors?.card || defaultColors.card,
    text: colors?.text || defaultColors.text,
    inputBackground: colors?.inputBackground || defaultColors.inputBackground,
    placeholder: colors?.placeholder || defaultColors.placeholder,
    buttonText: colors?.buttonText || defaultColors.buttonText,
    primary: colors?.primary || defaultColors.primary,
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ErrorBoundary>
          <View style={[styles.modalContent, { backgroundColor: safeColors.card }]}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={30} color={safeColors.text} />
            </TouchableOpacity>

            <View style={styles.contentContainer}>
              <TextInput
                value={noteText}
                onChangeText={onNoteTextChange}
                style={[styles.input, { 
                  backgroundColor: safeColors.inputBackground, 
                  color: safeColors.text 
                }]}
                placeholder="Edit note"
                placeholderTextColor={safeColors.placeholder}
                multiline
                maxLength={1000}
              />

              {audioStatus.isLoading ? (
                <ActivityIndicator size="large" color={safeColors.primary} />
              ) : audioStatus.error ? (
                <Text style={[styles.errorText, { color: 'red' }]}>
                  {audioStatus.error}
                </Text>
              ) : (
                <>
                  <View style={styles.timeContainer}>
                    <Text style={[styles.timeText, { color: safeColors.text }]}>
                      {formatTime(playbackPosition)} / {formatTime(duration)}
                    </Text>
                  </View>

                  <Slider
                    value={duration > 0 ? playbackPosition / duration : 0}
                    onSlidingComplete={onSeekSliderComplete}
                    style={styles.progressSlider}
                    minimumTrackTintColor={safeColors.primary}
                  />

                  <View style={styles.controlsContainer}>
                    <TouchableOpacity 
                      onPress={() => onSkipPress(-5000)} 
                      style={[styles.controlButton, { borderColor: safeColors.primary }]}
                    >
                      <Ionicons name="md-rewind" size={30} color={safeColors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={onPlayPausePress} 
                      style={[styles.playButton, { backgroundColor: safeColors.primary }]}
                    >
                      <Ionicons 
                        name={isPlaying ? "pause" : "play"} 
                        size={40} 
                        color={safeColors.buttonText} 
                      />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => onSkipPress(5000)} 
                      style={[styles.controlButton, { borderColor: safeColors.primary }]}
                    >
                      <Ionicons name="md-fastforward" size={30} color={safeColors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.speedControl}>
                    <Text style={[styles.text, { color: safeColors.text }]}>
                      Speed: {playbackSpeed}x
                    </Text>
                    <Slider
                      minimumValue={0.5}
                      maximumValue={2.0}
                      step={0.25}
                      value={playbackSpeed}
                      onValueChange={value => {
                        setPlaybackSpeed(value);
                        sound?.setRateAsync(value, false);
                      }}
                      style={styles.speedSlider}
                      minimumTrackTintColor={safeColors.primary}
                    />
                  </View>
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={onUpdateNote} 
                  style={[styles.actionButton, { backgroundColor: safeColors.primary }]}
                >
                  <Text style={[styles.actionButtonText, { color: safeColors.buttonText }]}>
                    Update Note
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={onDeleteNote} 
                  style={[styles.actionButton, styles.deleteButton]}
                >
                  <Text style={[styles.actionButtonText, { color: 'white' }]}>
                    Delete Note
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ErrorBoundary>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    flex: 1,
    marginTop: 60,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    zIndex: 1,
  },
  input: {
    width: '100%',
    padding: 15,
    borderRadius: 15,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  timeContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressSlider: {
    width: '100%',
    height: 40,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  controlButton: {
    padding: 12,
    marginHorizontal: 20,
    borderWidth: 2,
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    padding: 15,
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
  },
  speedControl: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 20,
  },
  speedSlider: {
    width: '80%',
    height: 40,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 'auto',
    paddingVertical: 20,
  },
  actionButton: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    width: '45%',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default VoiceNoteModal;