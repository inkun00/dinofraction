
"use client";

import * as React from 'react';
import { GameState, Problem, UserData, ProblemStats, CurrentProblem, AppState, EvolutionStage, ProblemType, MysteryBoxItem, EffectMessage, CollectedDinosaur, DinoSpecialEffect, DinoEffectType } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { loadUserData as loadDBUserData, saveUserData as saveDBUserData, getLeaderboardFromFirestore } from '@/lib/firestore-helpers';
import { generateProblem as generateProblemUtil, calculateLevel, firebaseErrorKorean, PROBLEM_DIFFICULTY } from '@/lib/game-logic';
import { login, signUp, logout } from '@/lib/auth-helpers';

import AnimatedBackground from '@/components/game-ui/AnimatedBackground';
import Dinosaur from '@/components/game-ui/Dinosaur';
import GameHUD from '@/components/game-ui/GameHUD';
import ProblemContainer from '@/components/game-ui/ProblemContainer';
import StartScreen from '@/components/game-ui/screens/StartScreen';
import SignUpModal from '@/components/game-ui/screens/SignUpModal';
import ProfileScreen from '@/components/game-ui/screens/ProfileScreen';
import GameOverScreen from '@/components/game-ui/screens/GameOverScreen';
import AnalysisScreen from '@/components/game-ui/screens/AnalysisScreen';
import LeaderboardScreen from '@/components/game-ui/screens/LeaderboardScreen';
import LevelUpModal from '@/components/game-ui/screens/LevelUpModal';
import WrongProblemsModal from '@/components/game-ui/screens/WrongProblemsModal';
import CollectionScreen from '@/components/game-ui/screens/CollectionScreen';

const JUMP_VELOCITY = 22;
const GRAVITY = -0.8;
const GROUND_POSITION = 105;
const PROBLEM_GENERATION_INTERVAL = 450; // frames, 60fps -> ~7.5s
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const INITIAL_ANIMATION_DURATION = 10.5; // seconds (comfortable slow movement for reading)
const GAME_DURATION_SECONDS = 300; // 5 minutes

const GOD_DINO_IMAGES = [
    'https://i.postimg.cc/13xsxBRQ/dino-1.png',
    'https://i.postimg.cc/bwQ8qnd2/dino-2.png',
    'https://i.postimg.cc/9MfjPNbG/dino-3.png',
    'https://i.postimg.cc/Xv4Wqvy1/dino-4.png',
    'https://i.postimg.cc/W48vkPGN/dino-5.png',
    'https://i.postimg.cc/76QrKMtj/dino-6.png',
    'https://i.postimg.cc/XqGSmGTq/dino-7.png',
    'https://i.postimg.cc/Y05KH2H3/dino-8.png',
    'https://i.postimg.cc/xdYMNTHQ/dino-9.png',
    'https://i.postimg.cc/j5SfvgZk/dino-10.png',
    'https://i.postimg.cc/FKZcy5gL/dino-11.png',
    'https://i.postimg.cc/RFpHY7YC/dino-12.png',
    'https://i.postimg.cc/7hC2rCv3/dino-13.png',
    'https://i.postimg.cc/Zn1ybTZ1/dino-14.png',
    'https://i.postimg.cc/yxB0mMVX/dino-15.png',
    'https://i.postimg.cc/3rCX8xBL/dino-16.png',
    'https://i.postimg.cc/GhLkHngb/dino-17.png',
    'https://i.postimg.cc/wTwDN4nL/dino-18.png',
    'https://i.postimg.cc/8cHMtZc8/dino-19.png',
    'https://i.postimg.cc/nhMBGYt5/dino-20.png',
    'https://i.postimg.cc/Z5g37Bbq/dino-21.png',
];

const DINO_NAMES = [
    '용용이', '쿠키', '털뭉치', '숑숑이', '바둑이', '치치', '렉시', '스파키', '블루', '딩키',
    '콩이', '알콩이', '달콩이', '밤톨이', '도토리', '코코', '모찌', '초코', '망고', '복숭이',
    '솜이', '뭉치', '꼬미', '또또', '뽀뽀', '아기공룡', '디노', '토리', '보니', '핑키',
    '그린', '럭키', '해피', '핑구', '또리', '방울이', '동글이', '뿡뿡이', '삐약이', '꼬물이',
    '꼬맹이', '딩동이', '깜찍이', '똘똘이', '씩씩이', '총총이', '알록이', '달록이', '슈슈', '로로',
    '미니', '티티', '포포', '두두', '라라', '키키', '쥬쥬', '부부', '노노', '고고',
    '뭉게', '구름이', '별똥이', '햇살이', '보석이', '미소', '사랑이', '희망이', '꿈이', '슬기',
    '지혜', '용기', '보람이', '푸름이', '초롱이', '방글이', '생글이', '싱글이', '벙글이', '빙그레',
    '도담이', '토담이', '알콩', '달콩', '새싹이', '나무', '풀잎이', '이슬이', '샘물이', '바다',
    '하늘이', '우주', '행성이', '혜성이', '반짝이', '꼬꼬', '야옹이', '멍멍이', '음메', '어흥이'
];

const PREDEFINED_EFFECTS: { effects: DinoSpecialEffect[], isRare: boolean }[] = [
  // 일반 효과 (95개)
  { effects: [{ type: 'TIME', value: 25 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 3 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 8 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.3 }], isRare: false },
  { effects: [{ type: 'TIME', value: 15 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 5 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 6 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.1 }], isRare: false },
  { effects: [{ type: 'LIFE', value: 1 }], isRare: false },
  { effects: [{ type: 'TIME', value: 18 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 2 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 10 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.5 }], isRare: false },
  { effects: [{ type: 'TIME', value: 28 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 4 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 5 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.2 }], isRare: false },
  { effects: [{ type: 'TIME', value: 12 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 1 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 9 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.4 }], isRare: false },
  { effects: [{ type: 'TIME', value: 22 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 3 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 7 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.3 }], isRare: false },
  { effects: [{ type: 'TIME', value: 11 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 5 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 5 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.1 }], isRare: false },
  { effects: [{ type: 'LIFE', value: 1 }], isRare: false },
  { effects: [{ type: 'TIME', value: 29 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 1 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 10 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.5 }], isRare: false },
  { effects: [{ type: 'TIME', value: 14 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 4 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 6 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.2 }], isRare: false },
  { effects: [{ type: 'TIME', value: 21 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 2 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 8 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.4 }], isRare: false },
  { effects: [{ type: 'TIME', value: 17 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 3 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 9 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.3 }], isRare: false },
  { effects: [{ type: 'TIME', value: 26 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 5 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 7 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.1 }], isRare: false },
  { effects: [{ type: 'LIFE', value: 1 }], isRare: false },
  { effects: [{ type: 'TIME', value: 19 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 1 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 5 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.5 }], isRare: false },
  { effects: [{ type: 'TIME', value: 10 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 4 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 6 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.2 }], isRare: false },
  { effects: [{ type: 'TIME', value: 23 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 2 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 8 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.4 }], isRare: false },
  { effects: [{ type: 'TIME', value: 16 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 3 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 10 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.3 }], isRare: false },
  { effects: [{ type: 'TIME', value: 27 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 5 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 7 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.1 }], isRare: false },
  { effects: [{ type: 'LIFE', value: 1 }], isRare: false },
  { effects: [{ type: 'TIME', value: 20 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 1 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 9 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.5 }], isRare: false },
  { effects: [{ type: 'TIME', value: 13 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 4 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 5 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.2 }], isRare: false },
  { effects: [{ type: 'TIME', value: 24 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 2 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 6 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.4 }], isRare: false },
  { effects: [{ type: 'TIME', value: 30 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 3 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 8 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.3 }], isRare: false },
  { effects: [{ type: 'TIME', value: 18 }], isRare: false },
  { effects: [{ type: 'SCORE', value: 4 }], isRare: false },
  { effects: [{ type: 'JUMP', value: 9 }], isRare: false },
  { effects: [{ type: 'XP', value: 0.2 }], isRare: false },
  { effects: [{ type: 'LIFE', value: 1 }], isRare: false },
  { effects: [{ type: 'TIME', value: 26 }], isRare: false },

  // 희귀 효과 (5개)
  { effects: [{ type: 'TIME', value: 20 }, { type: 'SCORE', value: 5 }], isRare: true },
  { effects: [{ type: 'LIFE', value: 1 }, { type: 'XP', value: 0.5 }], isRare: true },
  { effects: [{ type: 'JUMP', value: 10 }, { type: 'SCORE', value: 3 }], isRare: true },
  { effects: [{ type: 'TIME', value: 15 }, { type: 'XP', value: 0.4 }], isRare: true },
  { effects: [{ type: 'SCORE', value: 2 }, { type: 'JUMP', value: 7 }], isRare: true },
];

interface EffectMessagesProps {
  messages: EffectMessage[];
}

const EffectMessages: React.FC<EffectMessagesProps> = ({ messages }) => {
  return (
    <div className="effect-message-container">
      {messages.map((msg) => (
        <div 
          key={msg.id} 
          className={`effect-message ${msg.type}`}
          style={{ top: msg.y, left: msg.x }}
        >
          {msg.text}
        </div>
      ))}
    </div>
  );
};


export default function Home() {
  const [appState, setAppState] = React.useState<AppState>('loading');
  const [gameState, setGameState] = React.useState<GameState>({
    score: 0,
    lives: 5,
    time: GAME_DURATION_SECONDS,
    running: false,
    started: false,
  });
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [userData, setUserData] = React.useState<UserData>({ score: 0, totalXp: 0, level: 1, correctProblemTypes: {}, wrongProblemTypes: {}, wrongProblems: [], collectedDinosaurs: [], equippedDinosaurId: null });
  const [problemStats, setProblemStats] = React.useState<ProblemStats>({ correct: [], wrong: [], totalProblems: 0, correctProblemTypes: {}, wrongProblemTypes: {} });
  const [currentProblems, setCurrentProblems] = React.useState<CurrentProblem[]>([]);
  const [mysteryBoxes, setMysteryBoxes] = React.useState<MysteryBoxItem[]>([]);
  
  const [dinoEvolution, setDinoEvolution] = React.useState<EvolutionStage>('egg');
  const [dinoIsEvolving, setDinoIsEvolving] = React.useState(false);
  const [isAttacking, setIsAttacking] = React.useState(false);
  const [earnedXp, setEarnedXp] = React.useState(0);
  const [godDinoImage, setGodDinoImage] = React.useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalProblemType, setModalProblemType] = React.useState<ProblemType | null>(null);
  const [effectMessages, setEffectMessages] = React.useState<EffectMessage[]>([]);
  const [showCollection, setShowCollection] = React.useState(false);

  const gameTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const usedProblemsRef = React.useRef<Set<string>>(new Set());
  const problemCounterRef = React.useRef(0);
  const mysteryBoxCounterRef = React.useRef(0);
  const effectMessageCounterRef = React.useRef(0);
  const dinosaurRef = React.useRef<HTMLDivElement>(null);
  const animationFrameRef = React.useRef<number>();
  const frameCountRef = React.useRef(0);
  const gameContainerRef = React.useRef<HTMLDivElement>(null);
  const answeredProblemsRef = React.useRef<Set<number>>(new Set());
  const collectedMysteryBoxesRef = React.useRef<Set<number>>(new Set());
  const nextMysteryBoxFrame = React.useRef(0);
  const endTimeRef = React.useRef<number>(0);
  const equippedDinoRef = React.useRef<CollectedDinosaur | null>(null);

  // Use refs for physics to avoid re-renders
  const dinoPhysicsRef = React.useRef({
    y: GROUND_POSITION,
    yVelocity: 0,
    isJumping: false,
  });

  const addEffectMessage = (text: string, type: EffectMessage['type'], x: number, y: number) => {
    const id = effectMessageCounterRef.current++;
    setEffectMessages(prev => [...prev, { id, text, type, x, y }]);
    setTimeout(() => {
      setEffectMessages(prev => prev.filter(msg => msg.id !== id));
    }, 2000);
  };

  React.useEffect(() => {
    const resizeGame = () => {
      if (!gameContainerRef.current) return;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const scaleX = screenWidth / GAME_WIDTH;
      const scaleY = screenHeight / GAME_HEIGHT;
      const scale = Math.min(scaleX, scaleY);
      gameContainerRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };

    window.addEventListener('resize', resizeGame);
    resizeGame(); // Initial resize

    return () => {
      window.removeEventListener('resize', resizeGame);
    };
  }, []);

  const endGame = React.useCallback(() => {
      if (!gameState.running) return;

      setGameState(prev => ({...prev, running: false, started: false}));

      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      answeredProblemsRef.current.clear();
      collectedMysteryBoxesRef.current.clear();

      const finalScore = gameState.score;
      const oldLevel = userData.level;
      
      const newTotalXp = userData.totalXp + earnedXp;
      const newLevel = calculateLevel(newTotalXp);

      const finalUserData: UserData = {
          ...userData,
          score: Math.max(userData.score, finalScore),
          totalXp: newTotalXp,
          level: newLevel,
          correctProblemTypes: { ...userData.correctProblemTypes },
          wrongProblemTypes: { ...userData.wrongProblemTypes },
          wrongProblems: [...(userData.wrongProblems || []), ...problemStats.wrong],
          collectedDinosaurs: [...(userData.collectedDinosaurs || [])],
          equippedDinosaurId: userData.equippedDinosaurId,
      };

      if (finalScore >= 500 && godDinoImage) {
        const isRareDinoTime = Math.random() < 0.05;
        let availableEffects;

        if (isRareDinoTime) {
            availableEffects = PREDEFINED_EFFECTS.filter(e => e.isRare);
        } else {
            availableEffects = PREDEFINED_EFFECTS.filter(e => !e.isRare);
        }
        
        const selectedEffect = availableEffects[Math.floor(Math.random() * availableEffects.length)];

        const newDinosaur: CollectedDinosaur = {
            id: `${Date.now()}-${godDinoImage}`,
            imageUrl: godDinoImage,
            name: DINO_NAMES[Math.floor(Math.random() * DINO_NAMES.length)],
            effects: selectedEffect.effects,
            isRare: selectedEffect.isRare,
        };

        finalUserData.collectedDinosaurs?.push(newDinosaur);
      }

      for (const type in problemStats.correctProblemTypes) {
          finalUserData.correctProblemTypes[type] = (finalUserData.correctProblemTypes[type] || 0) + problemStats.correctProblemTypes[type];
      }
      for (const type in problemStats.wrongProblemTypes) {
          finalUserData.wrongProblemTypes[type] = (finalUserData.wrongProblemTypes[type] || 0) + problemStats.wrongProblemTypes[type];
      }
      
      setUserData(finalUserData);
      if(currentUser) {
        saveDBUserData(currentUser.uid, finalUserData);
      }

      if (newLevel > oldLevel) {
          setAppState('levelup');
      } else {
          setAppState('gameover');
      }
  }, [userData, problemStats, currentUser, gameState.score, earnedXp, gameState.running, godDinoImage]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const data = await loadDBUserData(user.uid);
        setUserData(data);
        if (data.nickname) { 
            if (appState === 'loading' || appState === 'signup') {
              setAppState('start');
            }
        } else {
            setTimeout(async () => {
                const freshData = await loadDBUserData(user.uid);
                if (freshData.nickname) {
                    setUserData(freshData);
                    if (appState === 'loading' || appState === 'signup') {
                        setAppState('start');
                    }
                }
            }, 1000);
        }
      } else {
        setCurrentUser(null);
        setUserData({ score: 0, totalXp: 0, level: 1, correctProblemTypes: {}, wrongProblemTypes: {}, wrongProblems: [], collectedDinosaurs: [], equippedDinosaurId: null });
        if (appState !== 'signup') {
            setAppState('start');
        }
      }
    });
    return () => unsubscribe();
  }, [appState]);

  
  const updateDinosaurEvolution = React.useCallback((currentScore: number) => {
    let newStage: EvolutionStage;
    if (currentScore >= 500) newStage = 'god';
    else if (currentScore >= 400) newStage = 'boss';
    else if (currentScore >= 300) newStage = 'adult';
    else if (currentScore >= 200) newStage = 'medium';
    else if (currentScore >= 100) newStage = 'baby';
    else newStage = 'egg';

    setDinoEvolution(prev => {
        if (newStage !== prev) {
            setDinoIsEvolving(true);
            setTimeout(() => setDinoIsEvolving(false), newStage === 'god' ? 1500 : 1000);
            return newStage;
        }
        return prev;
    });
  }, []);
  
  React.useEffect(() => {
    if (dinoEvolution === 'god' && dinoIsEvolving) {
        const randomImage = GOD_DINO_IMAGES[Math.floor(Math.random() * GOD_DINO_IMAGES.length)];
        setGodDinoImage(randomImage);
    }
  }, [dinoEvolution, dinoIsEvolving]);


  const comboRef = React.useRef(0);

  const getComboBonusInfo = (currentCombo: number) => {
    if (currentCombo < 2) return { bonus: 0, title: '' };
    if (currentCombo < 5) {
      return { bonus: Math.floor(currentCombo * 2.5), title: `✨ COMBO x${currentCombo}` };
    } else if (currentCombo < 8) {
      return { bonus: 12 + currentCombo * 6, title: `🔥 GREAT COMBO x${currentCombo}!` };
    } else if (currentCombo < 11) {
      return { bonus: 40 + currentCombo * 11, title: `⚡ MEGA COMBO x${currentCombo}!!` };
    } else if (currentCombo < 15) {
      return { bonus: 90 + currentCombo * 19, title: `🌟 ULTRA COMBO x${currentCombo}!!!` };
    } else {
      return { bonus: 175 + currentCombo * 32, title: `👑 GODLIKE COMBO x${currentCombo}!!!!` };
    }
  };

  const handleCorrectAnswer = React.useCallback((problem: Problem) => {
      let { score: scoreToAdd, xp: xpToAdd } = PROBLEM_DIFFICULTY[problem.difficulty] || { score: 10, xp: 2 };
      
      const scoreBonusEffect = equippedDinoRef.current?.effects?.find(e => e.type === 'SCORE');
      if (scoreBonusEffect) {
        scoreToAdd += scoreBonusEffect.value;
      }

      const xpBonusEffect = equippedDinoRef.current?.effects?.find(e => e.type === 'XP');
      if (xpBonusEffect) {
        xpToAdd += xpBonusEffect.value;
      }

      comboRef.current += 1;
      const comboInfo = getComboBonusInfo(comboRef.current);
      scoreToAdd += comboInfo.bonus;

      setGameState(prev => {
        if (!prev.running) return prev;
        const newScore = prev.score + scoreToAdd;
        updateDinosaurEvolution(newScore);
        return { ...prev, score: newScore };
      });
      setEarnedXp(prev => prev + xpToAdd);
      setProblemStats(prev => {
          const newCorrect = [...prev.correct, problem];
          const newCorrectTypes = { ...prev.correctProblemTypes, [problem.type]: (prev.correctProblemTypes[problem.type] || 0) + 1 };
          return { ...prev, correct: newCorrect, correctProblemTypes: newCorrectTypes };
      });
  }, [updateDinosaurEvolution]);

  const handleWrongAnswer = React.useCallback((problem: Problem) => {
      comboRef.current = 0;
      setGameState(prev => {
          if (!prev.running) return prev;
          const newLives = prev.lives - 1;
          return { ...prev, lives: newLives };
      });
      setProblemStats(prevStats => {
          const newWrong = [...prevStats.wrong, problem];
          const newWrongTypes = { ...prevStats.wrongProblemTypes, [problem.type]: (prevStats.wrongProblemTypes[problem.type] || 0) + 1 };
          return {...prevStats, wrong: newWrong, wrongProblemTypes: newWrongTypes };
      });
  }, []);

  const handleMysteryBoxCollision = React.useCallback((x: number, y: number) => {
    const effects = ['life', 'score'];
    const randomEffectType = effects[Math.floor(Math.random() * effects.length)];
    
    setGameState(prev => {
      if (!prev.running) return prev;
      
      let newLives = prev.lives;
      let newScore = prev.score;
      let newTime = prev.time;

      switch(randomEffectType) {
        case 'life': {
            const isPositive = Math.random() > 0.5;
            if (isPositive) {
              newLives += 1;
              addEffectMessage('+1 생명', 'life-plus', x, y);
            } else {
              newLives -= 1;
              addEffectMessage('-1 생명', 'life-minus', x, y);
            }
            break;
        }
        case 'score': {
            const amount = (Math.floor(Math.random() * 6) + 1) * 20; // 20 to 120
            const isPositive = Math.random() > 0.5;
            if (isPositive) {
                newScore += amount;
                addEffectMessage(`+${amount} 점수`, 'score-plus', x, y);
            } else {
                newScore = Math.max(0, newScore - amount);
                addEffectMessage(`-${amount} 점수`, 'score-minus', x, y);
            }
            updateDinosaurEvolution(newScore);
            break;
        }
      }
      return {...prev, lives: newLives, score: newScore, time: newTime};
    });

  }, [updateDinosaurEvolution]);

  React.useEffect(() => {
      if (gameState.started && gameState.lives <= 0 && gameState.running) {
          endGame();
      }
  }, [gameState.lives, gameState.started, gameState.running, endGame]);

  const generateProblem = React.useCallback(() => {
    const problemScore = gameState.score;
    const newProblemData = generateProblemUtil(problemScore, usedProblemsRef.current);
    if (!newProblemData) {
      console.log("모든 문제를 다 풀었습니다!");
      return;
    }

    const { problem, answers, problemKey } = newProblemData;
    usedProblemsRef.current.add(problemKey);
    
    const problemId = problemCounterRef.current;
    
    const timeElapsedRatio = Math.min(1.0, Math.max(0, (GAME_DURATION_SECONDS - gameState.time) / GAME_DURATION_SECONDS));
    const animationDuration = Math.max(8.5, INITIAL_ANIMATION_DURATION - (timeElapsedRatio * 1.8) - Math.min(0.5, problemCounterRef.current * 0.01));
    problemCounterRef.current++;

    const newCurrentProblem: CurrentProblem = {
        id: problemId,
        problem,
        answers,
        answered: false,
        animationDuration,
    };

    setCurrentProblems(prevProbs => [...prevProbs, newCurrentProblem]);
    setProblemStats(prevStats => ({ ...prevStats, totalProblems: prevStats.totalProblems + 1 }));

    // Set a timeout to check if the problem was answered
    setTimeout(() => {
        if (!answeredProblemsRef.current.has(problemId)) {
            handleWrongAnswer(problem);
            answeredProblemsRef.current.add(problemId); // Mark as handled
        }
    }, animationDuration * 1000 + 1000); // Add a small buffer

  }, [gameState.score, gameState.time, handleWrongAnswer]);

  const getBubblePosition = React.useCallback((stage: EvolutionStage) => {
    const positions = { egg: 320, baby: 290, medium: 260, adult: 230, boss: 200, god: 200 };
    return positions[stage];
  }, []);

  const generateMysteryBox = React.useCallback(() => {
    const id = mysteryBoxCounterRef.current++;
    const timeElapsedRatio = Math.min(1.0, Math.max(0, (GAME_DURATION_SECONDS - gameState.time) / GAME_DURATION_SECONDS));
    const animationDuration = Math.max(8.5, INITIAL_ANIMATION_DURATION - (timeElapsedRatio * 1.8) - Math.min(0.5, problemCounterRef.current * 0.01));

    const top = getBubblePosition(dinoEvolution);

    const newBox: MysteryBoxItem = {
      id,
      collected: false,
      animationDuration,
      top,
    };
    setMysteryBoxes(prev => [...prev, newBox]);
  }, [dinoEvolution, getBubblePosition]);

  const gameLoop = React.useCallback(() => {
    if (!gameState.running) {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        return;
    }

    // Update time
    const remainingTime = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
    if (remainingTime !== gameState.time) {
        setGameState(prev => ({ ...prev, time: remainingTime }));
    }

    if (remainingTime <= 0) {
        endGame();
        return;
    }
    
    frameCountRef.current++;
    if (frameCountRef.current % PROBLEM_GENERATION_INTERVAL === 0) {
        generateProblem();
    }

    // Randomly generate mystery box
    if (frameCountRef.current >= nextMysteryBoxFrame.current) {
        generateMysteryBox();
        // Set next box frame to be between 30 to 40 seconds from now (1800 to 2400 frames)
        const nextInterval = 1800 + Math.random() * 600;
        nextMysteryBoxFrame.current = frameCountRef.current + nextInterval;
    }

    // Physics update (using ref, no re-render)
    let { y, yVelocity, isJumping } = dinoPhysicsRef.current;
    yVelocity += GRAVITY;
    y += yVelocity;
    
    if (y <= GROUND_POSITION) {
        y = GROUND_POSITION;
        yVelocity = 0;
        isJumping = false;
    }
    
    // DOM update (using ref, no re-render)
    if (dinosaurRef.current) {
      const dinoRect = dinosaurRef.current.getBoundingClientRect();
      
      // Answer bubble collision
      document.querySelectorAll('.answer-bubble').forEach(bubbleEl => {
          const bubble = bubbleEl as HTMLDivElement;
          const problemId = parseInt(bubble.dataset.problemId || '-1');
          
          if(problemId === -1 || answeredProblemsRef.current.has(problemId)) return;

          const bubbleRect = bubble.getBoundingClientRect();
          
          const isColliding = dinoRect.left < bubbleRect.right &&
                              dinoRect.right > bubbleRect.left &&
                              dinoRect.top < bubbleRect.bottom &&
                              dinoRect.bottom > bubbleRect.top;

          if (isColliding) {
              yVelocity = -10; // Bounce down
              y += yVelocity;
              
              answeredProblemsRef.current.add(problemId);
              const isCorrect = bubble.dataset.correct === 'true';
              const problem = currentProblems.find(p => p.id === problemId)?.problem;
              
              if(problem) {
                if (isCorrect) {
                    handleCorrectAnswer(problem);
                    bubble.style.background = '#2ecc71';
                } else {
                    handleWrongAnswer(problem);
                    bubble.style.background = '#e74c3c';
                }
              }
              bubble.classList.remove('bouncing');
              void bubble.offsetWidth;
              bubble.classList.add('bouncing');
          }
      });

      // Mystery box collision
      document.querySelectorAll('.mystery-box').forEach(boxEl => {
          const box = boxEl as HTMLDivElement;
          const boxId = parseInt(box.dataset.boxId || '-1');

          if(boxId === -1 || collectedMysteryBoxesRef.current.has(boxId)) return;

          const boxRect = box.getBoundingClientRect();
          
          const isColliding = dinoRect.left < boxRect.right &&
                              dinoRect.right > boxRect.left &&
                              dinoRect.top < boxRect.bottom &&
                              dinoRect.bottom > boxRect.top;

          if (isColliding) {
            collectedMysteryBoxesRef.current.add(boxId);
            const gameContainerRect = gameContainerRef.current?.getBoundingClientRect();
            if (gameContainerRect) {
                const x = boxRect.left - gameContainerRect.left + boxRect.width / 2;
                const y = boxRect.top - gameContainerRect.top;
                handleMysteryBoxCollision(x, y);
            }
            box.style.display = 'none'; // Hide the box immediately
          }
      });

      dinosaurRef.current.style.transform = `translateY(${-(y - 105)}px)`;
    }
    
    dinoPhysicsRef.current.y = y;
    dinoPhysicsRef.current.yVelocity = yVelocity;
    dinoPhysicsRef.current.isJumping = isJumping;

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.running, gameState.time, handleCorrectAnswer, handleWrongAnswer, generateProblem, currentProblems, generateMysteryBox, handleMysteryBoxCollision, endGame]);


  React.useEffect(() => {
    if (gameState.running) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
        if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
        if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState.running, gameLoop]);

  const jump = React.useCallback(() => {
    if (dinoPhysicsRef.current.y <= GROUND_POSITION && gameState.running && !dinoPhysicsRef.current.isJumping) {
      dinoPhysicsRef.current.isJumping = true;
      let finalJumpVelocity = JUMP_VELOCITY;
      const jumpEffect = equippedDinoRef.current?.effects?.find(e => e.type === 'JUMP');
      if (jumpEffect) {
          finalJumpVelocity *= (1 + jumpEffect.value / 100);
      }
      dinoPhysicsRef.current.yVelocity = finalJumpVelocity;
    }
  }, [gameState.running]);

  const triggerAttack = React.useCallback(() => {
    if (!gameState.running || isAttacking) return;
    setIsAttacking(true);
    setTimeout(() => {
      setIsAttacking(false);
    }, 350);
  }, [gameState.running, isAttacking]);

  const handlePress = React.useCallback(() => {
      if (gameState.running) {
          jump();
      }
  }, [gameState.running, jump]);

  React.useEffect(() => {
      const isInteractiveElement = (target: EventTarget | null) => (target as Element)?.closest('button, a, input, form');

      const onKeyDown = (e: KeyboardEvent) => { 
        if (e.code === 'Space' && !e.repeat) { 
          e.preventDefault(); 
          handlePress(); 
        } else if ((e.key === 'Control' || e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyZ') && !e.repeat) {
          e.preventDefault();
          triggerAttack();
        }
      };
      const onTouchStart = (e: TouchEvent) => { if (!isInteractiveElement(e.target)) { e.preventDefault(); handlePress(); } };
      
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('touchstart', onTouchStart, { passive: false });

      return () => {
          document.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('touchstart', onTouchStart);
      };
  }, [handlePress]);

  const startGame = React.useCallback(() => {
    
    let initialLives = 5;
    let initialTime = GAME_DURATION_SECONDS;

    const equippedDino = userData.collectedDinosaurs?.find(d => d.id === userData.equippedDinosaurId);
    equippedDinoRef.current = equippedDino || null;

    if (equippedDino) {
        const lifeEffect = equippedDino.effects?.find(e => e.type === 'LIFE');
        if (lifeEffect) {
            initialLives += lifeEffect.value;
        }
        const timeEffect = equippedDino.effects?.find(e => e.type === 'TIME');
        if (timeEffect) {
            initialTime += timeEffect.value;
        }
    }

    setGameState({ score: 0, lives: initialLives, time: initialTime, running: true, started: true });
    setProblemStats({ correct: [], wrong: [], totalProblems: 0, correctProblemTypes: {}, wrongProblemTypes: {} });
    setEarnedXp(0);
    setCurrentProblems([]);
    setMysteryBoxes([]);
    setEffectMessages([]);
    usedProblemsRef.current.clear();
    answeredProblemsRef.current.clear();
    collectedMysteryBoxesRef.current.clear();
    problemCounterRef.current = 0;
    mysteryBoxCounterRef.current = 0;
    effectMessageCounterRef.current = 0;
    frameCountRef.current = 0;
    // Set first mystery box frame to be between 30 to 40 seconds (1800 to 2400 frames)
    nextMysteryBoxFrame.current = 1800 + Math.random() * 600;

    updateDinosaurEvolution(0);
    dinoPhysicsRef.current = { y: GROUND_POSITION, yVelocity: 0, isJumping: false };
    setDinoEvolution('egg');
    setDinoIsEvolving(false);
    setGodDinoImage(null);
    setAppState('playing');

    endTimeRef.current = Date.now() + initialTime * 1000;

    generateProblem();
  }, [generateProblem, updateDinosaurEvolution, userData]);

  const restartGame = React.useCallback(() => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      setGameState({ score: 0, lives: 5, time: GAME_DURATION_SECONDS, running: false, started: false });
      setProblemStats({ correct: [], wrong: [], totalProblems: 0, correctProblemTypes: {}, wrongProblemTypes: {} });
      setCurrentProblems([]);
      setMysteryBoxes([]);
      setEffectMessages([]);
      usedProblemsRef.current.clear();
      answeredProblemsRef.current.clear();
      collectedMysteryBoxesRef.current.clear();
      dinoPhysicsRef.current = { y: GROUND_POSITION, yVelocity: 0, isJumping: false };
      setDinoEvolution('egg');
      setDinoIsEvolving(false);
      setGodDinoImage(null);
      setAppState('start');
  }, []);

  const handleOpenModal = (type: ProblemType) => {
    setModalProblemType(type);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);

  const handleCorrectReviewAnswer = (problemToRemove: Problem) => {
    const updatedWrongProblems = userData.wrongProblems?.filter(p => JSON.stringify(p) !== JSON.stringify(problemToRemove));
    
    const updatedUserData: UserData = {
        ...userData,
        wrongProblems: updatedWrongProblems,
    };

    setUserData(updatedUserData);

    if (currentUser) {
        saveDBUserData(currentUser.uid, updatedUserData);
    }
  };

  const handleEquipDinosaur = async (dinoId: string | null) => {
    if (!currentUser) return;
    const newEquippedId = userData.equippedDinosaurId === dinoId ? null : dinoId;
    const updatedUserData: UserData = { ...userData, equippedDinosaurId: newEquippedId };
    setUserData(updatedUserData);
    await saveDBUserData(currentUser.uid, updatedUserData);
  };


  const renderContent = () => {
    switch(appState) {
        case 'loading':
            return <div className="start-screen" style={{display: 'flex'}}><div className="start-content"><div className="loading-spinner"></div></div></div>;

        case 'start':
            return <StartScreen
                      currentUser={currentUser}
                      userData={userData}
                      onLogin={login}
                      onShowSignUp={() => setAppState('signup')}
                      onShowProfile={() => setAppState('profile')}
                      onShowLeaderboard={() => setAppState('leaderboard')}
                      firebaseErrorKorean={firebaseErrorKorean}
                    />;
        
        case 'signup':
            return <SignUpModal
                      onSignUp={signUp}
                      onClose={() => setAppState('start')}
                      firebaseErrorKorean={firebaseErrorKorean}
                    />;

        case 'profile':
            return (
              <>
                <ProfileScreen 
                  userData={userData}
                  onStartGame={startGame}
                  onLogout={async () => {
                    await logout();
                    restartGame();
                  }}
                  onShowWrongProblems={handleOpenModal}
                  onShowCollection={() => setShowCollection(true)}
                  onShowLeaderboard={() => setAppState('leaderboard')}
                />
                {isModalOpen && modalProblemType && (
                  <WrongProblemsModal
                    problemType={modalProblemType}
                    allWrongProblems={userData.wrongProblems || []}
                    onClose={handleCloseModal}
                    onCorrectAnswer={handleCorrectReviewAnswer}
                  />
                )}
                 {showCollection && (
                  <CollectionScreen 
                    userData={userData}
                    onClose={() => setShowCollection(false)}
                    onEquipDinosaur={handleEquipDinosaur}
                  />
                )}
              </>
            );

        case 'playing':
            return (
              <>
                <GameHUD 
                  score={gameState.score} 
                  lives={gameState.lives} 
                  time={gameState.time} 
                  userData={userData}
                  maxTime={GAME_DURATION_SECONDS}
                />
                <EffectMessages messages={effectMessages} />
                <Dinosaur 
                  ref={dinosaurRef} 
                  evolution={dinoEvolution} 
                  y={dinoPhysicsRef.current.y} 
                  evolving={dinoIsEvolving} 
                  isAttacking={isAttacking}
                  godDinoImage={godDinoImage}
                />
                <ProblemContainer problems={currentProblems} mysteryBoxes={mysteryBoxes} dinoEvolution={dinoEvolution} />
                <div className="instructions">
                  스페이스바: 점프 🦘 | Ctrl 키: 공룡 공격 💥
                </div>
              </>
            );

        case 'gameover':
            return <GameOverScreen 
                      score={gameState.score}
                      xpGained={earnedXp}
                      onShowLeaderboard={() => setAppState('leaderboard')}
                      onShowAnalysis={() => setAppState('analysis')}
                      onRestart={restartGame}
                    />;

        case 'analysis':
            return <AnalysisScreen 
                      problemStats={problemStats}
                      onRestart={restartGame}
                      onBackToStart={() => {
                        restartGame();
                        setAppState('start');
                      }}
                    />;

        case 'leaderboard':
            return <LeaderboardScreen 
                      getLeaderboardData={getLeaderboardFromFirestore}
                      onClose={() => {
                        if (currentUser) {
                            setAppState('profile');
                        } else if (!gameState.started) {
                            setAppState('start');
                        } else {
                            setAppState('gameover');
                        }
                      }}
                    />;

        case 'levelup':
            return <LevelUpModal
                      oldLevel={calculateLevel(userData.totalXp - earnedXp)}
                      newLevel={userData.level}
                      onClose={() => setAppState('gameover')}
                    />;

        default:
            return null;
    }
  }

  const currentBiome = (GAME_DURATION_SECONDS - gameState.time < 90) ? 'biome-jungle' : (GAME_DURATION_SECONDS - gameState.time < 180) ? 'biome-volcano' : (GAME_DURATION_SECONDS - gameState.time < 270) ? 'biome-starlight' : 'biome-jungle';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className={`game-container ${currentBiome}`} ref={gameContainerRef}>
        <AnimatedBackground />
        {renderContent()}
      </div>
    </main>
  );
}
