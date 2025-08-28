import React, { useState } from 'react';
import type { Problem, ProblemType, Fraction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FractionDisplay from '../FractionDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { normalizeFraction } from '@/lib/game-logic';

interface WrongProblemsModalProps {
  problemType: ProblemType;
  allWrongProblems: Problem[];
  onClose: () => void;
  onCorrectAnswer: (problem: Problem) => void;
}

const WrongProblemsModal: React.FC<WrongProblemsModalProps> = ({ problemType, allWrongProblems, onClose, onCorrectAnswer }) => {
  const [problems, setProblems] = useState(allWrongProblems.filter(p => p.type === problemType));
  const [userAnswers, setUserAnswers] = useState<Record<number, Partial<Fraction>>>({});
  const [messages, setMessages] = useState<Record<number, { text: string, color: string }>>({});

  const handleAnswerChange = (index: number, field: keyof Fraction, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setUserAnswers(prev => ({
      ...prev,
      [index]: { ...prev[index], [field]: numValue }
    }));
  };

  const checkAnswer = (index: number) => {
    const problem = problems[index];
    const userAnswer = userAnswers[index] || {};
    
    // Normalize both the user's answer and the correct answer for fair comparison
    const normalizedUserAnswer = normalizeFraction(
      userAnswer.whole || 0,
      userAnswer.numerator || 0,
      userAnswer.denominator || 1
    );
    
    const correctAnswer = normalizeFraction(
      problem.answer.whole,
      problem.answer.numerator,
      problem.answer.denominator
    );

    // Compare the normalized fractions
    if (normalizedUserAnswer.whole === correctAnswer.whole &&
        normalizedUserAnswer.numerator === correctAnswer.numerator &&
        normalizedUserAnswer.denominator === correctAnswer.denominator) 
    {
      setMessages(prev => ({ ...prev, [index]: { text: '정답입니다! 목록에서 삭제되었습니다.', color: 'green' }}));
      setTimeout(() => {
        onCorrectAnswer(problem);
        setProblems(prev => prev.filter((_, i) => i !== index));
        setMessages(prev => {
            const newMessages = {...prev};
            delete newMessages[index];
            return newMessages;
        });
      }, 1500);
    } else {
      setMessages(prev => ({ ...prev, [index]: { text: '아쉬워요, 다시 도전해보세요!', color: 'red' }}));
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="analysis-content">
        <h2 className="analysis-title">오답 다시 풀기: {problemType}</h2>

        {problems.length === 0 ? (
          <p className="text-center my-8 text-green-600 font-bold">이 유형에서 틀린 문제가 없습니다. 완벽해요! 👍</p>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-4 p-2">
            {problems.map((p, index) => (
              <Card key={JSON.stringify(p)}>
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
                        <span className="mx-2">=</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Input type="number" placeholder="자연수" className="w-20 text-center" onChange={(e) => handleAnswerChange(index, 'whole', e.target.value)} />
                      <div className="flex flex-col items-center">
                        <Input type="number" placeholder="분자" className="w-20 text-center" onChange={(e) => handleAnswerChange(index, 'numerator', e.target.value)} />
                        <div className="h-1 w-20 bg-black my-1"></div>
                        <Input type="number" placeholder="분모" className="w-20 text-center" onChange={(e) => handleAnswerChange(index, 'denominator', e.target.value)} />
                      </div>
                    </div>
                    <div className="text-center mt-3">
                        <Button onClick={() => checkAnswer(index)} className="analysis-btn gemini">
                            정답 확인
                        </Button>
                        {messages[index] && (
                            <div className="mt-2 font-bold" style={{ color: messages[index].color }}>
                                {messages[index].text}
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
