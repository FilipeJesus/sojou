export type Category = "food" | "culture" | "nature" | "night" | "shopping";

export type Activity = {
  id: string;
  name: string;
  place?: string;
  photoUrls: string[];
  category: Category;
  tags: string[];
  durationMins: number;
  priceTier: 0 | 1 | 2 | 3;
  neighborhood: string;
  lat: number;
  lng: number;
  openWindows?: Array<"morning" | "afternoon" | "evening">;
  mustBook?: boolean;
  popularity?: number; // 0..100
};
