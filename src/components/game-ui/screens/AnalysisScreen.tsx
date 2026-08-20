import React, { useState, useEffect } from 'react';
import type { ProblemStats } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Sparkles, Bot, Loader2 } from 'lucide-react';
import FractionDisplay from '../FractionDisplay';
import { getPersonalizedFeedback } from '@/ai/flows/personalized-feedback';

interface AnalysisScreenProps {
  problemStats: ProblemStats;
  onRestart: () => void;
  onBackToStart: () => void;
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ problemStats, onRestart, onBackToStart }) => {
  const totalAnswered = problemStats.correct.length + problemStats.wrong.length;
  const accuracy = totalAnswered > 0 ? Math.round((problemStats.correct.length / totalAnswered) * 100) : 0;
  
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchFeedback = async () => {
      if (totalAnswered === 0) {
        setLoadingFeedback(false);
        return;
      }

      try {
        setLoadingFeedback(true);
        const res = await getPersonalizedFeedback({
          correctProblemTypes: problemStats.correctProblemTypes,
          wrongProblemTypes: problemStats.wrongProblemTypes,
        });
        if (isMounted && res?.feedback) {
          setAiFeedback(res.feedback);
        }
      } catch (error) {
        console.warn('AI 피드백 생성 실패:', error);
        if (isMounted) {
          // 로컬 Fallback 맞춤 피드백
          if (accuracy >= 80) {
            setAiFeedback('대단해요! 분수 덧셈과 뺄셈을 훌륭하게 마스터하고 있어요. 더 높은 단계의 대분수 연산에도 도전해보세요!');
          } else if (problemStats.wrong.length > 0) {
            const mostWrongType = Object.entries(problemStats.wrongProblemTypes).sort((a, b) => b[1] - a[1])[0]?.[0];
            setAiFeedback(`수고했어요! ${mostWrongType ? `'${mostWrongType}' 유형을 조금 더 연습하면` : '오답 노트를 다시 복습하면'} 정답률이 쑥쑥 오를 거예요. 힘내세요! 💪`);
          } else {
            setAiFeedback('차근차근 연습하며 분수의 감각을 키워나가고 있어요. 다음 게임에서도 멋진 점수를 기록해보세요!');
          }
        }
      } finally {
        if (isMounted) setLoadingFeedback(false);
      }
    };

    fetchFeedback();
    return () => { isMounted = false; };
  }, [problemStats, totalAnswered, accuracy]);

  return (
    <div className="analysis-screen" style={{ display: 'flex' }}>
      <div className="analysis-content max-w-xl max-h-[90vh] overflow-y-auto">
        <h2 className="analysis-title">📊 학습 분석 결과</h2>
        <div className="analysis-stats">
          <div className="stat-item"><div className="stat-label">총 문제 수</div><div className="stat-value">{totalAnswered}</div></div>
          <div className="stat-item"><div className="stat-label">정답률</div><div className="stat-value">{accuracy}%</div></div>
        </div>

        {/* AI 코치 맞춤 피드백 카드 */}
        <div className="my-4 p-4 rounded-xl bg-gradient-to-r from-sky-50 to-amber-50 border-2 border-sky-200 shadow-sm text-left">
          <div className="flex items-center gap-2 font-bold text-sky-800 mb-2">
            <Bot className="h-5 w-5 text-sky-600 animate-bounce" />
            <span>🦖 공룡 AI 코치의 학습 코칭</span>
            <Sparkles className="h-4 w-4 text-amber-500 ml-auto" />
          </div>
          {loadingFeedback ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>AI가 학생의 풀이 패턴을 분석 중입니다...</span>
            </div>
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed font-medium">
              {aiFeedback || '분수 문제를 꾸준히 풀며 기초를 탄탄히 다지고 있어요!'}
            </p>
          )}
        </div>

        {/* 영역별 정답률 분석 테이블 */}
        {(() => {
          const categories = [
            { name: '진분수의 덧셈', icon: '➕', types: ['진분수+진분수', '진분수+진분수_합1초과'] },
            { name: '진분수의 뺄셈', icon: '➖', types: ['진분수-진분수'] },
            { name: '자연수 - 분수의 뺄셈', icon: '🔢', types: ['1-진분수', '자연수-진분수', '자연수-대분수'] },
            { name: '대분수의 덧셈', icon: '➕', types: ['대분수+대분수'] },
            { name: '대분수의 뺄셈 (받아내림)', icon: '➖', types: ['대분수-대분수', '대분수-대분수(받아내림)'] },
          ];

          const domainStats = categories.map(cat => {
            let c = 0, w = 0;
            cat.types.forEach(t => {
              c += (problemStats.correctProblemTypes?.[t] || 0);
              w += (problemStats.wrongProblemTypes?.[t] || 0);
            });
            const total = c + w;
            const rate = total > 0 ? Math.round((c / total) * 100) : 0;
            return { ...cat, c, w, total, rate };
          }).filter(d => d.total > 0);

          if (domainStats.length === 0) return null;

          return (
            <div className="my-4 p-3 bg-white rounded-xl border border-gray-200 shadow-sm text-left">
              <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1">
                <span>📚 영역별 정답률 & 역량 분석</span>
              </h3>
              <div className="space-y-2">
                {domainStats.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-1.5 font-medium text-gray-700 w-44">
                      <span>{d.icon}</span>
                      <span>{d.name}</span>
                    </div>
                    <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${d.rate >= 80 ? 'bg-emerald-500' : d.rate >= 60 ? 'bg-sky-500' : 'bg-rose-500'}`}
                        style={{ width: `${d.rate}%` }}
                      />
                    </div>
                    <div className="text-right w-28 font-semibold">
                      <span className={`${d.rate >= 80 ? 'text-emerald-600' : d.rate >= 60 ? 'text-sky-600' : 'text-rose-600'}`}>
                        {d.rate}%
                      </span>
                      <span className="text-gray-400 font-normal ml-1">({d.c}/{d.total})</span>
                      <span className="ml-1 text-[11px]">
                        {d.rate >= 80 ? '🌟' : d.rate >= 60 ? '👍' : '⚠️'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {problemStats.wrong.length > 0 && (
          <div className="wrong-problems">
            <div className="wrong-problems-title">❌ 틀린 문제들</div>
            <div className="wrong-problem-list max-h-48 overflow-y-auto">
              {problemStats.wrong.map((p, index) => (
                <div key={index} className="wrong-problem-item">
                   <div className="flex items-center justify-center gap-2">
                    {p.parts.map((part, partIndex) => {
                        if (part.type === 'fraction') {
                            return <FractionDisplay key={partIndex} fraction={part.value} />;
                        }
                        if (part.type === 'operator') {
                            return <span key={partIndex} className="mx-2">{part.value}</span>;
                        }
                        return null;
                    })}
                  </div>
                  <span className="text-xl">=</span>
                  <FractionDisplay fraction={p.answer} />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {problemStats.wrong.length === 0 && totalAnswered > 0 && (
            <div className="no-problems my-3">
                모든 문제를 맞혔어요! 완벽해요! 🎉
            </div>
        )}

        <div className="analysis-buttons mt-4">
          <Button onClick={onRestart} className="restart-btn">🔄 다시 하기</Button>
          <Button onClick={onBackToStart} className="restart-btn close">처음으로</Button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisScreen;

