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
  game_id: string;
  created_at: string;
}

export interface Vote {
  id: string;
  poll_id: string;
  game_id: number;
  voter_name?: string;
  created_at: string;
}