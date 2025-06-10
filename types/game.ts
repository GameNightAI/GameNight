export interface Game {
  id: number;
  name: string;
  yearPublished: number | null;
  thumbnail: string;
  image: string;
  minplayers: number;
  maxplayers: number;
  playingTime: number;
  minplaytime: number;
  maxplaytime: number;
  description: string;
}
