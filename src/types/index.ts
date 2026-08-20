export interface User {
  id: number;
  email: string;
  nickname: string;
  avatar: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  experience: number;
  learningPrefs: {
    language: string;
    dailyGoal: number;
  };
  streakDays: number;
  totalStudyTime: number;
  completedCourses: number;
  masteredWords: number;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  language: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  coverImage: string;
  duration: number;
  rating: number;
  progress: number;
  chapters: Chapter[];
}

export interface Chapter {
  id: number;
  courseId: number;
  title: string;
  order: number;
  content: string;
  completed: boolean;
}

export interface Word {
  id: number;
  language: string;
  word: string;
  meaning: string;
  pronunciation: string;
  example: string;
  level: string;
  mastered: boolean;
  lastReviewed?: string;
}

export interface GrammarQuestion {
  id: number;
  language: string;
  level: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface SpeakingExercise {
  id: number;
  language: string;
  level: string;
  text: string;
  audioUrl?: string;
}

export interface ListeningMaterial {
  id: number;
  language: string;
  level: string;
  title: string;
  audioUrl?: string;
  transcript: string;
  questions: ListeningQuestion[];
}

export interface ListeningQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Progress {
  userId: number;
  courseId?: number;
  wordId?: number;
  chapterId?: number;
  type: 'course' | 'word' | 'chapter';
  correctCount: number;
  totalCount: number;
  lastStudied?: string;
}

export interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Post {
  id: number;
  userId: number;
  nickname: string;
  avatar: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  liked: boolean;
  comments: Comment[];
  createdAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  nickname: string;
  avatar: string;
  content: string;
  createdAt: string;
}

export interface Checkin {
  id: number;
  userId: number;
  nickname: string;
  avatar: string;
  content: string;
  createdAt: string;
  streak: number;
}

export interface StudyStats {
  todayStudyTime: number;
  weeklyStudyTime: number;
  monthlyStudyTime: number;
  totalWordsLearned: number;
  totalCoursesCompleted: number;
  streakDays: number;
}

export type LearningModuleType = 'words' | 'grammar' | 'speaking' | 'listening';
