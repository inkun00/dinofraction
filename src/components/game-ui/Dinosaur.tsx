
import React from 'react';
import { cn } from '@/lib/utils';
import type { EvolutionStage } from '@/lib/types';

interface DinosaurProps {
  evolution: EvolutionStage;
  y: number;
  evolving: boolean;
  godDinoImage: string | null;
}

const Dinosaur = React.forwardRef<HTMLDivElement, DinosaurProps>(({ evolution, y, evolving, godDinoImage }, ref) => {
  const isJumping = y > 135;
  const isGodEvolving = evolving && evolution === 'god';

  const classes = cn(
    'dinosaur',
    evolution,
    { 'evolving': evolving && !isGodEvolving },
    { 'god-evolving': isGodEvolving },
    { 'jumping': isJumping && evolution !== 'god' }
  );
  
  const style: React.CSSProperties = {
    transform: `translateY(${-(y - 135)}px)`,
  };

  if (evolution === 'god' && godDinoImage) {
    style.backgroundImage = `url(${godDinoImage})`;
  }

  return <div ref={ref} className={classes} style={style}></div>;
});

Dinosaur.displayName = 'Dinosaur';

export default Dinosaur;
