import React from 'react';
import { Box, Flex, Icon, Text, useColorModeValue } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { HiSparkles } from 'react-icons/hi';

// The "AI is working" cue used wherever Pulsar AI is waiting on a reply: a sparkle that
// breathes and turns, next to a label with a highlight sweeping across it. Both animations
// stop for people who ask for reduced motion.

const breathe = keyframes`
  0%, 100% { transform: scale(0.85) rotate(0deg); opacity: 0.7; }
  50% { transform: scale(1.15) rotate(18deg); opacity: 1; }
`;

const shimmer = keyframes`
  from { background-position: 150% 0; }
  to { background-position: -50% 0; }
`;

interface ThinkingIndicatorProps {
  /** Labels to show, cycled every few seconds so a long wait still reads as progress. */
  labels?: string[];
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { icon: 4, font: 'sm', gap: 1.5 },
  md: { icon: 5, font: 'md', gap: 2 },
  lg: { icon: 7, font: 'lg', gap: 2.5 },
} as const;

const LABEL_INTERVAL_MS = 2800;

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ labels = ['Thinking'], size = 'sm' }) => {
  const [labelIndex, setLabelIndex] = React.useState(0);
  const base = useColorModeValue('#6B7280', '#A0AEC0');
  const highlight = useColorModeValue('#0BC5EA', '#76E4F7');
  const { icon, font, gap } = SIZES[size];

  React.useEffect(() => {
    if (labels.length < 2) return;
    const id = setInterval(() => setLabelIndex(i => Math.min(i + 1, labels.length - 1)), LABEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [labels.length]);

  return (
    <Flex align="center" gap={gap} role="status" aria-live="polite" data-testid="ai-thinking">
      <Box
        as="span"
        display="inline-flex"
        animation={`${breathe} 1.6s ease-in-out infinite`}
        sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
      >
        <Icon as={HiSparkles} boxSize={icon} color="cyan.400" />
      </Box>
      <Text
        as="span"
        fontSize={font}
        fontWeight="medium"
        bgGradient={`linear(to-r, ${base} 35%, ${highlight} 50%, ${base} 65%)`}
        bgSize="200% 100%"
        bgClip="text"
        color="transparent"
        animation={`${shimmer} 2s linear infinite`}
        sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none', color: base } }}
      >
        {labels[labelIndex]}...
      </Text>
    </Flex>
  );
};

export default ThinkingIndicator;
