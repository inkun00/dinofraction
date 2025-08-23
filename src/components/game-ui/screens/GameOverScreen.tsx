import React from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, BarChart, RotateCw } from 'lucide-react';

interface GameOverScreenProps {
  score: number;
  xpGained: number;
  onShowLeaderboard: () => void;
  onShowAnalysis: () => void;
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, xpGained, onShowLeaderboard, onShowAnalysis, onRestart }) => {
  return (
    <div className="game-over-screen" style={{ display: 'flex' }}>
      <div className="game-over-content">
        <div className="text-4xl font-bold">게임 종료!</div>
        <div className="text-2xl my-5">최종 점수: <span className="font-bold">{score}</span></div>
        <div className="text-xl text-green-600 font-bold">경험치 +{xpGained} XP</div>
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mt-6">
          <Button onClick={onShowLeaderboard} className="restart-btn bg-yellow-500 hover:bg-yellow-600 border-yellow-700 game-over-btn">
            <Trophy className="w-6 h-6" /><span>리더보드</span>
          </Button>
          <Button onClick={onShowAnalysis} className="restart-btn game-over-btn">
            <BarChart className="w-6 h-6" /><span>결과 분석</span>
          </Button>
          <Button onClick={onRestart} className="restart-btn game-over-btn">
            <RotateCw className="w-6 h-6" /><span>다시 하기</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
