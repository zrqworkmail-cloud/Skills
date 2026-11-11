import React from 'react';
import {Composition} from 'remotion';
import {Scene} from './Scene';
import {PelicanBicycle} from './PelicanBicycle';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Example"
      component={Scene}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={90}
    />
    <Composition
      id="PelicanBicycle"
      component={PelicanBicycle}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={90}
    />
  </>
);
