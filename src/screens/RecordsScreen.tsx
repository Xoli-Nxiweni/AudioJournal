import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { VoiceNote } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import VoiceNoteModal from "./VoiceNoteModal";

const RecordsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<VoiceNote | null>(null);

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

  const formatTime = (time: number) => {
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
      setNewNoteText("");
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
      setRecording(null);
      setTimer(0);
    } catch (error) {
      console.error("Failed to stop recording", error);
      Alert.alert("Error", "Failed to stop recording.");
    }
  };

  const openModal = (note: VoiceNote) => {
    setSelectedNote(note);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedNote(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <Text style={{ color: colors.text }}>Loading...</Text>
      ) : voiceNotes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No recordings yet.
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleStartRecording}
          >
            <Text style={styles.addButtonText}>Click here to add one</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={voiceNotes}
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
          keyExtractor={(item) => item.id}
        />
      )}

      <View style={styles.recordControls}>
        {recording && (
          <>
            <Text style={styles.timerText}>{formatTime(timer)}</Text>
            <TextInput
              value={newNoteText}
              onChangeText={setNewNoteText}
              style={styles.input}
              placeholder="Title of the audio!"
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

      <VoiceNoteModal
        visible={isModalVisible}
        onClose={closeModal}
        noteText={selectedNote ? selectedNote.text : ""}
        onNoteTextChange={(text) =>
          setSelectedNote((prev) => prev && { ...prev, text })
        }
        onUpdateNote={() => {
          // handle update logic here if needed
          closeModal();
        }}
        onDeleteNote={() => {
          // handle delete logic here if needed
          closeModal();
        }}
        onPlayNote={() => {
          // handle play logic if needed
        }}
        onPauseNote={() => {
          // handle pause logic if needed
        }}
        playing={false} // Set to true or false based on playback state
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: "#6200ea",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    padding: 10,
  },
  noteText: { flex: 1, fontSize: 18 },
  timerText: {
    fontSize: 18,
    color: "black",
    marginBottom: 10,
    textAlign: "center",
  },
  input: {
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 15,
    borderRadius: 50,
    borderColor: "black",
    borderWidth: 2,
  },
  recordControls: {
    flexDirection: "column",
    justifyContent: "center",
    marginBottom: 20,
  },
  recordButton: {
    padding: 20,
    backgroundColor: "#000",
    borderRadius: 50,
    marginHorizontal: 175,
  },
  stopButton: {
    padding: 20,
    backgroundColor: "#000",
    borderRadius: 50,
    marginHorizontal: 175,
  },
});

export default RecordsScreen;
