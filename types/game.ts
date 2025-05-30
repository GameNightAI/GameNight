export interface Game {
  id: number;
  name: string;
  yearPublished: number | null;
  thumbnail: string;
  image: string;
  minPlayers: number;
  maxPlayers: number;
  playingTime: number;
  description: string;
}