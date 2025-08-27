import React from 'react';

interface CollectionCardProps {
  imageUrl: string;
}

const CollectionCard: React.FC<CollectionCardProps> = ({ imageUrl }) => {
  return (
    <div className="collection-card">
      <img src={imageUrl} alt="Collected Dinosaur" className="collection-card-image" />
    </div>
  );
};

export default CollectionCard;
