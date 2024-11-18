import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@react-navigation/native";
import Swipeable from "react-native-gesture-handler/Swipeable";

interface VoiceNote {
  id: string;
  text: string;
  uri: string;
  date: string;
  time: string;
  duration: number;
}

interface RecordingState {
  isRecording: boolean;
  duration: number;
  isPaused: boolean;
}

const STORAGE_KEY = "voiceNotes";
const MAX_RECORDING_DURATION = 600; // 10 minutes

const RecordsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    isPaused: false,
  });
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);

  // Initialize audio session
  useEffect(() => {
    setupAudioSession();
    return () => {
      cleanupAudioSession();
    };
  }, []);

  // Load notes from storage
  useEffect(() => {
    loadNotes();
  }, []);

  // Recording duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingState.isRecording && !recordingState.isPaused) {
      interval = setInterval(() => {
        setRecordingState((prev) => {
          if (prev.duration >= MAX_RECORDING_DURATION) {
            handleStopRecording();
            return prev;
          }
          return { ...prev, duration: prev.duration + 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingState.isRecording, recordingState.isPaused]);

  const setupAudioSession = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to initialize audio session.");
    }
  };

  const cleanupAudioSession = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
      }
      if (currentSound) {
        await currentSound.unloadAsync();
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  };

  const loadNotes = async () => {
    setLoading(true);
    try {
      const storedNotes = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedNotes) {
        setVoiceNotes(JSON.parse(storedNotes));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load notes.");
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async (notes: VoiceNote[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      Alert.alert("Error", "Failed to save notes.");
    }
  };

  const handleStartRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please grant microphone access");
        return;
      }

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await newRecording.startAsync();
      setRecording(newRecording);
      setRecordingState({ isRecording: true, duration: 0, isPaused: false });
    } catch (error) {
      Alert.alert("Error", "Failed to start recording.");
    }
  };

  const handleStopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error("Recording URI is null");

      const date = new Date();
      const newNote: VoiceNote = {
        id: Date.now().toString(),
        text: `Note ${voiceNotes.length + 1}`,
        uri,
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        duration: recordingState.duration,
      };

      const updatedNotes = [newNote, ...voiceNotes];
      setVoiceNotes(updatedNotes);
      await saveNotes(updatedNotes);
      setSelectedNote(newNote);
      setModalVisible(true);
    } catch (error) {
      Alert.alert("Error", "Failed to save recording.");
    } finally {
      setRecording(null);
      setRecordingState({ isRecording: false, duration: 0, isPaused: false });
    }
  };

  const playAudio = async (uri: string) => {
    try {
      if (currentSound) {
        await currentSound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      setCurrentSound(sound);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          setCurrentSound(null);
        }
      });
    } catch (error) {
      Alert.alert("Error", "Failed to play audio.");
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const noteToDelete = voiceNotes.find((note) => note.id === noteId);
      if (noteToDelete) {
        await FileSystem.deleteAsync(noteToDelete.uri).catch(() => {});
      }

      const updatedNotes = voiceNotes.filter((note) => note.id !== noteId);
      setVoiceNotes(updatedNotes);
      await saveNotes(updatedNotes);
      setActionModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to delete note.");
    }
  };

  const editNote = async (newText: string) => {
    if (!selectedNote) return;

    try {
      const updatedNotes = voiceNotes.map((note) =>
        note.id === selectedNote.id ? { ...note, text: newText } : note
      );
      setVoiceNotes(updatedNotes);
      await saveNotes(updatedNotes);
      setModalVisible(false);
      setSelectedNote(null);
    } catch (error) {
      Alert.alert("Error", "Failed to update note.");
    }
  };

  const renderRightActions = (noteId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => deleteNote(noteId)}
      >
        <Ionicons name="trash" size={24} color="white" />
      </TouchableOpacity>
    );
  };

  const renderNoteItem = ({ item }: { item: VoiceNote }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
      <TouchableOpacity
        style={[styles.noteContainer, { backgroundColor: colors.card }]}
        onPress={() => playAudio(item.uri)}
        onLongPress={() => {
          setSelectedNote(item);
          setActionModalVisible(true);
        }}
      >
        <View style={styles.noteContent}>
          <Text style={[styles.noteText, { color: colors.text }]}>
            {item.text}
          </Text>
          <Text style={[styles.noteDetails, { color: colors.text }]}>
            {item.date} • {formatDuration(item.duration)}
          </Text>
        </View>
        <Ionicons name="play-circle" size={24} color={colors.text} />
      </TouchableOpacity>
    </Swipeable>
  );

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TextInput
        style={[styles.searchInput, { backgroundColor: colors.card }]}
        placeholder="Search Notes"
        placeholderTextColor={colors.text}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={voiceNotes.filter((note) =>
            note.text.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No notes available. Start recording!
            </Text>
          }
        />
      )}

      {/* Recording Button */}
      <TouchableOpacity
        style={[
          styles.recordButton,
          {
            backgroundColor: recordingState.isRecording ? "red" : colors.primary,
          },
        ]}
        onPress={recordingState.isRecording ? handleStopRecording : handleStartRecording}
      >
        <Ionicons
          name={recordingState.isRecording ? "stop" : "mic"}
          size={24}
          color="white"
        />
        {recordingState.isRecording && (
          <Text style={styles.recordingTimer}>
            {formatDuration(recordingState.duration)}
          </Text>
        )}
      </TouchableOpacity>

      {/* Action Modal */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              What would you like to do?
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setActionModalVisible(false);
                setModalVisible(true);
              }}
            >
              <Text style={{ color: "white" }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "red" }]}
              onPress={() => deleteNote(selectedNote?.id || "")}
            >
              <Text style={{ color: "white" }}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={() => setActionModalVisible(false)}
            >
              <Text style={{ color: "white" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Note Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.modalInput, { color: colors.text }]}
              value={selectedNote?.text || ""}
              onChangeText={(text) =>
                setSelectedNote(selectedNote ? { ...selectedNote, text } : null)
              }
              placeholder="Enter note title"
              placeholderTextColor={colors.text}
            />
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => editNote(selectedNote?.text || "")}
            >
              <Text style={{ color: "white" }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: "white" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  searchInput: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  noteContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  noteContent: {
    flex: 1,
    marginRight: 10,
  },
  noteText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  noteDetails: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButton: {
    padding: 12,
    marginVertical: 5,
    alignItems: "center",
    borderRadius: 5,
  },
  modalInput: {
    borderBottomWidth: 1,
    marginBottom: 20,
    padding: 8,
    fontSize: 16,
  },
  recordButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recordingTimer: {
    color: "white",
    fontSize: 12,
    marginTop: 4,
    position: "absolute",
    bottom: -20,
  },
  deleteAction: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    height: "100%",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
});

export default RecordsScreen;