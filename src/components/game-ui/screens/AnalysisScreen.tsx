import React from 'react';
import type { ProblemStats } from '@/lib/types';
import { Button } from '@/components/ui/button';
import FractionDisplay from '../FractionDisplay';

interface AnalysisScreenProps {
  problemStats: ProblemStats;
  onRestart: () => void;
  onBackToStart: () => void;
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ problemStats, onRestart, onBackToStart }) => {
  const totalAnswered = problemStats.correct.length + problemStats.wrong.length;
  const accuracy = totalAnswered > 0 ? Math.round((problemStats.correct.length / totalAnswered) * 100) : 0;
  
  return (
    <div className="analysis-screen" style={{ display: 'flex' }}>
      <div className="analysis-content">
        <h2 className="analysis-title">📊 학습 분석 결과</h2>
        <div className="analysis-stats">
          <div className="stat-item"><div className="stat-label">총 문제 수</div><div className="stat-value">{totalAnswered}</div></div>
          <div className="stat-item"><div className="stat-label">정답률</div><div className="stat-value">{accuracy}%</div></div>
        </div>

        {problemStats.wrong.length > 0 && (
          <div className="wrong-problems">
            <div className="wrong-problems-title">❌ 틀린 문제들</div>
            <div className="wrong-problem-list">
              {problemStats.wrong.map((p, index) => (
                <div key={index} className="wrong-problem-item">
                  <div dangerouslySetInnerHTML={{ __html: p.text }} />
                  <span>➡</span>
                  <FractionDisplay fraction={p.answer} />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {problemStats.wrong.length === 0 && totalAnswered > 0 && (
            <div className="no-problems">
                모든 문제를 맞혔어요! 완벽해요! 🎉
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
