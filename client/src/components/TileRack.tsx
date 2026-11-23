import React from 'react';

interface TileRackProps {
  tiles: Array<string | number>;
  variant?: 'letters' | 'numbers';
  label?: string;
}

const TileRack: React.FC<TileRackProps> = ({ tiles, variant = 'letters', label }) => (
  <div className={`tile-rack tile-rack--${variant}`} role="group"
    aria-label={label || (variant === 'letters' ? 'Lettres tirées' : 'Nombres tirés')}>
    {tiles.map((tile, index) => (
      <span key={index} className="game-tile" style={{ animationDelay: `${index * 70}ms` }}>
        {tile}
      </span>
    ))}
  </div>
);

export default TileRack;
