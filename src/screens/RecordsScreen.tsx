import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  Modal,
  Button,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
} from "react-native";
import { VoiceNote } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

const RecordsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [timer, setTimer] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoading(true);
        const storedNotes = await AsyncStorage.getItem("voiceNotes");
        if (storedNotes) setVoiceNotes(JSON.parse(storedNotes));
      } catch (error) {
        console.error("Failed to load notes from AsyncStorage", error);
      } finally {
        setLoading(false);
      }
    };
    loadNotes();
  }, []);

  useEffect(() => {
    let interval;
    if (recording) {
      interval = setInterval(() => {
        setTimer((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [recording]);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  const requestPermissions = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow microphone access to record audio."
      );
      return false;
    }
    return true;
  };

  const handleStartRecording = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      const noteId = Date.now().toString();
      setNewNoteText("");
      setPreviewUrl(null);
      setRecording(recording);
    } catch (error) {
      console.error("Failed to start recording", error);
      Alert.alert("Error", "Failed to start recording.");
    }
  };

  const handleStopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const newVoiceNote: VoiceNote = {
        id: Date.now().toString(),
        text: newNoteText || "Untitled note",
        uri,
      };
      const updatedNotes = [...voiceNotes, newVoiceNote];
      setVoiceNotes(updatedNotes);
      await AsyncStorage.setItem("voiceNotes", JSON.stringify(updatedNotes));
      setPreviewUrl(uri);
      setRecording(null);
    } catch (error) {
      console.error("Failed to stop recording", error);
      Alert.alert("Error", "Failed to stop recording.");
    }
  };

  const handlePlayNote = async (uri: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          rate: playbackSpeed,
          positionMillis: playbackPosition,
        }
      );
      setSound(sound);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis);
        }
      });
    } catch (error) {
      console.error("Error playing note:", error);
      Alert.alert("Error", "Failed to play audio.");
    }
  };

  const handlePause = () => {
    if (sound) {
      sound.pauseAsync();
    }
  };

  const handleFastForward = () => {
    setPlaybackPosition((prev) => prev + 10000);
  };

  const handleRewind = () => {
    setPlaybackPosition((prev) => Math.max(0, prev - 10000));
  };

  const handlePlaybackSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (sound) {
      sound.setRateAsync(speed, true);
    }
  };

  const openNoteModal = (note: VoiceNote) => {
    setSelectedNote(note);
    setNewNoteText(note.text);
    setIsModalVisible(true);
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;

    const updatedNotes = voiceNotes.filter(
      (note) => note.id !== selectedNote.id
    );
    setVoiceNotes(updatedNotes);
    await AsyncStorage.setItem("voiceNotes", JSON.stringify(updatedNotes));
    setIsModalVisible(false);
  };

  const handleUpdateNote = async () => {
    if (!selectedNote) return;

    const updatedNotes = voiceNotes.map((note) =>
      note.id === selectedNote.id ? { ...note, text: newNoteText } : note
    );
    setVoiceNotes(updatedNotes);
    await AsyncStorage.setItem("voiceNotes", JSON.stringify(updatedNotes));
    setIsModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <Text style={{ color: colors.text }}>Loading...</Text>
      ) : (
        <FlatList
          data={voiceNotes}
          renderItem={({ item }) => (
            <View
              style={[styles.noteContainer, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.noteText, { color: colors.text }]}>
                {item.text}
              </Text>
              <TouchableOpacity
                onPress={() => openNoteModal(item)}
                style={styles.playButton}
              >
                <Ionicons name="play" size={30} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteNote}
                style={styles.deleteButton}
              >
                <Ionicons name="trash" size={30} color="white" />
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={(item) => item.id}
        />
      )}

      {/* Modal for voice note details */}
      <Modal
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Edit Voice Note
          </Text>

          <TextInput
            value={newNoteText}
            onChangeText={setNewNoteText}
            style={[
              styles.input,
              { backgroundColor: colors.inputBackground, color: colors.text },
            ]}
            placeholder="Edit note"
            placeholderTextColor={colors.placeholder}
          />

          <View style={styles.controlsContainer}>
            <TouchableOpacity
              onPress={handleRewind}
              style={styles.controlButton}
            >
              <Ionicons name="play-back" size={30} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={
                sound
                  ? handlePause
                  : () => handlePlayNote(selectedNote?.uri || "")
              }
              style={styles.controlButton}
            >
              <Ionicons
                name={sound ? "pause" : "play"}
                size={30}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleFastForward}
              style={styles.controlButton}
            >
              <Ionicons name="play-forward" size={30} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.speedContainer}>
            <Text style={{ color: colors.text }}>
              Playback Speed: {playbackSpeed}
            </Text>
            <TouchableOpacity
              onPress={() => handlePlaybackSpeedChange(1.0)}
              style={styles.speedButton}
            >
              <Ionicons name="" size={30} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handlePlaybackSpeedChange(1.5)}
              style={styles.speedButton}
            >
              <Ionicons name="" size={30} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handlePlaybackSpeedChange(2.0)}
              style={styles.speedButton}
            >
              <Ionicons name="" size={30} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={handleUpdateNote}
              style={styles.actionButton}
            >
              <Text style={{ color: colors.buttonText }}>Update Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteNote}
              style={styles.actionButton}
            >
              <Text style={{ color: "red" }}>Delete Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.recordControls}>
        {recording && (
          <>
            <Text style={styles.timerText}>{formatTime(timer)}</Text>
            <TextInput
              value={newNoteText}
              onChangeText={setNewNoteText}
              style={styles.input}
              placeholder="title of the Audio!"
              placeholderTextColor={colors.placeholder}
            />
          </>
        )}

        {!recording ? (
          <TouchableOpacity
            onPress={handleStartRecording}
            style={styles.recordButton}
          >
            <Ionicons
              name="mic"
              size={20}
              color="white"
              style={{ textAlign: "center" }}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleStopRecording}
            style={styles.stopButton}
          >
            <Ionicons
              name="square"
              size={20}
              color="white"
              style={{ textAlign: "center" }}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    padding: 10,
  },
  noteText: { flex: 1, fontSize: 18 },
  playButton: { marginLeft: 15 },
  deleteButton: { marginLeft: 15 },
  modalContent: { padding: 20, flex: 1 },
  timerText: {
    fontSize: 18,
    color: "black",
    marginBottom: 10,
    textAlign: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
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
    justifyContent: "space-between",
    marginVertical: 10,
  },
  controlButton: { padding: 10 },
  speedContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  speedButton: { padding: 10 },
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
  recordControls: {
    flexDirection: "column",
    justifyContent: "center",
    marginBottom: 20,
  },
  recordButton: {
    padding: 20,
    backgroundColor: "#FF0000",
    borderRadius: 50,
    marginHorizontal: 175,
  },
  stopButton: {
    padding: 20,
    backgroundColor: "#FF0000",
    borderRadius: 50,
    marginHorizontal: 175,
  },
});

export default RecordsScreen;
