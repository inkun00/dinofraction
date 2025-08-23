import React, { useEffect, useState } from 'react';
import type { ProblemStats } from '@/lib/types';
import { Button } from '@/components/ui/button';
import FractionDisplay from '@/components/game-ui/FractionDisplay';
import { getPersonalizedFeedback } from '@/ai/flows/personalized-feedback';

interface AnalysisScreenProps {
  problemStats: ProblemStats;
  onRestart: () => void;
  onBackToStart: () => void;
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ problemStats, onRestart, onBackToStart }) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);

  const totalAnswered = problemStats.correct.length + problemStats.wrong.length;
  const accuracy = totalAnswered > 0 ? Math.round((problemStats.correct.length / totalAnswered) * 100) : 0;
  
  const sortedTypes = Object.entries(problemStats.wrongProblemTypes).sort((a, b) => b[1] - a[1]).slice(0, 3);
  
  useEffect(() => {
    const fetchFeedback = async () => {
      if (Object.keys(problemStats.wrongProblemTypes).length === 0 && Object.keys(problemStats.correctProblemTypes).length === 0) {
        setFeedback("게임을 플레이해서 맞춤 피드백을 받아보세요!");
        setIsLoadingFeedback(false);
        return;
      }
      try {
        const result = await getPersonalizedFeedback({
          correctProblemTypes: problemStats.correctProblemTypes,
          wrongProblemTypes: problemStats.wrongProblemTypes,
        });
        setFeedback(result.feedback);
      } catch (error) {
        console.error("Error getting feedback:", error);
        setFeedback("피드백을 생성하는 데 실패했습니다.");
      } finally {
        setIsLoadingFeedback(false);
      }
    };
    fetchFeedback();
  }, [problemStats]);


  return (
    <div className="analysis-screen" style={{ display: 'flex' }}>
      <div className="analysis-content">
        <h2 className="analysis-title">📊 학습 분석 결과</h2>
        <div className="analysis-stats">
          <div className="stat-item"><div className="stat-label">총 문제 수</div><div className="stat-value">{totalAnswered}</div></div>
          <div className="stat-item"><div className="stat-label">정답률</div><div className="stat-value">{accuracy}%</div></div>
        </div>
        
        <div className="recommendations">
            <div className="recommendation-title">🎯 AI 추천 학습</div>
            {isLoadingFeedback ? (
                <div className="loading-spinner"></div>
            ) : (
                <p className="text-center text-lg bg-blue-100 p-4 rounded-lg">{feedback}</p>
            )}
        </div>

        {problemStats.wrong.length > 0 && (
          <div className="wrong-problems">
            <div className="wrong-problems-title">❌ 틀린 문제들</div>
            <div className="wrong-problem-list">
              {problemStats.wrong.map((p, index) => (
                <div key={index} className="wrong-problem-item" dangerouslySetInnerHTML={{ __html: p.text }} />
              ))}
            </div>
          </div>
        )}

        <div className="analysis-buttons">
          <Button onClick={onRestart} className="restart-btn">🔄 다시 하기</Button>
          <Button onClick={onBackToStart} className="restart-btn close">처음으로</Button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisScreen;
