import React, { useState, useEffect } from 'react';
import type { ProblemType, UserData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getUserRank, updateUserInfo } from '@/lib/firestore-helpers'; // updateUserInfo 함수 import
import { auth } from '@/lib/firebase';
import { Edit, Save } from 'lucide-react';

interface ProfileScreenProps {
  userData: UserData;
  onStartGame: () => void;
  onLogout: () => void;
  onShowWrongProblems: (type: ProblemType) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ userData, onStartGame, onLogout, onShowWrongProblems }) => {
  const allTypes = Array.from(new Set([...Object.keys(userData.correctProblemTypes), ...Object.keys(userData.wrongProblemTypes)]));
  
  const [userRank, setUserRank] = useState<{ xpRank: number | null; scoreRank: number | null }>({ xpRank: null, scoreRank: null });
  const [loadingRank, setLoadingRank] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(userData.nickname || '');
  const [school, setSchool] = useState(userData.school || '');
  const [editMessage, setEditMessage] = useState('');

  useEffect(() => {
    const fetchRank = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        setLoadingRank(true);
        const rank = await getUserRank(currentUser.uid);
        setUserRank(rank);
        setLoadingRank(false);
      }
    };
    fetchRank();
  }, [userData.totalXp, userData.score]);

  const handleEditToggle = () => {
    if (isEditing) {
        const currentUser = auth.currentUser;
        if (currentUser) {
            updateUserInfo(currentUser.uid, { nickname, school })
                .then(() => {
                    setEditMessage('성공적으로 저장되었습니다.');
                    setTimeout(() => {
                        setEditMessage('');
                        window.location.reload();
                    }, 1000);
                })
                .catch(() => {
                    setEditMessage('저장에 실패했습니다.');
                    setTimeout(() => setEditMessage(''), 2000);
                });
        }
    }
    setIsEditing(!isEditing);
  };

  const performanceData = allTypes.map(type => {
    const correct = userData.correctProblemTypes[type] || 0;
    const wrong = userData.wrongProblemTypes[type] || 0;
    const total = correct + wrong;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { type: type as ProblemType, correct, wrong, total, accuracy };
  }).sort((a, b) => b.accuracy - a.accuracy);

  const allMistakesCleared = (userData.wrongProblems?.length || 0) === 0;

  return (
    <div className="profile-screen" style={{ display: 'flex' }}>
      <div className="analysis-content">
        <h2 className="analysis-title mb-4">📊 나의 프로필</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="stat-item p-4 bg-gray-100 rounded-lg">
            <div className="stat-label">레벨</div>
            <div className="stat-value">{userData.level}</div>
          </div>
          <div className="stat-item p-4 bg-gray-100 rounded-lg">
            <div className="stat-label">누적 경험치</div>
            <div className="stat-value">{userData.totalXp}</div>
            {loadingRank ? <div className="text-xs">...</div> : userRank.xpRank && <div className="text-sm font-bold text-gray-600">({userRank.xpRank}위)</div>}
          </div>
          <div className="stat-item p-4 bg-gray-100 rounded-lg">
            <div className="stat-label">최고 점수</div>
            <div className="stat-value">{userData.score}</div>
             {loadingRank ? <div className="text-xs">...</div> : userRank.scoreRank && <div className="text-sm font-bold text-gray-600">({userRank.scoreRank}위)</div>}
          </div>
        </div>

        <div className="mb-4 p-4 bg-gray-100 rounded-lg relative">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="font-bold">이름</div>
                <div>{isEditing ? <Input value={nickname} onChange={(e) => setNickname(e.target.value)} /> : (userData.nickname || '미설정')}</div>
                <div className="font-bold">학교</div>
                <div>{isEditing ? <Input value={school} onChange={(e) => setSchool(e.target.value)} /> : (userData.school || '미설정')}</div>
            </div>
            <Button onClick={handleEditToggle} size="icon" className="absolute top-2 right-2 w-8 h-8">
                {isEditing ? <Save className="w-4 h-4"/> : <Edit className="w-4 h-4"/>}
                <span className="sr-only">{isEditing ? 'Save' : 'Edit'}</span>
            </Button>
            {editMessage && <div className="text-center text-sm text-green-600 mt-2">{editMessage}</div>}
        </div>

        <div className="mb-4">
            <h3 className="text-xl font-bold text-center mb-2">📊 영역별 성취도 (클릭하여 오답 풀기)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg custom-scrollbar">
              {performanceData.length > 0 ? performanceData.map(({ type, correct, wrong, accuracy }) => (
                <button 
                  key={type} 
                  className="stat-item p-3 bg-white rounded-lg border text-left hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => onShowWrongProblems(type)}
                  disabled={(userData.wrongProblems?.filter(p => p.type === type).length || 0) === 0}
                >
                  <div className="font-bold text-lg text-gray-700">{type}</div>
                  <div className="text-base text-blue-600">정답률: {accuracy}%</div>
                  <div className="text-sm text-gray-500">
                    (정답 {correct} / 오답 {wrong})
                  </div>
                  {(userData.wrongProblems?.filter(p => p.type === type).length || 0) === 0 && (
                    <div className="text-xs text-green-600 font-bold mt-1">완벽해요!</div>
                  )}
                </button>
              )) : (
                <p className="col-span-2 text-center text-gray-500 py-4">아직 플레이 기록이 없습니다.</p>
              )}
            </div>
        </div>

        <div className="analysis-buttons">
          <Button onClick={onStartGame} className="start-btn" disabled={!allMistakesCleared}>
            게임 시작!
          </Button>
          <Button onClick={onLogout} className="restart-btn close">로그아웃</Button>
        </div>
        {!allMistakesCleared && (
            <p className="text-center text-red-600 font-bold mt-2">
              모든 오답 문제를 해결해야 게임을 시작할 수 있습니다.
            </p>
        )}
      </div>
    </div>
  );
};

export default ProfileScreen;
