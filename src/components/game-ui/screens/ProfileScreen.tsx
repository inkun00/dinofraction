import React from 'react';
import type { ProblemType, UserData } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface ProfileScreenProps {
  userData: UserData;
  onStartGame: () => void;
  onLogout: () => void;
  onShowWrongProblems: (type: ProblemType) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ userData, onStartGame, onLogout, onShowWrongProblems }) => {
  const allTypes = Array.from(new Set([...Object.keys(userData.correctProblemTypes), ...Object.keys(userData.wrongProblemTypes)]));

  const performanceData = allTypes.map(type => {
    const correct = userData.correctProblemTypes[type] || 0;
    const wrong = userData.wrongProblemTypes[type] || 0;
    const total = correct + wrong;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { type: type as ProblemType, correct, wrong, total, accuracy };
  }).sort((a, b) => b.accuracy - a.accuracy);

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
        </div>

        <div className="mt-6">
            <h3 className="text-xl font-bold text-center mb-4">📊 영역별 성취도 (클릭하여 오답 풀기)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg">
              {performanceData.length > 0 ? performanceData.map(({ type, correct, wrong, accuracy }) => (
                <button 
                  key={type} 
                  className="stat-item p-3 bg-white rounded-lg border text-left hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => onShowWrongProblems(type)}
                >
                  <div className="font-bold text-lg text-gray-700">{type}</div>
                  <div className="text-base text-blue-600">정답률: {accuracy}%</div>
                  <div className="text-sm text-gray-500">
                    (정답 {correct} / 오답 {wrong})
                  </div>
                </button>
              )) : (
                <p className="col-span-2 text-center text-gray-500 py-4">아직 플레이 기록이 없습니다.</p>
              )}
            </div>
        </div>

        <div className="analysis-buttons mt-6">
          <Button onClick={onStartGame} className="start-btn">게임 시작!</Button>
          <Button onClick={onLogout} className="restart-btn close">로그아웃</Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
