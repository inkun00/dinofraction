import React from 'react';
import type { CollectedDinosaur, DinoSpecialEffect } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Gem, ShieldCheck, Timer, ArrowUp, Star, PlusCircle } from 'lucide-react';

interface CollectionCardProps {
  dino: CollectedDinosaur;
  isEquipped: boolean;
  onEquip: (id: string) => void;
}

const effectMap = {
  SCORE: { text: (val: number) => `문제당 +${val}점`, icon: <PlusCircle className="w-3 h-3" /> },
  TIME: { text: (val: number) => `게임 시간 +${val}초`, icon: <Timer className="w-3 h-3" /> },
  LIFE: { text: (val: number) => `생명 +${val}`, icon: <Star className="w-3 h-3" /> },
  JUMP: { text: (val: number) => `점프력 +${val}%`, icon: <ArrowUp className="w-3 h-3" /> },
  XP: { text: (val: number) => `경험치 +${val}`, icon: <Gem className="w-3 h-3" /> },
};


const CollectionCard: React.FC<CollectionCardProps> = ({ dino, isEquipped, onEquip }) => {
  const handleCardClick = () => {
    onEquip(dino.id);
  };

  return (
    <div
      className={cn(
        'collection-card',
        isEquipped ? 'equipped-card' : 'border-blue-400',
        'relative flex flex-col items-center justify-end p-1 text-center cursor-pointer'
      )}
      onClick={handleCardClick}
    >
      <img src={dino.imageUrl} alt={dino.name} className="collection-card-image" />
      <div className="absolute top-1 right-1">
        {isEquipped && <ShieldCheck className="w-5 h-5 text-white bg-green-500 rounded-full p-0.5" />}
      </div>
      <div className="absolute bottom-0 w-full bg-black bg-opacity-50 text-white p-1 rounded-b-lg">
        <p className={cn('font-bold text-sm truncate', dino.isRare ? 'text-yellow-300' : 'text-white')}>
          {dino.name}
        </p>
        <div className="text-xs space-y-0.5">
          {(dino.effects ?? []).map((effect, i) => {
            const effectInfo = effectMap[effect.type];
            return (
              <div key={i} className="flex items-center justify-center gap-1">
                {effectInfo?.icon}
                <span>{effectInfo?.text(effect.value)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default CollectionCard;
