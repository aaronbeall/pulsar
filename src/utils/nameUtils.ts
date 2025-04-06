const adjectives = [
  'Mighty', 'Swift', 'Fierce', 'Epic', 'Power', 'Beast', 'Strong',
  'Cosmic', 'Thunder', 'Lightning', 'Iron', 'Steel', 'Dynamic'
];

const nouns = [
  'Warrior', 'Session', 'Challenge', 'Crusher', 'Force', 'Legend',
  'Champion', 'Beast', 'Tiger', 'Lion', 'Dragon', 'Phoenix'
];

export const generateRandomName = (): string => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
};
