import React from 'react';
import type { UserData } from '@/lib/types';
import { analyzeStats } from '@/lib/game-logic';
import { Button } from '@/components/ui/button';

interface ProfileScreenProps {
  userData: UserData;
  onStartGame: () => void;
  onLogout: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ userData, onStartGame, onLogout }) => {
  const strengths = analyzeStats(userData.correctProblemTypes);
  const weaknesses = analyzeStats(userData.wrongProblemTypes);

  return (
    <div className="profile-screen" style={{ display: 'flex' }}>
      <div className="analysis-content">
        <h2 className="analysis-title">📊 나의 프로필</h2>
        <div className="analysis-stats">
          <div className="stat-item p-4 bg-gray-100 rounded-lg">
            <div className="stat-label">레벨</div>
            <div className="stat-value">{userData.level}</div>
          </div>
          <div className="stat-item p-4 bg-gray-100 rounded-lg">
            <div className="stat-label">누적 경험치</div>
            <div className="stat-value">{userData.totalXp}</div>
          </div>
          <div className="stat-item p-4 bg-gray-100 rounded-lg col-span-2">
            <div className="stat-label">최고 점수</div>
            <div className="stat-value">{userData.score}</div>
          </div>
          <div className="stat-item p-4 bg-green-100 rounded-lg">
            <div className="stat-label text-green-700">잘하는 계산</div>
            <div className="stat-value text-green-700 text-xl">{strengths || '기록 없음'}</div>
          </div>
          <div className="stat-item p-4 bg-red-100 rounded-lg">
            <div className="stat-label text-red-700">부족한 계산</div>
            <div className="stat-value text-red-700 text-xl">{weaknesses || '기록 없음'}</div>
          </div>
        </div>
        <div className="analysis-buttons">
          <Button onClick={onStartGame} className="start-btn">게임 시작!</Button>
          <Button onClick={onLogout} className="restart-btn close">로그아웃</Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
