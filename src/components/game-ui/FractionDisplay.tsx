import React from 'react';
import type { Fraction } from '@/lib/types';

interface FractionDisplayProps {
  fraction: Fraction;
}

const FractionDisplay: React.FC<FractionDisplayProps> = ({ fraction }) => {
  const { whole, numerator, denominator } = fraction;

  if (numerator === 0 && whole === 0) {
    return <span>0</span>;
  }
  if (numerator === 0 && whole > 0) {
    return <span>{whole}</span>;
  }

  return (
    <div className="fraction-display">
      {whole > 0 && <span className="fraction-whole">{whole}</span>}
      {numerator > 0 && (
        <div className="fraction-part">
          <span className="fraction-numerator">{numerator}</span>
          <div className="fraction-line" style={{width: `${Math.max(String(numerator).length, String(denominator).length)}em`}}></div>
          <span className="fraction-denominator">{denominator}</span>
        </div>
      )}
    </div>
  );
};

export default FractionDisplay;
