// src/types/index.ts

export type AgentResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Prayer Times Types
export type PrayerTimes = {
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  [key: string]: string; // Index signature for flexible access
};

// Cooking Types
export type Recipe = {
  id: string;
  name: string;
  image?: string; // URL or placeholder
  prepTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: string[];
  steps: string[];
  tags: string[];
};

// Shopping Types
export type ShoppingItem = {
  id: string;
  name: string;
  category: 'Supermarket' | 'Market' | 'Vegetables' | 'Meat' | 'Spices' | 'Cleaning' | 'Other';
  isBought: boolean;
  storeLocation?: string; // Optional geolocation mock
};

// Task/Productivity Types
export type TaskPriority = 'Urgent' | 'Important' | 'Optional';
export type TaskCategory = 'Home' | 'Work' | 'Study' | 'Worship' | 'Health';

export type Task = {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO Date
  time?: string;
  isCompleted: boolean;
  priority: TaskPriority;
  category: TaskCategory;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
};
