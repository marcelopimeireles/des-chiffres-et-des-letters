import React from 'react';
import { useTranslation } from '../i18n';
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

const StudioRound: React.FC<StudioRoundProps> = ({ number, title, description, children, aside, animationCue = 'draw', animationRevision = 0 }) => {
  const t = useTranslation();
  return (
  <div className="round-page">
    <div className="round-topline">
      <Link to="/" className="back-link">{t("← Retour au studio", "← Back to studio", "← Voltar ao estúdio")}</Link>
      <span className="eyebrow">{t("ÉPREUVE","ROUND","PROVA")} {number} / {t("LE JEU","THE GAME","O JOGO")}</span>
    </div>
    <div className="round-intro">
      <div>
        <p className="eyebrow">{t("À VOUS DE JOUER", "YOUR TURN", "É A SUA VEZ")}</p>
        <h1>{title}</h1>
        <p className="round-description">{description}</p>
      </div>
      {process.env.VITE_RIVE_STUDIO_SRC
        ? <div className="round-rive-badge"><RiveScene cue={animationCue} revision={animationRevision} compact /></div>
        : <span className="round-emblem" aria-hidden="true">{number}</span>}
    </div>
    <section className="game-console" aria-label={title}>
      <div className="console-heading">
        <span><span className="status-dot" /> {t("TABLEAU DE JEU", "GAME BOARD", "TABULEIRO DE JOGO")}</span>
        <span>DES CHIFFRES ET DES LETTRES</span>
      </div>
      <div className="console-content">
        <div className="console-game">{children}</div>
        {aside && <aside className="console-aside">{aside}</aside>}
      </div>
    </section>
  </div>
  );
};

export default StudioRound;
