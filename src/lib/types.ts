import type { User } from 'firebase/auth';
import React from 'react';

export type Fraction = {
  whole: number;
  numerator: number;
  denominator: number;
};

export type ProblemType = '진분수+진분수' | '진분수+진분수_합1초과' | '진분수-진분수' | '대분수-대분수' | '1-진분수' | '자연수-진분수' | '대분수-대분수(받아내림)' | '대분수+대분수' | '자연수-대분수';

export type ProblemPart = 
    | { type: 'fraction'; value: Fraction }
    | { type: 'operator'; value: string };

export type Problem = {
  type: ProblemType;
  parts: ProblemPart[];
  answer: Fraction;
  difficulty: number;
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
  animationDuration: number;
};

export type MysteryBoxItem = {
  id: number;
  collected: boolean;
  animationDuration: number;
  top: number;
};

export type ProblemStats = {
  correct: Problem[];
  wrong: Problem[];
  totalProblems: number;
  correctProblemTypes: Record<string, number>;
  wrongProblemTypes: Record<string, number>;
};

export type DinoEffectType = 'TIME' | 'SCORE' | 'LIFE' | 'JUMP' | 'XP';

export type DinoSpecialEffect = {
  type: DinoEffectType;
  value: number;
};

export type CollectedDinosaur = {
  id: string;
  imageUrl: string;
  name: string;
  effects: DinoSpecialEffect[];
  isRare: boolean;
};

export type UserData = {
  score: number;
  totalXp: number;
  level: number;
  school?: string;
  nickname?: string;
  correctProblemTypes: Record<string, number>;
  wrongProblemTypes: Record<string, number>;
  wrongProblems?: Problem[];
  collectedDinosaurs?: CollectedDinosaur[];
  equippedDinosaurId?: string | null;
};

export type LeaderboardEntry = {
  nickname: string;
  school?: string;
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

export type EvolutionStage = 'egg' | 'baby' | 'medium' | 'adult' | 'boss' | 'god';

export type LeaderboardType = 'score' | 'xp' | 'school-total-xp' | 'school-personal-by-school';

export type EffectMessage = {
  id: number;
  text: string;
  type: 'score-plus' | 'score-minus' | 'life-plus' | 'life-minus';
  x: number;
  y: number;
};
