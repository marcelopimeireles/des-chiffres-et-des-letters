import React from 'react';
import './Home.scss';

const Home: React.FC = () => {

  return (
    <a href="/letter-round" className="btn" target="_blank">
        <span className="btn__inner">
          <span className="btn__label" data-label="Get ready" data-hover="Go!💪">
              Get in touch
              <span className="btn__label__background"></span>
          </span>
      </span><span className="btn__background"></span>
      </a>
  );
};

export default Home;
