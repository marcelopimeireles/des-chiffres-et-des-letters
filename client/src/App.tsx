import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import store from './redux/store';
import NumberRound from './pages/NumberRound';
import LetterRound from './pages/LetterRound';
import Duel from './pages/Duel';
import FinalWords from './pages/FinalWords';
import Home from './pages/Home';
import './App.css';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <h1 style={{ display: 'none' }}>Des chiffres et des lettres</h1>
          <Routes>
            <Route path="/" element={<Home/>} />
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