// src/components/VoiceNoteItem.tsx
import React from 'react';
import { View, Text, Button } from 'react-native';
import { VoiceNote } from '../types';

interface Props {
  voiceNote: VoiceNote;
  onPlay: (uri: string) => void;
  onDelete: (id: string) => void;
}

const VoiceNoteItem: React.FC<Props> = ({ voiceNote, onPlay, onDelete }) => (
  <View>
    <Text>{voiceNote.date}</Text>
    <Button title="Play" onPress={() => onPlay(voiceNote.uri)} />
    <Button title="Delete" onPress={() => onDelete(voiceNote.id)} />
  </View>
);

export default VoiceNoteItem;
