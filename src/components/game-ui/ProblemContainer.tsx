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
            dangerouslySetInnerHTML={{ __html: problem.text }}
          />
          {answers.map((answer, index) => (
            <div
              key={index}
              className={cn('answer-bubble', speedClass)}
              data-correct={answer.isCorrect}
              data-problem-id={id}
              style={{ animationDelay: `${index * 0.8}s` }}
            >
              <FractionDisplay fraction={answer.value} />
            </div>
          ))}
        </React.Fragment>
      ))}
    </>
  );
};

export default ProblemContainer;
