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

// Option interface matching database schema
export interface Option {
  id: number;
  room_id: number;
  participant_id: number;
  text: string;
  is_vetoed: boolean;
  vetoed_by_id: number | null;
  created_at: Date;
}

// Combined room state returned by API
export interface RoomState {
  room: Room;
  participants: Participant[];
  options: Option[];
}
