export interface Poll {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  created_at: string;
  expires_at?: string;
  max_votes: number;
}

export interface PollGame {
  id: string;
  poll_id: string;
  game_id: number;  // Changed from string to number to match BGG game IDs
  created_at: string;
}

export interface Vote {
  id: string;
  poll_id: string;
  game_id: number;
  voter_name?: string;
  vote_type: number;
  created_at: string;
}

export interface PollEvent {
  id: string;
  poll_id: string;
  location?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  created_at: string;
}

export interface VoteEvent {
  id: string;
  poll_event_id: string;
  voter_name: string;
  vote_type: number; // int2 in database
  created_at: string; // TIMESTAMPTZ type in database
}