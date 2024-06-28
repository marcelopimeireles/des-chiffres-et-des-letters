import React from 'react';
import './ActionButton.scss';

type HomeProps = {
  label: string;
  hover: string;
  link: string
};

const ActionButton: React.FC<HomeProps> = (props) => {
  const { label, hover } = props;

  return (
    <a href="/letter-round" className="btn" target="_self">
        <span className="btn__inner">
          <span className="btn__label" data-label="Get ready" data-hover={hover}>
          {label}
              <span className="btn__label__background"></span>
          </span>
      </span><span className="btn__background"></span>
      </a>
  );
};

export default ActionButton;
