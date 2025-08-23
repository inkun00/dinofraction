import type { User } from 'firebase/auth';
import React from 'react';

export type Fraction = {
  whole: number;
  numerator: number;
  denominator: number;
};

export type ProblemType = '진분수+진분수' | '진분수+진분수_합1초과' | '진분수-진분수' | '대분수-대분수' | '1-진분수' | '자연수-진분수' | '대분수-대분수(받아내림)';

export type ProblemPart = 
    | { type: 'fraction'; value: Fraction }
    | { type: 'operator'; value: string };

export type Problem = {
  type: ProblemType;
  parts: ProblemPart[];
  answer: Fraction;
};

export type Answer = {
  value: Fraction;
  isCorrect: boolean;
};

export type CurrentProblem = {
  id: number;
  problem: Problem;
  answers: Answer[];
  answered: boolean;
};

export type ProblemStats = {
  correct: Problem[];
  wrong: Problem[];
  totalProblems: number;
  correctProblemTypes: Record<string, number>;
  wrongProblemTypes: Record<string, number>;
};

export type UserData = {
  score: number;
  totalXp: number;
  level: number;
  school?: string;
  nickname?: string;
  correctProblemTypes: Record<string, number>;
  wrongProblemTypes: Record<string, number>;
};

export type LeaderboardEntry = {
  school?: string;
  nickname: string;
  score?: number;
  totalXp?: number;
};

export type SchoolLeaderboardEntry = {
  school: string;
  totalXp: number;
};

export type AppState = 'loading' | 'start' | 'signup' | 'profile' | 'playing' | 'gameover' | 'analysis' | 'leaderboard' | 'levelup';

export type GameState = {
  score: number;
  lives: number;
  time: number;
  running: boolean;
  started: boolean;
};

export type EvolutionStage = 'egg' | 'baby' | 'medium' | 'adult' | 'boss';

export type SpeedLevel = 0 | 1 | 2 | 3 | 4 | 5;
