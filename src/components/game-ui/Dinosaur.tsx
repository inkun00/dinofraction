import React from 'react';
import { cn } from '@/lib/utils';
import type { EvolutionStage } from '@/lib/types';

interface DinosaurProps {
  evolution: EvolutionStage;
  jumping: 'none' | 'low' | 'high';
  evolving: boolean;
}

const Dinosaur = React.forwardRef<HTMLDivElement, DinosaurProps>(({ evolution, jumping, evolving }, ref) => {
  const classes = cn(
    'dinosaur',
    evolution,
    { 'jumping-low': jumping === 'low' },
    { 'jumping-high': jumping === 'high' },
    { 'bounce': jumping !== 'none' },
    { 'evolving': evolving }
  );

  return <div ref={ref} className={classes}></div>;
});

Dinosaur.displayName = 'Dinosaur';

export default Dinosaur;
