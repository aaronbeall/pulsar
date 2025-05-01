const adjectives = [
  'Mighty', 'Swift', 'Fierce', 'Epic', 'Power', 'Beast', 'Strong',
  'Cosmic', 'Thunder', 'Lightning', 'Iron', 'Steel', 'Dynamic',
  'Savage', 'Ultimate', 'Primal', 'Relentless', 'Intense', 'Unstoppable',
  'Blazing', 'Raging', 'Focused', 'Peak', 'Maximum', 'Elite',
  'Explosive', 'Radical', 'Supreme', 'Extreme', 'Legendary',
  'Nuclear', 'Quantum', 'Mega', 'Ultra', 'Hyper', 'Super',
  'Alpha', 'Prime', 'Apex', 'Golden', 'Silver', 'Bronze',
  'Crystal', 'Diamond', 'Ruby', 'Mystic', 'Ancient', 'Eternal',
  'Rising', 'Burning', 'Frozen', 'Molten', 'Sacred', 'Divine',
  'Phantom', 'Shadow', 'Stealth', 'Silent', 'Rogue', 'Wild'
];

const nouns = [
  'Warrior', 'Session', 'Challenge', 'Crusher', 'Force', 'Legend',
  'Champion', 'Beast', 'Tiger', 'Lion', 'Dragon', 'Phoenix',
  'Titan', 'Machine', 'Monster', 'Master', 'Viking', 'Spartan',
  'Gladiator', 'Shark', 'Wolf', 'Eagle', 'Panther', 'Bear',
  'Athlete', 'Ninja', 'Samurai', 'Knight', 'Paladin', 'Ranger',
  'Hunter', 'Demon', 'Angel', 'Spirit', 'Ghost', 'Wraith',
  'Viper', 'Cobra', 'Falcon', 'Hawk', 'Rhino', 'Grizzly',
  'Phenom', 'Prodigy', 'Guru', 'Sensei', 'Sage', 'Oracle',
  'Nemesis', 'Avenger', 'Fury', 'Storm', 'Tempest', 'Inferno'
];

export const generateRandomName = (): string => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
};
