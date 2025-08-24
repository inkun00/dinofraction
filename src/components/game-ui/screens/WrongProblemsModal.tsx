import React, { useState } from 'react';
import type { Problem, ProblemType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import FractionDisplay from '../FractionDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WrongProblemsModalProps {
  problemType: ProblemType;
  allWrongProblems: Problem[];
  onClose: () => void;
}

const WrongProblemsModal: React.FC<WrongProblemsModalProps> = ({ problemType, allWrongProblems, onClose }) => {
  const [showAnswers, setShowAnswers] = useState<boolean[]>([]);
  
  const problemsForType = allWrongProblems.filter(p => p.type === problemType);

  React.useEffect(() => {
    setShowAnswers(new Array(problemsForType.length).fill(false));
  }, [problemsForType.length]);

  const toggleAnswer = (index: number) => {
    setShowAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = !newAnswers[index];
      return newAnswers;
    });
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="analysis-content">
        <h2 className="analysis-title">오답 다시 풀기: {problemType}</h2>

        {problemsForType.length === 0 ? (
          <p className="text-center my-8 text-green-600 font-bold">이 유형에서 틀린 문제가 없습니다. 완벽해요! 👍</p>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-4 p-2">
            {problemsForType.map((p, index) => (
              <Card key={index}>
                <CardHeader>
                    <CardTitle className="text-lg">문제 {index + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center gap-2 text-2xl mb-4">
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
                    <div className="text-center">
                        <Button onClick={() => toggleAnswer(index)} className="analysis-btn gemini">
                            {showAnswers[index] ? '정답 숨기기' : '정답 보기'}
                        </Button>
                        {showAnswers[index] && (
                            <div className="mt-4 p-3 bg-green-100 rounded-lg flex items-center justify-center gap-2">
                                <span className="text-xl font-bold">정답:</span>
                                <FractionDisplay fraction={p.answer} />
                            </div>
                        )}
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <div className="analysis-buttons mt-6">
          <Button onClick={onClose} className="restart-btn close">닫기</Button>
        </div>
      </div>
    </div>
  );
};

export default WrongProblemsModal;
