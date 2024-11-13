// src/components/AudioRecorder.tsx
import React, { useState } from 'react';
import { Button } from 'react-native';
import { Audio } from 'expo-av';
import { startRecording, stopRecording } from '../services/audioService';

const AudioRecorder: React.FC<{ onSave: (uri: string) => void }> = ({ onSave }) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const handleStartRecording = async () => {
    const newRecording = await startRecording();
    setRecording(newRecording);
  };

  const handleStopRecording = async () => {
    if (recording) {
      const voiceNote = await stopRecording(recording);
      onSave(voiceNote.uri);
      setRecording(null);
    }
  };

  return (
    <>
      <Button title="Start Recording" onPress={handleStartRecording} />
      <Button title="Stop Recording" onPress={handleStopRecording} />
    </>
  );
};

export default AudioRecorder;
