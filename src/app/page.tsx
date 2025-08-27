
"use client";

import * as React from 'react';
import { GameState, Problem, UserData, ProblemStats, CurrentProblem, AppState, EvolutionStage, ProblemType, MysteryBoxItem, EffectMessage } from '@/lib/types';
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
const GROUND_POSITION = 135;
const PROBLEM_GENERATION_INTERVAL = 450; // frames, 60fps -> ~7.5s
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const INITIAL_ANIMATION_DURATION = 7.5; // seconds
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
    time: 0,
    running: false,
    started: false,
  });
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [userData, setUserData] = React.useState<UserData>({ score: 0, totalXp: 0, level: 1, correctProblemTypes: {}, wrongProblemTypes: {}, wrongProblems: [], collectedDinosaurs: [] });
  const [problemStats, setProblemStats] = React.useState<ProblemStats>({ correct: [], wrong: [], totalProblems: 0, correctProblemTypes: {}, wrongProblemTypes: {} });
  const [currentProblems, setCurrentProblems] = React.useState<CurrentProblem[]>([]);
  const [mysteryBoxes, setMysteryBoxes] = React.useState<MysteryBoxItem[]>([]);
  
  const [dinoEvolution, setDinoEvolution] = React.useState<EvolutionStage>('egg');
  const [dinoIsEvolving, setDinoIsEvolving] = React.useState(false);
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
      if (!gameState.running) return; // Prevent multiple calls

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
      };

      if (finalScore >= 500 && godDinoImage) {
          if (!finalUserData.collectedDinosaurs) {
            finalUserData.collectedDinosaurs = [];
          }
          finalUserData.collectedDinosaurs.push(godDinoImage);
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
        setUserData({ score: 0, totalXp: 0, level: 1, correctProblemTypes: {}, wrongProblemTypes: {}, wrongProblems: [], collectedDinosaurs: [] });
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


  const handleCorrectAnswer = React.useCallback((problem: Problem) => {
      const difficulty = problem.difficulty;
      const { score: scoreToAdd, xp: xpToAdd } = PROBLEM_DIFFICULTY[difficulty] || { score: 10, xp: 2 };

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
    const effects = ['life_plus', 'score_plus', 'life_minus', 'score_minus'];
    const randomEffect = effects[Math.floor(Math.random() * effects.length)];
    
    setGameState(prev => {
      if (!prev.running) return prev;
      let newLives = prev.lives;
      let newScore = prev.score;

      switch(randomEffect) {
        case 'life_plus':
          newLives = prev.lives + 1;
          addEffectMessage('+1 생명', 'life-plus', x, y);
          break;
        case 'score_plus':
          newScore = prev.score + 50;
          updateDinosaurEvolution(newScore);
          addEffectMessage('+50 점수', 'score-plus', x, y);
          break;
        case 'life_minus':
          newLives = prev.lives - 1;
          addEffectMessage('-1 생명', 'life-minus', x, y);
          break;
        case 'score_minus':
          newScore = Math.max(0, prev.score - 50);
          updateDinosaurEvolution(newScore);
          addEffectMessage('-50 점수', 'score-minus', x, y);
          break;
      }
      return {...prev, lives: newLives, score: newScore};
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
    
    const animationDuration = INITIAL_ANIMATION_DURATION / (1 + (problemCounterRef.current * 0.01));
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

  }, [gameState.score, handleWrongAnswer]);

  const generateMysteryBox = React.useCallback(() => {
    const id = mysteryBoxCounterRef.current++;
    const animationDuration = INITIAL_ANIMATION_DURATION * 0.9;
    const newBox: MysteryBoxItem = {
      id,
      collected: false,
      animationDuration,
    };
    setMysteryBoxes(prev => [...prev, newBox]);
  }, []);

  const gameLoop = React.useCallback(() => {
      if (!gameState.running) {
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          return;
      }
      
      frameCountRef.current++;
      if (frameCountRef.current % PROBLEM_GENERATION_INTERVAL === 0) {
          generateProblem();
      }

      // Randomly generate mystery box
      if (frameCountRef.current >= nextMysteryBoxFrame.current && mysteryBoxes.length < 2) {
          generateMysteryBox();
          // Set next box frame to be between 15 to 30 seconds from now (900 to 1800 frames)
          const nextInterval = 900 + Math.random() * 900;
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

        dinosaurRef.current.style.transform = `translateY(${-(y - 135)}px)`;
      }
      
      dinoPhysicsRef.current.y = y;
      dinoPhysicsRef.current.yVelocity = yVelocity;
      dinoPhysicsRef.current.isJumping = isJumping;

      animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.running, handleCorrectAnswer, handleWrongAnswer, generateProblem, currentProblems, mysteryBoxes.length, generateMysteryBox, handleMysteryBoxCollision]);


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
      dinoPhysicsRef.current.yVelocity = JUMP_VELOCITY;
    }
  }, [gameState.running]);

  const handlePress = React.useCallback(() => {
      if (gameState.running) {
          jump();
      }
  }, [gameState.running, jump]);

  React.useEffect(() => {
      const isInteractiveElement = (target: EventTarget | null) => (target as Element)?.closest('button, a, input, form');

      const onKeyDown = (e: KeyboardEvent) => { 
        if (e.code === 'Space' && !e.repeat) { e.preventDefault(); handlePress(); } 
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
    setGameState({ score: 0, lives: 5, time: 0, running: true, started: true });
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
    // Set first mystery box frame to be between 10 to 20 seconds (600 to 1200 frames)
    nextMysteryBoxFrame.current = 600 + Math.random() * 600;

    updateDinosaurEvolution(0);
    dinoPhysicsRef.current = { y: GROUND_POSITION, yVelocity: 0, isJumping: false };
    setDinoEvolution('egg');
    setDinoIsEvolving(false);
    setGodDinoImage(null);
    setAppState('playing');

    const startTime = Date.now();
    gameTimerRef.current = setInterval(() => {
        setGameState(prev => {
            if (!prev.running) {
                if(gameTimerRef.current) clearInterval(gameTimerRef.current);
                return prev;
            }
            const currentTime = Math.floor((Date.now() - startTime) / 1000);
            if (currentTime >= GAME_DURATION_SECONDS) {
                endGame();
                return {...prev, time: GAME_DURATION_SECONDS };
            }
            return {...prev, time: currentTime}
        });
    }, 1000);

    generateProblem();
  }, [generateProblem, updateDinosaurEvolution, endGame]);

  const restartGame = React.useCallback(() => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      setGameState({ score: 0, lives: 5, time: 0, running: false, started: false });
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
                    collectedDinos={userData.collectedDinosaurs || []}
                    onClose={() => setShowCollection(false)}
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
                  godDinoImage={godDinoImage}
                />
                <ProblemContainer problems={currentProblems} mysteryBoxes={mysteryBoxes} dinoEvolution={dinoEvolution} />
                <div className="instructions">
                  스페이스바 또는 화면 터치로 점프하고 정답을 맞혀보세요!
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
                        if (!gameState.started) {
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="game-container" ref={gameContainerRef}>
        <AnimatedBackground />
        {renderContent()}
      </div>
    </main>
  );
}
