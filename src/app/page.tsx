
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

const JUMP_VELOCITY = 22;
const RECOIL_JUMP_VELOCITY = 15;
const GRAVITY = -1;
const GROUND_POSITION = 135;
const PROBLEM_GENERATION_INTERVAL = 200; // frames, 60fps -> ~3.3s

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
  
  const [dinoState, setDinoState] = React.useState<{ evolution: EvolutionStage; y: number; yVelocity: number; evolving: boolean; recoil: boolean }>({ evolution: 'egg', y: GROUND_POSITION, yVelocity: 0, evolving: false, recoil: false });
  const [speedLevel, setSpeedLevel] = React.useState<SpeedLevel>(0);
  
  const gameTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const usedProblemsRef = React.useRef<Set<string>>(new Set());
  const problemCounterRef = React.useRef(0);
  const dinosaurRef = React.useRef<HTMLDivElement>(null);
  const isJumpingRef = React.useRef(false);
  const animationFrameRef = React.useRef<number>();
  const frameCountRef = React.useRef(0);

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
  
  const updateDinosaurEvolution = React.useCallback((currentScore: number) => {
    let newStage: EvolutionStage;
    if (currentScore >= 400) newStage = 'boss';
    else if (currentScore >= 300) newStage = 'adult';
    else if (currentScore >= 200) newStage = 'medium';
    else if (currentScore >= 100) newStage = 'baby';
    else newStage = 'egg';

    setDinoState(prev => {
      if (newStage !== prev.evolution) {
        setTimeout(() => setDinoState(p => ({ ...p, evolving: false })), 1000);
        return { ...prev, evolution: newStage, evolving: true };
      }
      return prev;
    });
  }, []);

  const recoilJump = React.useCallback(() => {
    setDinoState(prev => ({ ...prev, yVelocity: RECOIL_JUMP_VELOCITY }));
  }, []);

  const handleCorrectAnswer = React.useCallback((problem: Problem) => {
      recoilJump();
      setGameState(prev => {
        const newScore = prev.score + 10;
        updateDinosaurEvolution(newScore);
        return { ...prev, score: newScore };
      });
      setProblemStats(prev => {
          const newCorrect = [...prev.correct, problem];
          const newCorrectTypes = { ...prev.correctProblemTypes, [problem.type]: (prev.correctProblemTypes[problem.type] || 0) + 1 };
          return { ...prev, correct: newCorrect, correctProblemTypes: newCorrectTypes };
      });
  }, [updateDinosaurEvolution, recoilJump]);

    const handleWrongAnswer = React.useCallback((problem: Problem) => {
        recoilJump();
        setGameState(prev => {
            const newLives = prev.lives - 1;
            return { ...prev, lives: newLives };
        });
        setProblemStats(prevStats => {
            const newWrong = [...prevStats.wrong, problem];
            const newWrongTypes = { ...prevStats.wrongProblemTypes, [problem.type]: (prevStats.wrongProblemTypes[problem.type] || 0) + 1 };
            return {...prevStats, wrong: newWrong, wrongProblemTypes: newWrongTypes };
        });
    }, [recoilJump]);

    const endGame = React.useCallback(() => {
        setGameState(prev => ({...prev, running: false, started: false}));

        if (gameTimerRef.current) clearInterval(gameTimerRef.current);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        setCurrentProblems([]);

        const finalScore = gameState.score;
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
    }, [userData, problemStats, currentUser, gameState.score]);

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
    problemCounterRef.current++;
    const problemId = problemCounterRef.current;

    const newCurrentProblem: CurrentProblem = {
        id: problemId,
        problem,
        answers,
        answered: false,
        element: React.createRef<HTMLDivElement>(),
    };

    setCurrentProblems(prevProbs => [...prevProbs, newCurrentProblem]);
    setProblemStats(prevStats => ({ ...prevStats, totalProblems: prevStats.totalProblems + 1 }));
  }, [gameState.score]);


  const gameLoop = React.useCallback(() => {
      if (!gameState.running) {
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          return;
      }
      
      frameCountRef.current++;
      if (frameCountRef.current % PROBLEM_GENERATION_INTERVAL === 0) {
          generateProblem();
      }

      setDinoState(prev => {
          let newY = prev.y;
          let newYVelocity = prev.yVelocity;

          if (prev.y > GROUND_POSITION || newYVelocity !== 0) {
              newYVelocity += GRAVITY;
              newY += newYVelocity;
          }

          if (newY <= GROUND_POSITION) {
              newY = GROUND_POSITION;
              newYVelocity = 0;
              if (isJumpingRef.current) {
                isJumpingRef.current = false;
              }
          }

          return { ...prev, y: newY, yVelocity: newYVelocity };
      });

      if (isJumpingRef.current && dinosaurRef.current) {
          const dinoRect = dinosaurRef.current.getBoundingClientRect();
          
          setCurrentProblems(prevProblems => 
              prevProblems.map(p => {
                  if (p.answered) return p;

                  let problemAnsweredThisFrame = false;

                  document.querySelectorAll(`.answer-bubble[data-problem-id='${p.id}']`).forEach(bubbleEl => {
                      if (problemAnsweredThisFrame) return;

                      const bubble = bubbleEl as HTMLDivElement;
                      const bubbleRect = bubble.getBoundingClientRect();

                      const isColliding = dinoRect.left < bubbleRect.right &&
                                          dinoRect.right > bubbleRect.left &&
                                          dinoRect.top < bubbleRect.bottom &&
                                          dinoRect.bottom > bubbleRect.top;

                      if (isColliding) {
                          problemAnsweredThisFrame = true;
                          const isCorrect = bubble.dataset.correct === 'true';

                          if (isCorrect) {
                              handleCorrectAnswer(p.problem);
                              bubble.style.background = '#2ecc71';
                          } else {
                              handleWrongAnswer(p.problem);
                              bubble.style.background = '#e74c3c';
                          }
                      }
                  });
                  if (problemAnsweredThisFrame) {
                      return { ...p, answered: true };
                  }
                  return p;
              })
          );
      }
      
      const gameContainerRect = gameContainerRef.current?.getBoundingClientRect();
      if(gameContainerRect) {
        setCurrentProblems(prev => 
            prev.filter(p => {
                const problemEl = document.querySelector(`.math-problem[data-problem-id='${p.id}']`);
                if (problemEl) {
                    const problemRect = problemEl.getBoundingClientRect();
                    if (problemRect.right < gameContainerRect.left) {
                        // 문제를 풀지 않고 지나쳐도 생명력이 감소하지 않도록 수정
                        // if (!p.answered) {
                        //      handleWrongAnswer(p.problem);
                        // }
                        return false; 
                    }
                }
                return true; 
            })
        );
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.running, handleCorrectAnswer, handleWrongAnswer, generateProblem]);


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
    if (dinoState.y <= GROUND_POSITION + 1 && gameState.running && !isJumpingRef.current) {
      isJumpingRef.current = true;
      setDinoState(prev => ({ ...prev, yVelocity: JUMP_VELOCITY }));
    }
  }, [dinoState.y, gameState.running]);

  const handlePress = React.useCallback(() => {
      if (gameState.running) {
          jump();
      }
  }, [gameState.running, jump]);

  React.useEffect(() => {
      const isInteractiveElement = (target: EventTarget | null) => (target as Element)?.closest('button, a, input, form');

      const onKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); handlePress(); } };
      const onTouchStart = (e: TouchEvent) => { if (!isInteractiveElement(e.target)) { e.preventDefault(); handlePress(); } };
      
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('touchstart', onTouchStart, { passive: false });

      return () => {
          document.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('touchstart', onTouchStart);
      };
  }, [handlePress]);

  const startGame = React.useCallback(() => {
    setGameState({ score: 0, lives: 5, time: 0, running: true, started: true });
    setProblemStats({ correct: [], wrong: [], totalProblems: 0, correctProblemTypes: {}, wrongProblemTypes: {} });
    setCurrentProblems([]);
    usedProblemsRef.current.clear();
    problemCounterRef.current = 0;
    frameCountRef.current = 0;
    updateDinosaurEvolution(0);
    setDinoState(prev => ({...prev, evolution: 'egg', y: GROUND_POSITION, yVelocity: 0, evolving: false, recoil: false}));
    setAppState('playing');

    const startTime = Date.now();
    gameTimerRef.current = setInterval(() => {
        setGameState(prev => {
            if (!prev.running) {
                if(gameTimerRef.current) clearInterval(gameTimerRef.current);
                return prev;
            }
            return {...prev, time: Math.floor((Date.now() - startTime) / 1000)}
        });
    }, 1000);

    generateProblem();
  }, [generateProblem, updateDinosaurEvolution]);

  const restartGame = React.useCallback(() => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      setGameState({ score: 0, lives: 5, time: 0, running: false, started: false });
      setProblemStats({ correct: [], wrong: [], totalProblems: 0, correctProblemTypes: {}, wrongProblemTypes: {} });
      setCurrentProblems([]);
      usedProblemsRef.current.clear();
      setDinoState({ evolution: 'egg', y: GROUND_POSITION, yVelocity: 0, evolving: false, recoil: false });
      setAppState('start');
  }, []);
  
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
                        if (!gameState.started) {
                            setAppState('start');
                        } else {
                            setAppState('gameover');
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

    
