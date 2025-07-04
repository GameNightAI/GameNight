export interface Game {
  id: number;
  name: string;
  yearPublished: number | null;
  thumbnail: string;
  image: string;
  min_players: number;
  max_players: number;
  playing_time: number;
  minPlaytime: number;
  maxPlaytime: number;
  description: string;
  minAge: number;
  is_cooperative: Boolean;
  complexity: number;
  complexity_tier: number;
  complexity_desc: string;
}
