import React from 'react';
import { cn } from '@/lib/utils';
import type { EvolutionStage } from '@/lib/types';

interface DinosaurProps {
  evolution: EvolutionStage;
  y: number;
  evolving: boolean;
  recoil: boolean;
}

const Dinosaur = React.forwardRef<HTMLDivElement, DinosaurProps>(({ evolution, y, evolving, recoil }, ref) => {
  const classes = cn(
    'dinosaur',
    evolution,
    { 'recoiling': recoil },
    { 'evolving': evolving },
    { 'jumping': y > 135 }
  );
  
  const currentTransform = `translateY(${135 - y}px)`;

  return <div ref={ref} className={classes} style={{ transform: currentTransform }}></div>;
});

Dinosaur.displayName = 'Dinosaur';

export default Dinosaur;
