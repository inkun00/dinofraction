import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import CollectionCard from '../CollectionCard';

interface CollectionScreenProps {
  collectedDinos: string[];
  onClose: () => void;
}

const CollectionScreen: React.FC<CollectionScreenProps> = ({ collectedDinos, onClose }) => {
  return (
    <div className="collection-screen" style={{ display: 'flex' }}>
      <div className="collection-content">
        <h2 className="collection-title">🦖 수집한 공룡 도감</h2>
        
        {collectedDinos.length > 0 ? (
          <div className="collection-grid custom-scrollbar">
            {collectedDinos.map((dinoUrl, index) => (
              <CollectionCard key={index} imageUrl={dinoUrl} />
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
