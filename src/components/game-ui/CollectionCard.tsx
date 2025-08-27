import React from 'react';
import type { CollectedDinosaur } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Gem, ShieldCheck, Timer, ArrowUp, Star, PlusCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


interface CollectionCardProps {
  dino: CollectedDinosaur;
  isEquipped: boolean;
  onEquip: (id: string) => void;
}

const effectMap = {
  SCORE: { text: (val: number) => `+${val}점`, icon: <PlusCircle className="w-4 h-4" /> },
  TIME: { text: (val: number) => `+${val}초`, icon: <Timer className="w-4 h-4" /> },
  LIFE: { text: (val: number) => `+${val} 생명`, icon: <Star className="w-4 h-4" /> },
  JUMP: { text: (val: number) => `+${val}% 점프`, icon: <ArrowUp className="w-4 h-4" /> },
  XP: { text: (val: number) => `+${val} XP`, icon: <Gem className="w-4 h-4" /> },
};


const CollectionCard: React.FC<CollectionCardProps> = ({ dino, isEquipped, onEquip }) => {
  const handleCardClick = () => {
    onEquip(dino.id);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <div
          className={cn(
            'collection-card',
            isEquipped ? 'equipped-card' : 'border-blue-400',
            'relative flex flex-col items-center justify-start p-1 text-center cursor-pointer'
          )}
          onClick={handleCardClick}
        >
          <TooltipTrigger asChild>
            <img src={dino.imageUrl} alt={dino.name} className="collection-card-image" />
          </TooltipTrigger>
          <div className="absolute top-1 right-1">
            {isEquipped && <ShieldCheck className="w-5 h-5 text-white bg-green-500 rounded-full p-0.5" />}
          </div>
          <div className="w-full bg-black bg-opacity-50 p-2 rounded-b-lg mt-auto flex items-center justify-center min-h-[50px]">
            <p className={cn('font-bold text-sm text-center', dino.isRare ? 'text-yellow-300' : 'text-white')}>
              {dino.name}
            </p>
          </div>
        </div>
        <TooltipContent className="bg-gray-800 text-white border-gray-700">
          <div className="p-2">
            <h3 className={cn("font-bold text-lg mb-2", dino.isRare ? 'text-yellow-300' : 'text-white')}>{dino.name}</h3>
            <ul className="space-y-1 text-left">
              {(dino.effects ?? []).map((effect, index) => (
                <li key={index} className="flex items-center gap-2">
                  {effectMap[effect.type]?.icon}
                  <span>{effectMap[effect.type]?.text(effect.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CollectionCard;
