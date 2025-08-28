import React from 'react';
import { cn } from '@/lib/utils';
import type { CurrentProblem, EvolutionStage, MysteryBoxItem } from '@/lib/types';
import FractionDisplay from './FractionDisplay';

interface ProblemContainerProps {
  problems: CurrentProblem[];
  mysteryBoxes: MysteryBoxItem[];
  dinoEvolution: EvolutionStage;
}

const ProblemContainer: React.FC<ProblemContainerProps> = ({ problems, mysteryBoxes, dinoEvolution }) => {
  const bubblePositionClass = `bubble-pos-${dinoEvolution}`;

  return (
    <>
      {problems.map(({ id, problem, answers, animationDuration }) => (
        <React.Fragment key={id}>
          <div
            className='math-problem'
            data-problem-id={id}
            style={{ animationDuration: `${animationDuration}s` }}
          >
             {problem.parts.map((part, index) => {
                if (part.type === 'fraction') {
                    return <FractionDisplay key={index} fraction={part.value} />;
                }
                if (part.type === 'operator') {
                    return <span key={index} className="mx-2">{part.value}</span>;
                }
                return null;
             })}
          </div>
          {answers.map((answer, index) => (
            <div
              key={`answer-${id}-${index}`}
              className={cn('answer-bubble', bubblePositionClass)}
              data-correct={answer.isCorrect}
              data-problem-id={id}
              style={{ animationDuration: `${animationDuration}s`, animationDelay: `${index * 0.8}s` }}
            >
              <FractionDisplay fraction={answer.value} />
            </div>
          ))}
        </React.Fragment>
      ))}
      {mysteryBoxes.map(({ id, animationDuration, top }) => (
        <div
            key={`mystery-box-${id}`}
            className="mystery-box"
            data-box-id={id}
            style={{ 
              animationDuration: `${animationDuration}s`, 
              animationDelay: `${Math.random() * 2}s`,
              top: `${top}px`
            }}
        />
      ))}
    </>
  );
};

export default React.memo(ProblemContainer);
