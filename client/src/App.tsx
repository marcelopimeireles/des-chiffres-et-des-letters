import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import store from './redux/store';
import NumberRound from './components/NumberRound';
import LetterRound from './components/LetterRound';
import Duel from './components/Duel';
import FinalWords from './components/FinalWords';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <h1>Des chiffres et des lettres</h1>
          <Routes>
            <Route path="/" element={<h2>Home Page</h2>} />
            <Route path="/number-round" element={<NumberRound targetNumber={0} numbers={[]} />} />
            <Route path="/letter-round" element={<LetterRound />} />
            <Route path="/duel" element={<Duel type={''} challenge={''} answer={''} />} />
            <Route path="/final-words" element={<FinalWords wordSets={[]} />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
};

export default App;