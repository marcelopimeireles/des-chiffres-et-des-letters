import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import store from './redux/store';
import Home from './pages/Home';
import SoloMatch from './pages/SoloMatch';
import NumberRound from './pages/NumberRound';
import LetterRound from './pages/LetterRound';
import Duel from './pages/Duel';
import FinalWords from './pages/FinalWords';
import './App.css';

const navigation = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/match', label: 'Partie solo' },
  { to: '/letter-round', label: 'Les lettres' },
  { to: '/number-round', label: 'Les chiffres' },
  { to: '/duel', label: 'Duels' },
  { to: '/final-words', label: 'La finale' },
];

const App: React.FC = () => (
  <Provider store={store}>
    <BrowserRouter>
      <div className="show-app">
        <header className="site-header">
          <NavLink to="/" className="brand" aria-label="Des chiffres et des lettres — accueil">
            <span className="brand-mark">C<span>&</span>L</span>
            <span className="brand-name">DES CHIFFRES <small>ET DES</small> LETTRES</span>
          </NavLink>
          <nav className="main-nav" aria-label="Navigation principale">
            {navigation.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                {label}
              </NavLink>
            ))}
          </nav>
          <span className="site-edition"><span className="status-dot" /> ÉDITION WEB</span>
        </header>
        <main className="site-main" id="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/match" element={<SoloMatch />} />
            <Route path="/letter-round" element={<LetterRound />} />
            <Route path="/number-round" element={<NumberRound />} />
            <Route path="/duel" element={<Duel />} />
            <Route path="/final-words" element={<FinalWords />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <footer className="site-footer">
          <span>DES CHIFFRES ET DES LETTRES · VERSION WEB</span>
          <span>Un jeu de lettres, de chiffres et de réflexion.</span>
        </footer>
      </div>
    </BrowserRouter>
  </Provider>
);

export default App;
