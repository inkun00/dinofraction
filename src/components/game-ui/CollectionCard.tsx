import React from 'react';
import type { CollectedDinosaur } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Gem, ShieldCheck, CheckSquare, Sparkles, Star } from 'lucide-react';

interface CollectionCardProps {
  dino: CollectedDinosaur;
  isEquipped: boolean;
  onEquip: (id: string) => void;
}

const effectMap = {
  SCORE_BONUS: { text: '문제당 +1점', icon: <Sparkles className="w-3 h-3" /> },
  TIME_BONUS: { text: '게임 시간 +30초', icon: <ShieldCheck className="w-3 h-3" /> },
  LIFE_BONUS: { text: '생명 +1', icon: <Star className="w-3 h-3" /> },
  XP_BONUS: { text: '문제당 경험치 +0.1', icon: <Gem className="w-3 h-3" /> },
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
        {isEquipped && <CheckSquare className="w-5 h-5 text-white bg-green-500 rounded-full p-0.5" />}
      </div>
      <div className="absolute bottom-0 w-full bg-black bg-opacity-50 text-white p-1 rounded-b-lg">
        <p className={cn('font-bold text-sm truncate', dino.isRare ? 'text-yellow-300' : 'text-white')}>
          {dino.name}
        </p>
        <div className="text-xs space-y-0.5">
          {dino.effects.map((effect, i) => (
            <div key={i} className="flex items-center justify-center gap-1">
              {effectMap[effect]?.icon}
              <span>{effectMap[effect]?.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollectionCard;
