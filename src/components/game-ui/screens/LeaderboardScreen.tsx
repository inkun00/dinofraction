import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry, SchoolLeaderboardEntry, LeaderboardType } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllSchools } from '@/lib/firestore-helpers';


interface LeaderboardScreenProps {
  getLeaderboardData: (type: LeaderboardType, schoolName?: string) => Promise<Array<LeaderboardEntry | SchoolLeaderboardEntry>>;
  onClose: () => void;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ getLeaderboardData, onClose }) => {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('score');
  const [leaderboardData, setLeaderboardData] = useState<Array<LeaderboardEntry | SchoolLeaderboardEntry>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getLeaderboardData(activeTab);
        setLeaderboardData(data);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, getLeaderboardData]);

  const renderTable = () => {
    if (loading) {
      return <div className="loading-spinner my-8"></div>;
    }
    if (leaderboardData.length === 0) {
      return <p className="text-center my-8">데이터가 없습니다.</p>;
    }
    
    if (activeTab === 'school-personal') {
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>순위</TableHead>
                        <TableHead>학교</TableHead>
                        <TableHead>총경험치</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(leaderboardData as SchoolLeaderboardEntry[]).map((entry, index) => (
                        <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{entry.school}</TableCell>
                            <TableCell>{entry.totalXp}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>순위</TableHead>
                    <TableHead>닉네임</TableHead>
                    <TableHead>학교</TableHead>
                    <TableHead>{activeTab === 'xp' ? '경험치' : '점수'}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {(leaderboardData as LeaderboardEntry[]).map((entry, index) => (
                    <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{entry.nickname}</TableCell>
                        <TableCell>{entry.school || '미입력'}</TableCell>
                        <TableCell>{activeTab === 'xp' ? entry.totalXp : entry.score}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
  };


  return (
    <div className="leaderboard-screen" style={{ display: 'flex' }}>
      <div className="analysis-content">
        <h2 className="analysis-title">🏆 리더보드</h2>
        <div className="flex justify-center mb-4 flex-wrap">
          <button onClick={() => setActiveTab('score')} className={cn('tab-btn', { 'active': activeTab === 'score' })}>개인 최고 점수</button>
          <button onClick={() => setActiveTab('xp')} className={cn('tab-btn', { 'active': activeTab === 'xp' })}>개인 경험치</button>
          <button onClick={() => setActiveTab('school-personal')} className={cn('tab-btn', { 'active': activeTab === 'school-personal' })}>학교별 총점 순위</button>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
            {renderTable()}
        </div>
        <div className="analysis-buttons mt-4">
          <Button onClick={onClose} className="restart-btn close">닫기</Button>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardScreen;