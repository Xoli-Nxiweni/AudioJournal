import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
} from "react-native";
import * as FileSystem from "expo-file-system";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { VoiceNote } from "../types";
import VoiceNoteModal from "./VoiceNoteModal";

interface RecordingState {
  isRecording: boolean;
  duration: number;
  isPaused: boolean;
}

const STORAGE_KEY = "voiceNotes";

const RecordsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    isPaused: false,
  });
  const [loading, setLoading] = useState({
    notes: false,
    recording: false,
  });
  const [modalState, setModalState] = useState({
    recording: false,
    note: false,
  });
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null);
  const [newTitle, setNewTitle] = useState("");

  // Initialize audio session
  useEffect(() => {
    setupAudioSession();
    return () => cleanupAudioSession();
  }, []);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingState.isRecording && !recordingState.isPaused) {
      interval = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
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
      handleError("Failed to setup audio session", error);
    }
  };

  const cleanupAudioSession = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      handleError("Failed to cleanup audio session", error);
    }
  };

  const handleError = (message: string, error: any) => {
    console.error(message, error);
    Alert.alert("Error", message);
  };

  const loadNotes = async () => {
    setLoading(prev => ({ ...prev, notes: true }));
    try {
      const storedNotes = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedNotes) {
        setVoiceNotes(JSON.parse(storedNotes));
      }
    } catch (error) {
      handleError("Failed to load notes", error);
    } finally {
      setLoading(prev => ({ ...prev, notes: false }));
    }
  };

  const saveNotes = async (notes: VoiceNote[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      handleError("Failed to save notes", error);
    }
  };

  const handleStartRecording = async () => {
    setLoading(prev => ({ ...prev, recording: true }));
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Microphone access is required to record audio.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Settings", onPress: () => Platform.OS === "ios" ? Linking.openURL("app-settings:") : Linking.openSettings() }
          ]
        );
        return;
      }

      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          extension: '.m4a',
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          extension: '.m4a',
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);
      setRecordingState({
        isRecording: true,
        duration: 0,
        isPaused: false,
      });
    } catch (error) {
      handleError("Failed to start recording", error);
    } finally {
      setLoading(prev => ({ ...prev, recording: false }));
    }
  };

  const handlePauseRecording = async () => {
    if (!recording) return;
    try {
      if (recordingState.isPaused) {
        await recording.startAsync();
      } else {
        await recording.pauseAsync();
      }
      setRecordingState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    } catch (error) {
      handleError("Failed to pause/resume recording", error);
    }
  };

  const handleStopRecording = async () => {
    if (!recording) return;
    setLoading(prev => ({ ...prev, recording: true }));
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error("Recording URI is null");

      const date = new Date();
      const newNote: VoiceNote = {
        id: Date.now().toString(),
        text: "Untitled Note",
        uri,
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        duration: recordingState.duration,
      };

      setSelectedNote(newNote);
      setModalState(prev => ({ ...prev, recording: true }));
      setNewTitle("");
      
      const updatedNotes = [newNote, ...voiceNotes];
      setVoiceNotes(updatedNotes);
      await saveNotes(updatedNotes);
    } catch (error) {
      handleError("Failed to stop recording", error);
    } finally {
      setRecording(null);
      setRecordingState({
        isRecording: false,
        duration: 0,
        isPaused: false,
      });
      setLoading(prev => ({ ...prev, recording: false }));
    }
  };

  const handleUpdateNote = useCallback(async (note: VoiceNote) => {
    try {
      const updatedNotes = voiceNotes.map(n => 
        n.id === note.id ? note : n
      );
      setVoiceNotes(updatedNotes);
      await saveNotes(updatedNotes);
      setModalState(prev => ({ ...prev, note: false }));
    } catch (error) {
      handleError("Failed to update note", error);
    }
  }, [voiceNotes]);

  const handleDeleteNote = useCallback((noteId: string) => {
    // Ask for confirmation before deleting
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this note?",
      [
        {
          text: "Cancel",
          style: "cancel", // Cancels the action and closes the alert
        },
        {
          text: "OK", // Proceed with deletion if the user confirms
          onPress: async () => {
            try {
              // Find the note to delete
              const noteToDelete = voiceNotes.find(n => n.id === noteId);
              if (noteToDelete?.uri) {
                // Delete the audio file if a URI exists
                await FileSystem.deleteAsync(noteToDelete.uri, { idempotent: true });
              }
  
              // Update the voiceNotes state to remove the deleted note
              setVoiceNotes(prevNotes => {
                const updatedNotes = prevNotes.filter(n => n.id !== noteId);
                saveNotes(updatedNotes); // Save updated list to storage
                return updatedNotes;
              });
  
              // Close the modal after deletion
              setModalState(prev => ({ ...prev, note: false }));
              setTimeout(()=>{
                Alert.alert("Voice record deleted successfully!!!")
              }, 400)
            } catch (error) {
              handleError("Failed to delete note", error);
            }
          }
        }
      ],
      { cancelable: true } // Allow closing the alert by tapping outside
    );
  }, [voiceNotes, setVoiceNotes, saveNotes]);
  

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const renderNoteItem = useCallback(({ item }: { item: VoiceNote }) => (
    <TouchableOpacity
      style={[styles.noteContainer, { backgroundColor: colors.card }]}
      onPress={() => {
        setSelectedNote(item);
        setModalState(prev => ({ ...prev, note: true }));
      }}
    >
      <View style={styles.noteContent}>
        <Text style={[styles.noteText, { color: colors.text }]} numberOfLines={1}>
          {item.text}
        </Text>
        <Text style={[styles.noteDetails, { color: colors.text }]}>
          {`${item.date} ${item.time} • ${formatDuration(item.duration || 0)}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={colors.text} />
    </TouchableOpacity>
  ), [colors]);

  const filteredNotes = voiceNotes.filter(note =>
    note.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: 'skyblue' }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        {/* <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} /> */}
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text }]}
          placeholder="Search notes..."
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Voice Notes List */}
      {loading.notes ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : filteredNotes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mic-outline" size={48} color={colors.text} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {searchQuery ? "No matching recordings found" : "Start recording your first note"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={item => item.id}
          renderItem={renderNoteItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Recording Controls */}
<View style={styles.recordControls}>
  {recordingState.isRecording && (
    <>
      <Text style={[styles.timerText, { color: colors.text }]}>
        {formatDuration(recordingState.duration)}
      </Text>
      {loading.recording && (
        <ActivityIndicator size="small" color={colors.primary} style={styles.recordingLoader} />
      )}
    </>
  )}
  <View style={styles.recordButtonsContainer}>
    {/* Show Pause button when recording is in progress */}
    {recordingState.isRecording && !recordingState.isPaused && (
      <TouchableOpacity
        style={[styles.controlButton, { backgroundColor: colors.primary }]}
        onPress={handlePauseRecording}
        disabled={loading.recording}
      >
        <Ionicons name="pause" size={24} color="#FFF" />
      </TouchableOpacity>
    )}

    {/* Show Play button when recording is paused */}
    {recordingState.isRecording && recordingState.isPaused && (
      <TouchableOpacity
        style={[styles.controlButton, { backgroundColor: colors.primary }]}
        onPress={handlePauseRecording}
        disabled={loading.recording}
      >
        <Ionicons name="play" size={24} color="#FFF" />
      </TouchableOpacity>
    )}

    {/* Show Start/Stop recording button */}
    <TouchableOpacity
      style={[
        styles.recordButton,
        { backgroundColor: recordingState.isRecording ? "#E53935" : colors.primary }
      ]}
      onPress={recordingState.isRecording ? handleStopRecording : handleStartRecording}
      disabled={loading.recording}
    >
      <Ionicons
        name={recordingState.isRecording ? "square" : "mic"}
        size={24}
        color="#FFF"
      />
    </TouchableOpacity>
  </View>
</View>


      {/* Save Recording Modal */}
      <Modal
        visible={modalState.recording}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalState(prev => ({ ...prev, recording: false }))}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Save Recording
            </Text>
            <TextInput
              style={[styles.titleInput, {
                backgroundColor: colors.background,
                color: colors.text,
              }]}
              placeholder="Enter title"
              placeholderTextColor={colors.placeholder}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => setModalState(prev => ({ ...prev, recording: false }))}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                }]}
                onPress={() => {
                  if (selectedNote && newTitle.trim()) {
                    handleUpdateNote({
                      ...selectedNote,
                      text: newTitle.trim(),
                    });
                    setModalState(prev => ({ ...prev, recording: false }));
                  }
                }}
              >
                <Text style={{ color: "#FFF" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Voice Note Modal */}
      {selectedNote && (
        <VoiceNoteModal
          visible={modalState.note}
          onClose={() => setModalState(prev => ({ ...prev, note: false }))}
          noteText={selectedNote.text}
          onNoteTextChange={(text) => setSelectedNote(prev => prev ? { ...prev, text } : null)}
          onUpdateNote={() => handleUpdateNote(selectedNote!)}
          onDeleteNote={() => handleDeleteNote(selectedNote!.id)}
          uri={selectedNote.uri}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    backgroundColor: 'coral',
    paddingHorizontal: 10,
    gap: 10,
    // paddingVertical: 10,
    
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
  },
  noteContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
    borderBottomWidth: 5,
    borderColor: "skyblue",
    alignItems: "center",
  },
  noteContent: {
    flex: 1,
  },
  noteText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  noteDetails: {
    fontSize: 12,
    color: "#888",
  },
  listContent: {
    paddingBottom: 100,
  },
  recordControls: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  recordButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  controlButton: {
    padding: 16,
    borderRadius: 50,
    margin: 8,
  },
  recordButton: {
    padding: 20,
    borderRadius: 50,
    backgroundColor: "#E53935",
  },
  timerText: {
    fontSize: 20,
    marginBottom: 10,
  },
  recordingLoader: {
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  titleInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
});

export default RecordsScreen;
