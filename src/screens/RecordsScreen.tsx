import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import VoiceNoteModal from "./VoiceNoteModal";
import { VoiceNote } from "../types";

const RecordsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (recording) {
      interval = setInterval(() => setTimer((prev) => prev + 1), 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => interval && clearInterval(interval);
  }, [recording]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const storedNotes = await AsyncStorage.getItem("voiceNotes");
      if (storedNotes) setVoiceNotes(JSON.parse(storedNotes));
    } catch (error) {
      console.error("Failed to load notes", error);
      Alert.alert("Error", "Unable to load notes.");
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async (notes: VoiceNote[]) => {
    try {
      await AsyncStorage.setItem("voiceNotes", JSON.stringify(notes));
    } catch (error) {
      console.error("Failed to save notes", error);
      Alert.alert("Error", "Unable to save notes.");
    }
  };

  const handleStartRecording = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Microphone access is required to record audio."
      );
      return;
    }
    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (error) {
      console.error("Failed to start recording", error);
      Alert.alert("Error", "Unable to start recording.");
    }
  };

  const handleStopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const newNote: VoiceNote = {
        id: Date.now().toString(),
        text: "Untitled Note",
        uri,
      };
      const updatedNotes = [...voiceNotes, newNote];
      setVoiceNotes(updatedNotes);
      saveNotes(updatedNotes);
      setRecording(null);
      setTimer(0);
    } catch (error) {
      console.error("Failed to stop recording", error);
      Alert.alert("Error", "Unable to stop recording.");
    }
  };

  const openModal = (note: VoiceNote) => {
    setSelectedNote(note);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setSelectedNote(null);
    setIsModalVisible(false);
  };

  const filteredNotes = voiceNotes.filter((note) =>
    note.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card }]}
          placeholder="Search notes..."
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Ionicons name="search" size={24} color={colors.text} />
      </View>

      {/* Voice Notes List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : filteredNotes.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No recordings found.
        </Text>
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.noteContainer, { backgroundColor: colors.card }]}
              onPress={() => openModal(item)}
            >
              <Text style={[styles.noteText, { color: colors.text }]}>
                {item.text}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Recording Controls */}
      <View style={styles.recordControls}>
        {recording && (
          <Text style={[styles.timerText, { color: colors.text }]}>
            {`${Math.floor(timer / 60)
              .toString()
              .padStart(2, "0")}:${(timer % 60).toString().padStart(2, "0")}`}
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.recordButton,
            { backgroundColor: recording ? "#E53935" : "#4CAF50" },
          ]}
          onPress={recording ? handleStopRecording : handleStartRecording}
        >
          <Ionicons
            name={recording ? "square" : "mic"}
            size={24}
            color="#FFF"
          />
        </TouchableOpacity>
      </View>

      {/* Modal */}
      {selectedNote && (
        <VoiceNoteModal
          visible={isModalVisible}
          onClose={closeModal}
          noteText={selectedNote.text}
          onNoteTextChange={(text) =>
            setSelectedNote((prev) => (prev ? { ...prev, text } : null))
          }
          onUpdateNote={() => {
            const updatedNotes = voiceNotes.map((note) =>
              note.id === selectedNote.id
                ? { ...note, text: selectedNote.text }
                : note
            );
            setVoiceNotes(updatedNotes);
            saveNotes(updatedNotes);
            closeModal();
          }}
          onDeleteNote={() => {
            const updatedNotes = voiceNotes.filter(
              (note) => note.id !== selectedNote.id
            );
            setVoiceNotes(updatedNotes);
            saveNotes(updatedNotes);
            closeModal();
          }}
          onPlayNote={() => console.log("Play audio")}
          onPauseNote={() => console.log("Pause audio")}
          playing={false}
          colors={colors}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  searchContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  searchInput: { flex: 1, padding: 10, borderRadius: 8, marginRight: 10 },
  noteContainer: { padding: 15, borderRadius: 8, marginBottom: 10 },
  noteText: { fontSize: 16 },
  emptyText: { textAlign: "center", marginTop: 20, fontSize: 18 },
  recordControls: { alignItems: "center", marginTop: 20 },
  recordButton: {
    padding: 15,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: { fontSize: 16, marginBottom: 10 },
});

export default RecordsScreen;
