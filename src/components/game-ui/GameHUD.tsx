import React from 'react';
import type { UserData } from '@/lib/types';

interface GameHUDProps {
  score: number;
  lives: number;
  time: number;
  userData: UserData;
  maxTime: number;
}

const GameHUD: React.FC<GameHUDProps> = ({ score, lives, time, userData, maxTime }) => {
  const formatTime = (seconds: number) => {
    const remainingSeconds = maxTime - seconds;
    const minutes = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="hud">
      <div>
        <div className="score">점수: <span>{score}</span></div>
        <div id="userDataDisplay" className="mt-2">
            레벨: {userData.level}<br />
            경험치: {userData.totalXp}
        </div>
      </div>
      <div className="timer">남은 시간: <span>{formatTime(time)}</span></div>
      <div className="lives">생명: <span>{lives}</span></div>
    </div>
  );
};

export default GameHUD;
