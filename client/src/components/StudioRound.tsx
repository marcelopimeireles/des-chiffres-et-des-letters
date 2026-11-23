import React from 'react';
import { Link } from 'react-router-dom';
import RiveScene from './RiveScene';

interface StudioRoundProps {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  animationCue?: 'intro' | 'draw' | 'success';
  animationRevision?: number;
}

const StudioRound: React.FC<StudioRoundProps> = ({ number, title, description, children, aside, animationCue = 'draw', animationRevision = 0 }) => (
  <div className="round-page">
    <div className="round-topline">
      <Link to="/" className="back-link">← Retour au studio</Link>
      <span className="eyebrow">ÉPREUVE {number} / LE JEU</span>
    </div>
    <div className="round-intro">
      <div>
        <p className="eyebrow">À VOUS DE JOUER</p>
        <h1>{title}</h1>
        <p className="round-description">{description}</p>
      </div>
      {process.env.REACT_APP_RIVE_STUDIO_SRC
        ? <div className="round-rive-badge"><RiveScene cue={animationCue} revision={animationRevision} compact /></div>
        : <span className="round-emblem" aria-hidden="true">{number}</span>}
    </div>
    <section className="game-console" aria-label={title}>
      <div className="console-heading">
        <span><span className="status-dot" /> TABLEAU DE JEU</span>
        <span>DES CHIFFRES ET DES LETTRES</span>
      </div>
      <div className="console-content">
        <div className="console-game">{children}</div>
        {aside && <aside className="console-aside">{aside}</aside>}
      </div>
    </section>
  </div>
);

export default StudioRound;
