import React from 'react';
import { cn } from '@/lib/utils';
import type { EvolutionStage } from '@/lib/types';

interface DinosaurProps {
  evolution: EvolutionStage;
  y: number;
  evolving: boolean;
}

const Dinosaur = React.forwardRef<HTMLDivElement, DinosaurProps>(({ evolution, y, evolving }, ref) => {
  const isJumping = y > 135;
  const isGodEvolving = evolving && evolution === 'god';

  const classes = cn(
    'dinosaur',
    evolution,
    { 'evolving': evolving && !isGodEvolving },
    { 'god-evolving': isGodEvolving },
    { 'jumping': isJumping }
  );
  
  const initialTransform = `translateY(${135 - y}px)`;

  return <div ref={ref} className={classes} style={{ transform: initialTransform }}></div>;
});

Dinosaur.displayName = 'Dinosaur';

export default Dinosaur;
