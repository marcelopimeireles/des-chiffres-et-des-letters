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
import { UiLanguageContext, UiLanguage, UI_LOCALES, baseLanguage, isUiLanguage } from './i18n';

const navigation = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/match', label: 'Partie solo' },
  { to: '/letter-round', label: 'Les lettres' },
  { to: '/number-round', label: 'Les chiffres' },
  { to: '/duel', label: 'Duels' },
  { to: '/final-words', label: 'La finale' },
];

const RiveStudio = React.lazy(() => import('./pages/RiveStudio'));

const labels = {
  fr: ['Accueil','Partie solo','Les lettres','Les chiffres','Duels','La finale','ÉDITION WEB','Un jeu de lettres, de chiffres et de réflexion.','Langue de l’interface'],
  en: ['Home','Solo match','Letters','Numbers','Duels','Final','WEB EDITION','A game of letters, numbers and thinking.','Interface language'],
  pt: ['Início','Partida individual','Letras','Números','Duelos','Final','EDIÇÃO WEB','Um jogo de letras, números e raciocínio.','Idioma da interface']
};
const ClassicApp: React.FC<{language: UiLanguage; setLanguage: (value: UiLanguage) => void}> = ({language, setLanguage}) => {
  const t = labels[baseLanguage(language)];
  return (
  <div className="show-app">
    <header className="site-header">
      <NavLink to="/" className="brand" aria-label="Des chiffres et des lettres — accueil">
        <span className="brand-mark">C<span>&</span>L</span>
        <span className="brand-name">DES CHIFFRES <small>ET DES</small> LETTRES</span>
      </NavLink>
      <nav className="main-nav" aria-label="Navigation principale">
        {navigation.map(({ to, end }, index) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            {t[index]}
          </NavLink>
        ))}
      </nav>
      <label style={{display:'flex',alignItems:'center',gap:8}}>
        <span>{t[8]}</span>
        <select value={language} onChange={e => setLanguage(e.target.value as UiLanguage)}>
          {(Object.keys(UI_LOCALES) as UiLanguage[]).map(locale => <option key={locale} value={locale}>{UI_LOCALES[locale]}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <span className="site-edition"><span className="status-dot" /> {t[6]}</span>
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
      <span>{t[7]}</span>
    </footer>
  </div>
  );
};

const App: React.FC = () => {
  const [language, setLanguage] = React.useState<UiLanguage>(() => {
    const saved = localStorage.getItem('ui-language')?.split('-')[0] ?? null;
    return isUiLanguage(saved) ? saved : 'fr';
  });
  React.useEffect(() => {
    localStorage.setItem('ui-language', language);
    document.documentElement.lang = language;
  }, [language]);
  return (
  <UiLanguageContext.Provider value={language}>
  <Provider store={store}>
    <BrowserRouter>
      <Routes>
        <Route path="/rive/*" element={
          <React.Suspense fallback={<p role="status">Chargement du studio…</p>}>
            <RiveStudio />
          </React.Suspense>
        } />
        <Route path="*" element={<ClassicApp language={language} setLanguage={setLanguage} />} />
      </Routes>
    </BrowserRouter>
  </Provider>
  </UiLanguageContext.Provider>
  );
};

export default App;
