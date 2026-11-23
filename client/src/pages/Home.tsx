import React from 'react';
import { Link } from 'react-router-dom';
import RiveScene from '../components/RiveScene';

const games = [
  { code: '01', icon: 'A Z', name: 'Le mot le plus long',
    text: 'Composez le mot le plus long avec dix lettres tirées au sort.',
    to: '/letter-round', tag: 'LETTRES' },
  { code: '02', icon: '123', name: 'Le compte est bon',
    text: 'Combinez six nombres pour vous approcher du nombre cible.',
    to: '/number-round', tag: 'CHIFFRES' },
  { code: '03', icon: 'VS', name: 'Les duels',
    text: 'Une épreuve de rapidité où chaque seconde compte.',
    to: '/duel', tag: 'DÉFI' },
  { code: '04', icon: '★', name: 'Les mots de la fin',
    text: 'L’ultime épreuve pour les amateurs de lettres.',
    to: '/final-words', tag: 'FINALE' },
];

const Home: React.FC = () => (
  <div className="home-page">
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><span className="status-dot" /> LE GRAND JEU DES MOTS ET DES NOMBRES</p>
        <h1 className="hero-title">
          <span>DES <em>CHIFFRES</em></span>
          <span className="hero-title-mid">ET DES</span>
          <span><em>LETTRES</em><b>.</b></span>
        </h1>
        <p className="hero-lead">
          Retrouvez le plaisir du célèbre jeu de réflexion.
          Dix lettres, six nombres, une seule mission : trouver la bonne réponse.
        </p>
        <div className="hero-actions">
          <Link to="/match" className="button button--primary">Jouer une partie <span aria-hidden="true">→</span></Link>
          <Link to="/letter-round" className="button button--outline">Jouer avec les lettres</Link>
        </div>
        <div className="hero-footnote"><span className="hero-line" /> MODE SOLO : SIX ÉPREUVES · DIRECTEMENT DANS VOTRE NAVIGATEUR</div>
      </div>
      <div className="hero-art"><RiveScene cue="intro" /></div>
    </section>

    <section className="game-selection" aria-labelledby="games-title">
      <div className="section-heading">
        <div><p className="eyebrow">QUATRE FAÇONS DE JOUER</p><h2 id="games-title">Choisissez votre épreuve</h2></div>
        <span className="section-counter">01 — 04</span>
      </div>
      <div className="game-grid">
        {games.map(game => (
          <Link className="mode-card" key={game.code} to={game.to}>
            <span className="card-overline"><span>{game.code} / ÉPREUVE</span><span>{game.tag}</span></span>
            <span className="mode-icon">{game.icon}</span>
            <strong>{game.name}</strong>
            <span className="mode-description">{game.text}</span>
            <span className="card-bottom">JOUER <span aria-hidden="true">↗</span></span>
          </Link>
        ))}
      </div>
    </section>
  </div>
);
export default Home;
