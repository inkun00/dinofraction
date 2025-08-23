import React from 'react';
import { cn } from '@/lib/utils';
import type { CurrentProblem, SpeedLevel } from '@/lib/types';
import FractionDisplay from './FractionDisplay';

interface ProblemContainerProps {
  problems: CurrentProblem[];
  speedLevel: SpeedLevel;
}

const ProblemContainer: React.FC<ProblemContainerProps> = ({ problems, speedLevel }) => {
  const speedClass = `speed-level-${speedLevel}`;

  return (
    <>
      {problems.map(({ id, problem, answers }) => (
        <React.Fragment key={id}>
          <div
            className={cn('math-problem', speedClass)}
            data-problem-id={id}
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
              className={cn('answer-bubble', speedClass)}
              data-correct={answer.isCorrect}
              data-problem-id={id}
              style={{ animationDelay: `${(id * 0.2) + (index * 0.8)}s` }}
            >
              <FractionDisplay fraction={answer.value} />
            </div>
          ))}
        </React.Fragment>
      ))}
    </>
  );
};

export default React.memo(ProblemContainer);
