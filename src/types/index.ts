// src/types/index.ts
export interface VoiceNote {
    id: string;
    uri: string;
    date: string;
  }
  
  export interface RecordingStatus {
    isRecording: boolean;
    isPlaying: boolean;
  }
  