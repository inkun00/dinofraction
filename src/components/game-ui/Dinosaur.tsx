import React from 'react';
import { cn } from '@/lib/utils';
import type { EvolutionStage } from '@/lib/types';

interface DinosaurProps {
  evolution: EvolutionStage;
  jumping: 'none' | 'low' | 'high';
  evolving: boolean;
  recoil: boolean;
}

const Dinosaur = React.forwardRef<HTMLDivElement, DinosaurProps>(({ evolution, jumping, recoil, evolving }, ref) => {
  const classes = cn(
    'dinosaur',
    evolution,
    { 'jumping-low': jumping === 'low' },
    { 'jumping-high': jumping === 'high' },
    { 'recoiling': recoil },
    { 'bounce': jumping !== 'none' && !recoil },
    { 'evolving': evolving }
  );

  return <div ref={ref} className={classes}></div>;
});

Dinosaur.displayName = 'Dinosaur';

export default Dinosaur;
