"use client";

import * as React from 'react';
import { GameState, Problem, UserData, ProblemStats, CurrentProblem, AppState, Fraction, EvolutionStage, SpeedLevel } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { loadUserData as loadDBUserData, saveUserData as saveDBUserData, getLeaderboardFromFirestore } from '@/lib/firestore-helpers';
import { generateProblem as generateProblemUtil, calculateLevel, analyzeStats, firebaseErrorKorean } from '@/lib/game-logic';
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

export default function Home() {
  const [appState, setAppState] = React.useState<AppState>('loading');
  const [gameState, setGameState] = React.useState<GameState>({
    score: 0,
    lives: 5,
    time: 0,
    running: false,
    started: false,
  });
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [userData, setUserData] = React.useState<UserData>({ score: 0, totalXp: 0, level: 1, correctProblemTypes: {}, wrongProblemTypes: {} });
  const [problemStats, setProblemStats] = React.useState<ProblemStats>({ correct: [], wrong: [], totalProblems: 0, correctProblemTypes: {}, wrongProblemTypes: {} });
  const [currentProblems, setCurrentProblems] = React.useState<CurrentProblem[]>([]);
  
  const [isJumping, setIsJumping] = React.useState(false);
  const [isRecoiling, setIsRecoiling] = React.useState(false);
  const [dinoState, setDinoState] = React.useState<{ evolution: EvolutionStage; jumping: 'none' | 'low' | 'high'; evolving: boolean }>({ evolution: 'egg', jumping: 'none', evolving: false });
  const [speedLevel, setSpeedLevel] = React.useState<SpeedLevel>(0);
  
  // Refs for timers and DOM elements
  const gameTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const problemTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const usedProblemsRef = React.useRef<Set<string>>(new Set());
  const problemCounterRef = React.useRef(0);
  const dinosaurRef = React.useRef<HTMLDivElement>(null);
  const jumpStartTimeRef = React.useRef(0);
  const spacePressedRef = React.useRef(false);

  // Auth Listener
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const data = await loadDBUserData(user.uid);
        setUserData(data);
        if (appState === 'loading') {
          setAppState('start');
        }
      } else {
        setCurrentUser(null);
        setUserData({ score: 0, totalXp: 0, level: 1, correctProblemTypes: {}, wrongProblemTypes: {} });
        setAppState('start');
      }
    });
    return () => unsubscribe();
  }, [appState]);

  // Game container resizing
  const gameContainerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const resizeGame = () => {
      if (!gameContainerRef.current) return;
      const baseWidth = 1280;
      const baseHeight = 720;
      const scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);
      gameContainerRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    resizeGame();
    window.addEventListener('resize', resizeGame);
    return () => window.removeEventListener('resize', resizeGame);
  }, []);

  const cleanupProblem = React.useCallback((problemId: number) => {
      setCurrentProblems(prev => prev.filter(p => p.id !== problemId));
  }, []);

  const generateProblem = React.useCallback(() => {
    const newProblemData = generateProblemUtil(gameState.score, usedProblemsRef.current);
    if (!newProblemData) {
      usedProblemsRef.current.clear();
      requestAnimationFrame(generateProblem);
      return;
    }

    const { problem, answers, problemKey } = newProblemData;
    usedProblemsRef.current.add(problemKey);
    problemCounterRef.current++;
    const problemId = problemCounterRef.current;

    const cleanupTimer = setTimeout(() => {
        setProblemStats(prev => {
            const newWrong = [...prev.wrong, problem];
            const newWrongTypes = { ...prev.wrongProblemTypes, [problem.type]: (prev.wrongProblemTypes[problem.type] || 0) + 1 };
            return { ...prev, wrong: newWrong, wrongProblemTypes: newWrongTypes };
        });
        cleanupProblem(problemId);
    }, 7500);

    const newCurrentProblem: CurrentProblem = {
        id: problemId,
        problem,
        answers,
        answered: false,
        cleanupTimer
    };

    setCurrentProblems(prev => [...prev, newCurrentProblem]);

    setProblemStats(prev => ({ ...prev, totalProblems: prev.totalProblems + 1 }));
  }, [gameState.score, cleanupProblem]);
  
  const updateDinosaurEvolution = React.useCallback((currentScore: number) => {
    let newStage: EvolutionStage;
    if (currentScore >= 400) newStage = 'boss';
    else if (currentScore >= 300) newStage = 'adult';
    else if (currentScore >= 200) newStage = 'medium';
    else if (currentScore >= 100) newStage = 'baby';
    else newStage = 'egg';

    if (newStage !== dinoState.evolution) {
      setDinoState(prev => ({ ...prev, evolution: newStage, evolving: true }));
      setTimeout(() => setDinoState(prev => ({ ...prev, evolving: false })), 1000);
    }
  }, [dinoState.evolution]);

  // Main game loop for collision detection
  React.useEffect(() => {
    let collisionInterval: NodeJS.Timeout;
    if (isJumping) {
      collisionInterval = setInterval(() => {
        if (!dinosaurRef.current) return;
        const dinoRect = dinosaurRef.current.getBoundingClientRect();
        
        document.querySelectorAll('.answer-bubble').forEach(bubbleEl => {
          const bubble = bubbleEl as HTMLDivElement;
          const bubbleRect = bubble.getBoundingClientRect();
          const problemId = parseInt(bubble.dataset.problemId || '-1');
          const problemData = currentProblems.find(p => p.id === problemId);

          if (!problemData || problemData.answered) return;

          if (dinoRect.left < bubbleRect.right && dinoRect.right > bubbleRect.left &&
              dinoRect.top < bubbleRect.bottom && dinoRect.bottom > bubbleRect.top) {
            
            problemData.answered = true;
            clearTimeout(problemData.cleanupTimer);
            
            bubble.classList.add('hit');
            bubble.style.animationPlayState = 'running';
            bubble.addEventListener('animationend', () => {
                cleanupProblem(problemId);
            }, { once: true });
            
            setIsRecoiling(true);
            setTimeout(() => {
              setIsJumping(false);
              setIsRecoiling(false);
              setDinoState(prev => ({...prev, jumping: 'none' }));
            }, 300);

            const isCorrect = bubble.dataset.correct === 'true';
            const type = problemData.problem.type;

            if (isCorrect) {
              setGameState(prev => ({...prev, score: prev.score + 10}));
              updateDinosaurEvolution(gameState.score + 10);
              bubble.style.background = '#2ecc71';
              setProblemStats(prev => ({
                ...prev,
                correct: [...prev.correct, problemData.problem],
                correctProblemTypes: { ...prev.correctProblemTypes, [type]: (prev.correctProblemTypes[type] || 0) + 1 }
              }));
            } else {
              setGameState(prev => {
                const newLives = prev.lives - 1;
                if (newLives <= 0) {
                  endGame(prev.score);
                }
                return {...prev, lives: newLives};
              });
              bubble.style.background = '#e74c3c';
              setProblemStats(prev => ({
                ...prev,
                wrong: [...prev.wrong, problemData.problem],
                wrongProblemTypes: { ...prev.wrongProblemTypes, [type]: (prev.wrongProblemTypes[type] || 0) + 1 }
              }));
            }
          }
        });
      }, 50);
    }
    return () => clearInterval(collisionInterval);
  }, [isJumping, currentProblems, cleanupProblem, gameState.score, updateDinosaurEvolution]);

  const jump = React.useCallback((holdTime = 0) => {
    if ((isJumping || isRecoiling) || !gameState.running) return;
    
    setIsJumping(true);
    const jumpType = holdTime > 200 ? 'high' : 'low';
    setDinoState(prev => ({...prev, jumping: jumpType }));

    setTimeout(() => {
        if (!isRecoiling) {
          setIsJumping(false);
          setDinoState(prev => ({...prev, jumping: 'none' }));
        }
    }, 600);
  }, [isJumping, isRecoiling, gameState.running]);

  const handlePressStart = React.useCallback(() => {
      if (gameState.started && gameState.running && !spacePressedRef.current) {
          spacePressedRef.current = true;
          jumpStartTimeRef.current = Date.now();
      }
  }, [gameState.started, gameState.running]);

  const handlePressEnd = React.useCallback(() => {
      if (gameState.started && gameState.running && spacePressedRef.current) {
          spacePressedRef.current = false;
          const holdTime = Date.now() - jumpStartTimeRef.current;
          jump(holdTime);
      }
  }, [gameState.started, gameState.running, jump]);

  React.useEffect(() => {
      const isInteractiveElement = (target: EventTarget | null) => (target as Element)?.closest('button, a, input, form');

      const onKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); handlePressStart(); } };
      const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); handlePressEnd(); } };
      const onTouchStart = (e: TouchEvent) => { if (!isInteractiveElement(e.target)) { e.preventDefault(); handlePressStart(); } };
      const onTouchEnd = (e: TouchEvent) => { if (!isInteractiveElement(e.target)) { e.preventDefault(); handlePressEnd(); } };
      
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('touchstart', onTouchStart);
      document.addEventListener('touchend', onTouchEnd);

      return () => {
          document.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('keyup', onKeyUp);
          document.removeEventListener('touchstart', onTouchStart);
          document.removeEventListener('touchend', onTouchEnd);
      };
  }, [handlePressStart, handlePressEnd]);


  const startGame = React.useCallback(() => {
    setGameState({ score: 0, lives: 5, time: 0, running: true, started: true });
    setProblemStats({ correct: [], wrong: [], totalProblems: 0, correctProblemTypes: {}, wrongProblemTypes: {} });
    setCurrentProblems([]);
    usedProblemsRef.current.clear();
    problemCounterRef.current = 0;
    updateDinosaurEvolution(0);
    setAppState('playing');

    const startTime = Date.now();
    gameTimerRef.current = setInterval(() => {
        setGameState(prev => {
            if (!prev.running) {
                clearInterval(gameTimerRef.current!);
                return prev;
            }
            return {...prev, time: Math.floor((Date.now() - startTime) / 1000)}
        });
    }, 1000);

    generateProblem();
    problemTimerRef.current = setInterval(() => {
        setGameState(prev => {
            if (prev.running) generateProblem();
            return prev;
        });
    }, 4000);
  }, [generateProblem, updateDinosaurEvolution]);

  const endGame = React.useCallback((finalScore: number) => {
    setGameState(prev => ({...prev, running: false}));
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (problemTimerRef.current) clearInterval(problemTimerRef.current);
    currentProblems.forEach(p => clearTimeout(p.cleanupTimer));
    setCurrentProblems([]);

    const earnedXp = Math.floor(finalScore / 5);
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
    };

    for (const type in problemStats.correctProblemTypes) {
        finalUserData.correctProblemTypes[type] = (finalUserData.correctProblemTypes[type] || 0) + problemStats.correctProblemTypes[type];
    }
    for (const type in problemStats.wrongProblemTypes) {
        finalUserData.wrongProblemTypes[type] = (finalUserData.wrongProblemTypes[type] || 0) + problemStats.wrongProblemTypes[type];
    }
    
    setUserData(finalUserData);
    if(currentUser) {
      saveDBUserData(currentUser.uid, finalUserData, finalScore);
    }

    if (newLevel > oldLevel) {
        setAppState('levelup');
    } else {
        setAppState('gameover');
    }
  }, [currentProblems, userData, problemStats, currentUser]);

  const restartGame = React.useCallback(() => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (problemTimerRef.current) clearInterval(problemTimerRef.current);
      currentProblems.forEach(p => clearTimeout(p.cleanupTimer));

      setGameState({ score: 0, lives: 5, time: 0, running: false, started: false });
      setProblemStats({ correct: [], wrong: [], totalProblems: 0, correctProblemTypes: {}, wrongProblemTypes: {} });
      setCurrentProblems([]);
      usedProblemsRef.current.clear();
      setDinoState({ evolution: 'egg', jumping: 'none', evolving: false });
      setAppState('start');
  }, [currentProblems]);
  
  React.useEffect(() => {
    if (gameState.running) {
      let newSpeedLevel: SpeedLevel;
      if (gameState.score >= 200) newSpeedLevel = 5;
      else if (gameState.score >= 150) newSpeedLevel = 4;
      else if (gameState.score >= 100) newSpeedLevel = 3;
      else if (gameState.score >= 50) newSpeedLevel = 2;
      else if (gameState.score >= 20) newSpeedLevel = 1;
      else newSpeedLevel = 0;
      setSpeedLevel(newSpeedLevel);
    }
  }, [gameState.score, gameState.running]);

  React.useEffect(() => {
    const dinoElement = dinosaurRef.current;
    if (!dinoElement) return;

    if (isRecoiling) {
      dinoElement.style.transition = 'bottom 0.1s ease-out';
      const currentBottom = parseFloat(getComputedStyle(dinoElement).bottom);
      dinoElement.style.bottom = `${currentBottom - 40}px`;
    } else if (!isJumping) {
      dinoElement.style.transition = 'all 0.8s ease';
      dinoElement.style.bottom = ''; // Reset to CSS defined value
    }
  }, [isRecoiling, isJumping]);


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
            return <ProfileScreen 
                      userData={userData}
                      onStartGame={startGame}
                      onLogout={async () => {
                        await logout();
                        restartGame();
                      }}
                    />;

        case 'playing':
            return (
              <>
                <GameHUD 
                  score={gameState.score} 
                  lives={gameState.lives} 
                  time={gameState.time} 
                  userData={userData}
                />
                <Dinosaur ref={dinosaurRef} {...dinoState} />
                <ProblemContainer problems={currentProblems} speedLevel={speedLevel} />
                <div className="instructions">
                  스페이스바 또는 화면 터치로 점프하고 정답을 맞혀보세요!
                </div>
              </>
            );

        case 'gameover':
            return <GameOverScreen 
                      score={gameState.score}
                      xpGained={Math.floor(gameState.score / 5)}
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
                        if (gameState.started && !gameState.running) {
                            setAppState('gameover');
                        } else {
                            setAppState('start');
                        }
                      }}
                    />;

        case 'levelup':
            return <LevelUpModal
                      oldLevel={calculateLevel(userData.totalXp - Math.floor(gameState.score / 5))}
                      newLevel={userData.level}
                      onClose={() => setAppState('gameover')}
                    />;

        default:
            return null;
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="game-container" ref={gameContainerRef}>
        <AnimatedBackground />
        {renderContent()}
      </div>
    </main>
  );
}
