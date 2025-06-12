export interface Game {
  id: number;
  name: string;
  yearPublished: number | null;
  thumbnail: string;
  image: string;
  min_players: number;
  max_players: number;
  playingTime: number;
  minPlaytime: number;
  maxPlaytime: number;
  description: string;
  minAge: number;
  isCooperative: string;
  complexity: number;
}
