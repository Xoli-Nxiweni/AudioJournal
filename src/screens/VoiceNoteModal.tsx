import React, { useState, useEffect } from "react";
import { Modal, View, TextInput, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import Slider from '@react-native-community/slider'; // Ensure this package is installed and imported correctly

interface VoiceNoteModalProps {
  visible: boolean;
  onClose: () => void;
  noteText: string;
  onNoteTextChange: (text: string) => void;
  onUpdateNote: () => void;
  onDeleteNote: () => void;
  audioUri: string; // URI of the audio file
  colors: {
    card: string;
    text: string;
    inputBackground: string;
    placeholder: string;
    buttonText: string;
  };
}

const VoiceNoteModal: React.FC<VoiceNoteModalProps> = ({
  visible,
  onClose,
  noteText,
  onNoteTextChange,
  onUpdateNote,
  onDeleteNote,
  audioUri,
  colors,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [duration, setDuration] = useState(0); // Duration of the audio

  // Load the audio file when modal is visible
  useEffect(() => {
    const loadAudio = async () => {
      try {
        if (!audioUri) {
          console.log("No audio URI provided");
          return;
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: false, isLooping: false }
        );
        setSound(sound);

        sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

        // Get audio duration once the sound is loaded
        const status = await sound.getStatusAsync();
        if (status.durationMillis) {
          setDuration(status.durationMillis);
        }

        console.log("Audio loaded, duration:", status.durationMillis);
      } catch (error) {
        console.error("Error loading audio:", error);
      }
    };

    if (visible && audioUri) {
      loadAudio();
    }

    // Cleanup when the modal is closed or component unmounts
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [visible, audioUri]);

  // Handle playback status updates
  const onPlaybackStatusUpdate = (status: Audio.SoundStatus) => {
    if (status.isPlaying) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }

    if (status.positionMillis !== undefined) {
      setPlaybackPosition(status.positionMillis);
    }
  };

  // Play or pause audio on button press
  const onPlayPausePress = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    }
  };

  // Stop the audio and reset playback position
  const onStopPress = async () => {
    if (sound) {
      await sound.stopAsync();
      setPlaybackPosition(0);
    }
  };

  // Rewind audio by 5 seconds
  const onRewindPress = async () => {
    if (sound) {
      const newPosition = Math.max(playbackPosition - 5000, 0); // Rewind 5 seconds
      await sound.setPositionAsync(newPosition);
    }
  };

  // Fast forward audio by 5 seconds
  const onFastForwardPress = async () => {
    if (sound) {
      const newPosition = Math.min(playbackPosition + 5000, duration); // Fast forward 5 seconds
      await sound.setPositionAsync(newPosition);
    }
  };

  // Change playback speed
  const onPlaybackSpeedChange = (value: number) => {
    setPlaybackSpeed(value);
    if (sound) {
      sound.setRateAsync(value, false); // false to change rate without affecting pitch
    }
  };

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
        <TextInput
          value={noteText}
          onChangeText={onNoteTextChange}
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="Edit note"
          placeholderTextColor={colors.placeholder}
        />

        {/* Display audio duration */}
        <Text style={{ color: colors.text }}>
          Duration: {Math.round(duration / 1000)}s
        </Text>

        {/* Audio controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity onPress={onRewindPress} style={styles.controlButton}>
            <Ionicons name="md-rewind" size={30} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onPlayPausePress} style={styles.controlButton}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={30} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onStopPress} style={styles.controlButton}>
            <Ionicons name="stop" size={30} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onFastForwardPress} style={styles.controlButton}>
            <Ionicons name="md-fastforward" size={30} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Playback speed */}
        <Text style={{ color: colors.text }}>Playback Speed: {playbackSpeed}x</Text>
        <Slider
          minimumValue={0.5}
          maximumValue={2.0}
          step={0.1}
          value={playbackSpeed}
          onValueChange={onPlaybackSpeedChange}
          style={styles.slider}
        />

        {/* Modal action buttons */}
        <View style={styles.modalActions}>
          <TouchableOpacity onPress={onUpdateNote} style={styles.actionButton}>
            <Text style={{ color: colors.buttonText }}>Update Note</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDeleteNote} style={styles.actionButton}>
            <Text style={{ color: "red" }}>Delete Note</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: { padding: 20, flex: 1 },
  input: {
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 15,
    borderRadius: 50,
    borderColor: "black",
    borderWidth: 2,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
  },
  controlButton: { padding: 10 },
  slider: {
    width: "80%",
    alignSelf: "center",
    marginVertical: 10,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
});

export default VoiceNoteModal;
