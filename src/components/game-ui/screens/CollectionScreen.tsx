import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import CollectionCard from '../CollectionCard';
import type { UserData } from '@/lib/types';

interface CollectionScreenProps {
  userData: UserData;
  onClose: () => void;
  onEquipDinosaur: (dinoId: string | null) => void;
}

const CollectionScreen: React.FC<CollectionScreenProps> = ({ userData, onClose, onEquipDinosaur }) => {
  const collectedDinos = userData.collectedDinosaurs || [];
  
  return (
    <div className="collection-screen" style={{ display: 'flex' }}>
      <div className="collection-content">
        <h2 className="collection-title">🦖 수집한 공룡 도감</h2>
        <p className="text-center -mt-4 mb-4 text-gray-600">공룡을 클릭하여 장착하고 특별한 효과를 받아보세요!</p>
        
        {collectedDinos.length > 0 ? (
          <div className="collection-grid custom-scrollbar">
            {collectedDinos.map((dino) => (
              <CollectionCard 
                key={dino.id} 
                dino={dino}
                isEquipped={userData.equippedDinosaurId === dino.id}
                onEquip={onEquipDinosaur}
              />
            ))}
          </div>
        ) : (
          <div className="collection-placeholder">
            아직 수집한 공룡이 없습니다. <br/>
            게임에서 500점을 넘어 멋진 공룡을 수집해보세요!
          </div>
        )}

        <div className="analysis-buttons mt-6">
          <Button onClick={onClose} className="restart-btn close">
            <X className="mr-2 h-5 w-5" /> 닫기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CollectionScreen;
