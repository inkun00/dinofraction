import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry, SchoolLeaderboardEntry, LeaderboardType } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllSchools } from '@/lib/firestore-helpers';
import { Input } from '@/components/ui/input';


interface LeaderboardScreenProps {
  getLeaderboardData: (type: LeaderboardType, schoolName?: string) => Promise<Array<LeaderboardEntry | SchoolLeaderboardEntry>>;
  onClose: () => void;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ getLeaderboardData, onClose }) => {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('score');
  const [leaderboardData, setLeaderboardData] = useState<Array<LeaderboardEntry | SchoolLeaderboardEntry>>([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSchools = async () => {
        const schoolList = await getAllSchools();
        setSchools(schoolList);
    };
    if (activeTab === 'school-personal-by-school') {
        fetchSchools();
    }
  }, [activeTab]);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let data: Array<LeaderboardEntry | SchoolLeaderboardEntry> = [];
        if (activeTab === 'school-personal-by-school') {
            if (selectedSchool) {
                data = await getLeaderboardData(activeTab, selectedSchool);
            } else {
                data = []; // 학교가 선택되지 않으면 데이터를 비웁니다.
            }
        } else {
            data = await getLeaderboardData(activeTab);
        }
        setLeaderboardData(data);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, selectedSchool, getLeaderboardData]);

  const handleSchoolChange = (school: string) => {
    setSelectedSchool(school);
  }

  const filteredSchools = schools.filter(school => school.toLowerCase().includes(searchTerm.toLowerCase()));

  const renderTable = () => {
    if (loading) {
      return <div className="loading-spinner my-8"></div>;
    }
    if (leaderboardData.length === 0) {
      if (activeTab === 'school-personal-by-school' && !selectedSchool) {
          return <p className="text-center my-8">학교를 선택해주세요.</p>
      }
      return <p className="text-center my-8">데이터가 없습니다.</p>;
    }
    
    if (activeTab === 'school-total-xp') {
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
                            <TableCell>{entry.school ? (entry.school.length > 8 ? entry.school.slice(0, 8) : entry.school) : '미입력'}</TableCell>
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
                    <TableHead>{activeTab === 'xp' || activeTab === 'school-personal-by-school' ? '경험치' : '점수'}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {(leaderboardData as LeaderboardEntry[]).map((entry, index) => (
                    <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{entry.nickname ? (entry.nickname.length > 6 ? entry.nickname.slice(0, 6) : entry.nickname) : '익명'}</TableCell>
                        <TableCell>{entry.school ? (entry.school.length > 8 ? entry.school.slice(0, 8) : entry.school) : '미입력'}</TableCell>
                        <TableCell>{activeTab === 'xp' || activeTab === 'school-personal-by-school' ? entry.totalXp : entry.score}</TableCell>
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
          <button onClick={() => setActiveTab('school-total-xp')} className={cn('tab-btn', { 'active': activeTab === 'school-total-xp' })}>학교 대항전</button>
          <button onClick={() => {setActiveTab('school-personal-by-school'); setSelectedSchool(null);}} className={cn('tab-btn', { 'active': activeTab === 'school-personal-by-school' })}>학교 내 개인 순위</button>
        </div>

        {activeTab === 'school-personal-by-school' && (
            <div className="flex justify-center items-center gap-2 mb-4">
                <Input 
                    type="text"
                    placeholder="학교 이름 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-[180px]"
                />
                <Select onValueChange={handleSchoolChange} value={selectedSchool || ''}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="학교를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                        {filteredSchools.length > 0 ? filteredSchools.map(school => (
                            <SelectItem key={school} value={school}>{school}</SelectItem>
                        )) : <div className="p-2 text-center text-sm">검색 결과가 없습니다.</div>}
                    </SelectContent>
                </Select>
            </div>
        )}
        
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
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
