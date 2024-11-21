import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";

const defaultColors = {
  card: "#1E1E1E",
  text: "#FFFFFF",
  inputBackground: "#2B2B2B",
  placeholder: "#999999",
  buttonText: "#FFFFFF",
  primary: "#0DBD8B",
  accent: "#FF3B30",
};

interface VoiceNoteModalProps {
  visible: boolean;
  onClose: () => void;
  noteText: string;
  onNoteTextChange: (text: string) => void;
  onUpdateNote: () => void;
  onDeleteNote: () => void;
  audioUri: string;
  colors?: typeof defaultColors;
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
  const [volume, setVolume] = useState(1.0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const loadAudio = useCallback(async () => {
    if (!audioUri) return;

    setIsLoading(true);
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false, volume }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setDuration(status.durationMillis || 0);
          setPlaybackPosition(status.positionMillis || 0);
          setIsPlaying(status.isPlaying);
        }
      });

      setSound(sound);
    } catch (error) {
      console.error("Failed to load audio:", error);
    } finally {
      setIsLoading(false);
    }
  }, [audioUri, volume]);

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

  const handlePlayPause = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error("Failed to toggle play/pause:", error);
    }
  };

  const handleVolumeChange = async (value: number) => {
    setVolume(value);
    if (sound) {
      await sound.setVolumeAsync(value);
    }
  };

  const handleSpeedChange = async (value: number) => {
    setPlaybackSpeed(value);
    if (sound) {
      await sound.setRateAsync(value, false);
    }
  };

  const handleSeek = async (value: number) => {
    if (sound) {
      const newPosition = value * duration;
      await sound.setPositionAsync(newPosition);
      setPlaybackPosition(newPosition);
    }
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, { backgroundColor: 'skyblue' }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={30} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.inputBackground, color: colors.text },
              ]}
              value={noteText}
              onChangeText={onNoteTextChange}
              placeholder="Edit note title"
              placeholderTextColor={colors.placeholder}
              multiline
            />

            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <View style={styles.time}>
                  <Text style={[styles.timeText, { color: colors.text }]}>
                    {formatTime(playbackPosition)} / {formatTime(duration)}
                  </Text>
                </View>

                <Slider
                  value={playbackPosition / duration}
                  onSlidingComplete={handleSeek}
                  minimumTrackTintColor={colors.primary}
                  thumbTintColor={colors.primary}
                  style={styles.slider}
                />

                <View style={styles.controls}>
                  <TouchableOpacity onPress={() => handleSeek(-0.1)}>
                    <Ionicons name="play-back" size={40} color={colors.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handlePlayPause}
                    style={[
                      styles.playButton,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={50}
                      color={colors.buttonText}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleSeek(0.1)}>
                    <Ionicons
                      name="play-forward"
                      size={40}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.volumeControl}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Volume
                  </Text>
                  <Slider
                    value={volume}
                    onValueChange={handleVolumeChange}
                    minimumTrackTintColor={colors.primary}
                    thumbTintColor={colors.primary}
                    style={styles.slider}
                  />
                </View>

                <View style={styles.speedControl}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Speed: {playbackSpeed.toFixed(1)}x
                  </Text>
                  <Slider
                    minimumValue={0.5}
                    maximumValue={2.0}
                    step={0.1}
                    value={playbackSpeed}
                    onSlidingComplete={handleSpeedChange}
                    minimumTrackTintColor={colors.primary}
                    thumbTintColor={colors.primary}
                    style={styles.slider}
                  />
                </View>
              </>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={onUpdateNote}
              >
                <Text style={styles.actionText}>Update</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.accent }]}
                onPress={onDeleteNote}
              >
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeButton: {
    padding: 10,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  input: {
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginVertical: 20,
  },
  time: {
    alignItems: "center",
    marginVertical: 10,
  },
  timeText: {
    fontSize: 16,
  },
  slider: {
    width: "100%",
    marginVertical: 10,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  playButton: {
    borderRadius: 50,
    padding: 20,
  },
  volumeControl: {
    marginVertical: 20,
  },
  speedControl: {
    marginVertical: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  actionButton: {
    padding: 15,
    borderRadius: 10,
  },
  actionText: {
    color: defaultColors.buttonText,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default VoiceNoteModal;