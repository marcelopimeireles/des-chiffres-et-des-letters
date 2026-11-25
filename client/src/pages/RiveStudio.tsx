import React from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import RiveGameBoard, { BoardAction } from '../components/RiveGameBoard';
import RiveRound from './RiveRound';
import SoloMatch from './SoloMatch';

const StudioMenu: React.FC = () => {
  const navigate = useNavigate();
  const destinations: Partial<Record<BoardAction, string>> = {
    primary: 'match',
    secondary: 'letters',
    backspace: 'numbers',
    auxiliary: 'duel',
    refresh: 'final'
  };

  return <RiveGameBoard
    text={{
      heading: 'Des chiffres et des lettres',
      progress: 'STUDIO',
      caption: 'Jouez une partie complète ou choisissez une épreuve.',
      clock: '—',
      score: '—',
      answer: '',
      feedback: '',
      primaryLabel: 'Partie solo',
      secondaryLabel: 'Les lettres',
      backspaceLabel: 'Les chiffres',
      auxiliaryLabel: 'Duels',
      refreshLabel: 'La finale',
      resetLabel: ''
    }}
    tiles={['7', 'D', 'E', 'S', '25', 'L', 'E', 'T', 'R', '3']}
    keyboardVisible={false}
    onAction={action => {
      const destination = destinations[action];
      if (destination) navigate(destination);
    }}
    onKey={() => {}}
  />;
};

const RiveStudio: React.FC = () => (
  <main className="rive-studio">
    <Routes>
      <Route index element={<StudioMenu />} />
      <Route path="match" element={<SoloMatch presentation="rive" />} />
      <Route path="letters" element={<RiveRound key="letters" mode="letters" />} />
      <Route path="numbers" element={<RiveRound key="numbers" mode="numbers" />} />
      <Route path="duel" element={<RiveRound key="duel" mode="duel" />} />
      <Route path="final" element={<RiveRound key="final" mode="final" />} />
      <Route path="*" element={<StudioMenu />} />
    </Routes>
  </main>
);

export default RiveStudio;
