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
      <div className="w-full bg-black bg-opacity-50 p-2 rounded-b-lg mt-auto flex items-start justify-between text-white min-h-[60px]">
        {/* Left side for Name */}
        <div className="w-1/2 pr-2 flex flex-col justify-center items-center h-full">
          <p className={cn('font-bold text-sm text-center', dino.isRare ? 'text-yellow-300' : 'text-white')}>
            {dino.name}
          </p>
        </div>
        {/* Right side for Effects */}
        <div className="w-1/2 pl-2 border-l border-gray-400 flex flex-col justify-center h-full">
          <div className="text-xs space-y-0.5">
            {(dino.effects ?? []).map((effect, i) => {
              const effectInfo = effectMap[effect.type];
              return (
                <div key={i} className="flex items-center gap-1">
                  {effectInfo?.icon}
                  <span>{effectInfo?.text(effect.value)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionCard;