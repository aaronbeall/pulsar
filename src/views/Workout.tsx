import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { WorkoutSetup } from './WorkoutSetup';
import { WorkoutLanding } from './WorkoutLanding';
import { WorkoutSession } from './WorkoutSession';

const Workout: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<WorkoutLanding />} />
      <Route path="setup" element={<WorkoutSetup />} />
      <Route path="session/:routineId" element={<WorkoutSession routineId="" />} />
    </Routes>
  );
};

export default Workout;
