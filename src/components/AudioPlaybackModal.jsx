import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

interface AudioPlaybackModalProps {
  isVisible: boolean;
  onClose: () => void;
  note: VoiceNote | null;
  onDelete: (id: string) => void;
  onEdit: (id: string, newTitle: string) => void;
}

const AudioPlaybackModal: React.FC<AudioPlaybackModalProps> = ({
  isVisible,
  onClose,
  note,
  onDelete,
  onEdit,
}) => {
  const [playbackObject, setPlaybackObject] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [newTitle, setNewTitle] = useState(note?.text || "");

  useEffect(() => {
    if (note) setNewTitle(note.text);
  }, [note]);

  useEffect(() => {
    return () => {
      if (playbackObject) playbackObject.unloadAsync();
    };
  }, [playbackObject]);

  const handlePlayPause = async () => {
    if (!note?.uri) return;

    try {
      if (playbackObject) {
        if (isPlaying) {
          await playbackObject.pauseAsync();
        } else {
          await playbackObject.playAsync();
        }
        setIsPlaying(!isPlaying);
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: note.uri },
          { shouldPlay: true, rate: playbackSpeed }
        );
        setPlaybackObject(sound);
        setIsPlaying(true);
      }
    } catch (error) {
      Alert.alert("Playback Error", "Unable to play the audio.");
    }
  };

  const handleChangeSpeed = async (speed: number) => {
    if (playbackObject) {
      await playbackObject.setRateAsync(speed, true);
    }
    setPlaybackSpeed(speed);
  };

  const handleDelete = () => {
    if (note) {
      onDelete(note.id);
      onClose();
    }
  };

  const handleEdit = () => {
    if (note) {
      onEdit(note.id, newTitle);
      onClose();
    }
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {note ? (
            <>
              <Text style={styles.title}>Edit Note</Text>
              <TextInput
                style={styles.titleInput}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Enter new title"
              />
              <Text style={styles.duration}>
                Duration: {Math.floor(note.duration / 60)}:
                {note.duration % 60 < 10 ? "0" : ""}
                {note.duration % 60}
              </Text>
              <View style={styles.controls}>
                <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton}>
                  <Ionicons
                    name={isPlaying ? "pause-circle" : "play-circle"}
                    size={50}
                    color="blue"
                  />
                </TouchableOpacity>
                <View style={styles.speedControls}>
                  {[0.5, 1.0, 1.5, 2.0].map((speed) => (
                    <TouchableOpacity
                      key={speed}
                      style={[
                        styles.speedButton,
                        playbackSpeed === speed && styles.selectedSpeed,
                      ]}
                      onPress={() => handleChangeSpeed(speed)}
                    >
                      <Text>{speed}x</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
                  <Text>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                  <Text>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={onClose}>
                  <Text>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text>No note selected</Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  titleInput: {
    borderBottomWidth: 1,
    width: "100%",
    marginBottom: 20,
    padding: 5,
  },
  duration: {
    marginBottom: 20,
    fontSize: 16,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  controlButton: {
    padding: 10,
  },
  speedControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  speedButton: {
    padding: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderRadius: 5,
  },
  selectedSpeed: {
    backgroundColor: "blue",
    color: "white",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  actionButton: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: "center",
  },
});

export default AudioPlaybackModal;
