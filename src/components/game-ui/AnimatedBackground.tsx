import React from 'react';

const AnimatedBackground = () => {
  return (
    <>
      <div className="clouds"></div>
      <div className="trees">
        <div className="tree">🌳</div><div className="tree">🌲</div><div className="tree">🌳</div><div className="tree">🌲</div>
        <div className="tree">🌳</div><div className="tree">🌲</div><div className="tree">🌳</div><div className="tree">🌲</div>
      </div>
      <div className="grass-layer"></div>
      <div className="ground"></div>
    </>
  );
};

export default AnimatedBackground;
