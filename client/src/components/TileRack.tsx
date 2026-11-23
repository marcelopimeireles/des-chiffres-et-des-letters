import React from 'react';

interface TileRackProps {
  tiles: Array<string | number>;
  variant?: 'letters' | 'numbers';
  label?: string;
  totalSlots?: number;
  revealedCount?: number;
}

const TileRack: React.FC<TileRackProps> = ({
  tiles, variant = 'letters', label, totalSlots = tiles.length, revealedCount = tiles.length
}) => (
  <div className={`tile-rack tile-rack--${variant}`} role="group"
    aria-label={label || (variant === 'letters' ? 'Lettres tirées' : 'Nombres tirés')}>
    {Array.from({ length: totalSlots }, (_, index) => {
      const revealed = index < revealedCount && index < tiles.length;
      return (
        <span key={index}
          className={`game-tile ${revealed ? '' : 'game-tile--placeholder'}`}
          style={revealed ? { animationDelay: `${index * 70}ms` } : undefined}
          aria-label={revealed ? String(tiles[index]) : 'À tirer'}>
          {revealed ? tiles[index] : '·'}
        </span>
      );
    })}
  </div>
);

export default TileRack;
