// Core types for SpinDecide application

// Category type for room types
export type Category = 'eat' | 'watch' | 'do';

// Room interface matching database schema
export interface Room {
  id: number;
  code: string;
  category: Category;
  status: 'gathering' | 'voting' | 'decided';
  winner_option_id: number | null;
  created_at: Date;
}

// Participant interface matching database schema
export interface Participant {
  id: number;
  room_id: number;
  name: string;
  is_host: boolean;
  has_vetoed: boolean;
  created_at: Date;
}

// AI metadata attached to AI-generated options
export interface AiMetadata {
  reasoning: string;
  confidence: number;
}

// Quiz responses keyed by question identifier (supports multi-select)
export type QuizResponses = { [key: string]: string | string[] };

// A single AI suggestion returned by the Claude API
export interface AiSuggestion {
  text: string;
  reasoning: string;
  confidence: number;
}

// Option interface matching database schema
export interface Option {
  id: number;
  room_id: number;
  participant_id: number;
  text: string;
  is_vetoed: boolean;
  vetoed_by_id: number | null;
  source: 'user' | 'ai';
  ai_metadata: AiMetadata | null;
  created_at: Date;
}

// Combined room state returned by API
export interface RoomState {
  room: Room;
  participants: Participant[];
  options: Option[];
}
