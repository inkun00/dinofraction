import React from 'react';
import { cn } from '@/lib/utils';
import type { EvolutionStage } from '@/lib/types';

interface DinosaurProps {
  evolution: EvolutionStage;
  y: number;
  evolving: boolean;
  recoil: boolean;
}

const Dinosaur = React.forwardRef<HTMLDivElement, DinosaurProps>(({ evolution, y, recoil, evolving }, ref) => {
  const classes = cn(
    'dinosaur',
    evolution,
    { 'recoiling': recoil },
    { 'evolving': evolving },
    { 'jumping': y > 135 }
  );

  return <div ref={ref} className={classes} style={{ bottom: `${y}px`}}></div>;
});

Dinosaur.displayName = 'Dinosaur';

export default Dinosaur;

    