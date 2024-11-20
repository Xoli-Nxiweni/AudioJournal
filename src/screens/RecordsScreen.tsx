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

// Interfaces
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

interface PlaybackState {
  isPlaying: boolean;
  playbackSpeed: number;
  currentNoteId: string | null;
  progress: number;
}

// Constants
const STORAGE_KEY = "voiceNotes";
const MAX_RECORDING_DURATION = 600; // 10 minutes
const PLAYBACK_SPEEDS = [0.5, 1.0, 1.5, 2.0];

const RecordsScreen: React.FC = () => {
  const { colors } = useTheme();
  
  // State Management
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    isPaused: false,
  });

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    playbackSpeed: 1.0,
    currentNoteId: null,
    progress: 0,
  });

  // Audio Session Setup
  useEffect(() => {
    setupAudioSession();
    return () => {
      cleanupAudioSession();
    };
  }, []);

  // Load Notes
  useEffect(() => {
    loadNotes();
  }, []);

  // Recording Timer
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

  // Audio Setup Functions
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

  // Storage Functions
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

  // Recording Functions
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

  // Playback Functions
  const playAudio = async (uri: string, noteId: string) => {
    try {
      if (currentSound) {
        await currentSound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { 
          shouldPlay: true,
          rate: playbackState.playbackSpeed,
          progressUpdateIntervalMillis: 100,
        }
      );
      
      setCurrentSound(sound);
      setPlaybackState(prev => ({
        ...prev,
        isPlaying: true,
        currentNoteId: noteId,
        progress: 0,
      }));

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded) {
          setPlaybackState(prev => ({
            ...prev,
            progress: status.positionMillis / status.durationMillis,
          }));

          if (status.didJustFinish) {
            await sound.unloadAsync();
            setCurrentSound(null);
            setPlaybackState(prev => ({
              ...prev,
              isPlaying: false,
              currentNoteId: null,
              progress: 0,
            }));
          }
        }
      });
    } catch (error) {
      Alert.alert("Error", "Failed to play audio.");
    }
  };

  const pauseAudio = async () => {
    try {
      if (currentSound) {
        await currentSound.pauseAsync();
        setPlaybackState(prev => ({
          ...prev,
          isPlaying: false,
        }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pause audio.");
    }
  };

  const resumeAudio = async () => {
    try {
      if (currentSound) {
        await currentSound.playAsync();
        setPlaybackState(prev => ({
          ...prev,
          isPlaying: true,
        }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to resume audio.");
    }
  };

  const changePlaybackSpeed = async (speed: number) => {
    try {
      if (currentSound) {
        await currentSound.setRateAsync(speed, true);
        setPlaybackState(prev => ({
          ...prev,
          playbackSpeed: speed,
        }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to change playback speed.");
    }
  };

  // Note Management Functions
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

  // Render Functions
  const renderRightActions = (noteId: string) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => deleteNote(noteId)}
    >
      <Ionicons name="trash" size={24} color="white" />
    </TouchableOpacity>
  );

  const renderNoteItem = ({ item }: { item: VoiceNote }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
      <View style={[styles.noteContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.noteContent}
          onLongPress={() => {
            setSelectedNote(item);
            setActionModalVisible(true);
          }}
        >
          <Text style={[styles.noteText, { color: colors.text }]}>
            {item.text}
          </Text>
          <Text style={[styles.noteDetails, { color: colors.text }]}>
            {item.date} • {formatDuration(item.duration)}
          </Text>
          {playbackState.currentNoteId === item.id && (
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${playbackState.progress * 100}%` }
                ]} 
              />
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.playbackControls}>
          {playbackState.currentNoteId === item.id && (
            <View style={styles.speedControl}>
              {PLAYBACK_SPEEDS.map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[
                    styles.speedButton,
                    playbackState.playbackSpeed === speed && styles.activeSpeedButton,
                  ]}
                  onPress={() => changePlaybackSpeed(speed)}
                >
                  <Text style={[
                    styles.speedButtonText,
                    playbackState.playbackSpeed === speed && styles.activeSpeedButtonText,
                  ]}>
                    {speed}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          <TouchableOpacity
            onPress={() => {
              if (playbackState.currentNoteId === item.id) {
                if (playbackState.isPlaying) {
                  pauseAudio();
                } else {
                  resumeAudio();
                }
              } else {
                playAudio(item.uri, item.id);
              }
            }}
          >
            <Ionicons
              name={
                playbackState.currentNoteId === item.id && playbackState.isPlaying
                  ? "pause-circle"
                  : "play-circle"
              }
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Swipeable>
  );

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Main Render
  return (
    <View style={[styles.container, { backgroundColor: "skyblue" }]}>
      <TextInput
        style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text }]}
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Note Actions</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setModalVisible(true);
                setActionModalVisible(false);
              }}
            >
              <Text style={styles.modalButtonText}>Edit Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={() => selectedNote && deleteNote(selectedNote.id)}
            >
              <Text style={styles.modalButtonText}>Delete Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setActionModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Note</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: colors.background, color: colors.text }]}
              value={selectedNote?.text}
              onChangeText={(text) => setSelectedNote(prev => prev ? {...prev, text} : null)}
              autoFocus
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => selectedNote && editNote(selectedNote.text)}
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
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
    padding: 16,
  },
  searchInput: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  noteContainer: {
    flexDirection: "row",
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  noteContent: {
    flex: 1,
  },
  noteText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  noteDetails: {
    fontSize: 12,
    opacity: 0.7,
  },
  playbackControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  speedControl: {
    flexDirection: "row",
    marginRight: 8,
  },
  speedButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 4,
    backgroundColor: "#eee",
  },
  activeSpeedButton: {
    backgroundColor: "#007AFF",
  },
  speedButtonText: {
    fontSize: 12,
    color: "#333",
  },
  activeSpeedButtonText: {
    color: "white",
  },
  progressBar: {
    height: 2,
    backgroundColor: "#eee",
    marginTop: 8,
    borderRadius: 1,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 1,
  },
  recordButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  recordingTimer: {
    color: "white",
    fontSize: 12,
    marginTop: 4,
  },
  deleteAction: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  modalButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  modalButtonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
  deleteButton: {
    backgroundColor: "red",
  },
  editInput: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 16,
    opacity: 0.7,
  },
});

export default RecordsScreen;
          