
import React from 'react';
import { cn } from '@/lib/utils';
import type { EvolutionStage } from '@/lib/types';

interface DinosaurProps {
  evolution: EvolutionStage;
  y: number;
  evolving: boolean;
  isAttacking?: boolean;
  godDinoImage: string | null;
}

const Dinosaur = React.forwardRef<HTMLDivElement, DinosaurProps>(({ evolution, y, evolving, isAttacking = false, godDinoImage }, ref) => {
  const isJumping = y > 105;
  const isGodEvolving = evolving && evolution === 'god';

  const classes = cn(
    'dinosaur',
    evolution,
    { 'evolving': evolving && !isGodEvolving },
    { 'god-evolving': isGodEvolving },
    { 'attacking': isAttacking },
    { 'jumping': isJumping }
  );
  
  const containerStyle: React.CSSProperties = {
    transform: `translateY(${-(y - 105)}px)`,
  };

  const spriteStyle: React.CSSProperties = {};
  if (evolution === 'god' && godDinoImage) {
    spriteStyle.backgroundImage = `url(${godDinoImage})`;
    spriteStyle.backgroundSize = 'contain';
    spriteStyle.backgroundPosition = 'center';
    spriteStyle.animation = 'none';
  }

  return (
    <div ref={ref} className={classes} style={containerStyle}>
      <div className="dino-sprite" style={spriteStyle} />
    </div>
  );
});

Dinosaur.displayName = 'Dinosaur';

export default Dinosaur;

