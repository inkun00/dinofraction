import React from 'react';
import type { CollectedDinosaur } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Gem, ShieldCheck, Timer, ArrowUp, Star, PlusCircle } from 'lucide-react';

interface CollectionCardProps {
  dino: CollectedDinosaur;
  isEquipped: boolean;
  onEquip: (id: string) => void;
}

const effectMap = {
  SCORE: { text: (val: number) => `+${val}점`, icon: <PlusCircle className="w-3 h-3" /> },
  TIME: { text: (val: number) => `+${val}초`, icon: <Timer className="w-3 h-3" /> },
  LIFE: { text: (val: number) => `+${val} 생명`, icon: <Star className="w-3 h-3" /> },
  JUMP: { text: (val: number) => `+${val}% 점프`, icon: <ArrowUp className="w-3 h-3" /> },
  XP: { text: (val: number) => `+${val} XP`, icon: <Gem className="w-3 h-3" /> },
};


const CollectionCard: React.FC<CollectionCardProps> = ({ dino, isEquipped, onEquip }) => {
  const handleCardClick = () => {
    onEquip(dino.id);
  };

  const effectsText = (dino.effects ?? [])
    .map(effect => effectMap[effect.type]?.text(effect.value))
    .join(', ');

  const displayText = `${dino.name}${effectsText ? `(${effectsText})` : ''}`;

  return (
    <div
      className={cn(
        'collection-card',
        isEquipped ? 'equipped-card' : 'border-blue-400',
        'relative flex flex-col items-center justify-start p-1 text-center cursor-pointer'
      )}
      onClick={handleCardClick}
    >
      <img src={dino.imageUrl} alt={dino.name} className="collection-card-image" />
      <div className="absolute top-1 right-1">
        {isEquipped && <ShieldCheck className="w-5 h-5 text-white bg-green-500 rounded-full p-0.5" />}
      </div>
      <div className="w-full bg-black bg-opacity-50 p-2 rounded-b-lg mt-auto flex items-center justify-center text-white min-h-[60px]">
        <p className={cn('font-bold text-sm text-center', dino.isRare ? 'text-yellow-300' : 'text-white')}>
          {displayText}
        </p>
      </div>
    </div>
  );
};

export default CollectionCard;
