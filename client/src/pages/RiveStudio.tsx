import { useTranslation } from '../i18n';
import React from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import RiveGameBoard, { BoardAction } from '../components/RiveGameBoard';
import RiveRound from './RiveRound';
import SoloMatch from './SoloMatch';

const StudioMenu: React.FC = () => {
  const t = useTranslation();
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
      caption: t("Jouez une partie complète ou choisissez une épreuve.", "Play a full match or choose a round.", "Jogue uma partida completa ou escolha uma prova."),
      clock: '—',
      score: '—',
      answer: '',
      feedback: '',
      primaryLabel: t("Partie solo", "Solo match", "Partida individual"),
      secondaryLabel: t("Les lettres", "Letters", "Letras"),
      backspaceLabel: t("Les chiffres", "Numbers", "Números"),
      auxiliaryLabel: t("Duels", "Duels", "Duelos"),
      refreshLabel: t("La finale", "Final", "Final"),
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
