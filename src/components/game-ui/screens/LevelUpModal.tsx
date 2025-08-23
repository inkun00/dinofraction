import React from 'react';
import { Button } from '@/components/ui/button';

interface LevelUpModalProps {
  oldLevel: number;
  newLevel: number;
  onClose: () => void;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ oldLevel, newLevel, onClose }) => {
  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content">
        <h2 className="analysis-title">🎉 레벨 업! 🎉</h2>
        <p className="text-2xl font-bold text-green-600">
          레벨 {oldLevel} ➡ {newLevel}
        </p>
        <Button onClick={onClose} className="restart-btn mt-4">확인</Button>
      </div>
    </div>
  );
};

export default LevelUpModal;
