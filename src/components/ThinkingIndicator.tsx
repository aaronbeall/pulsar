import React, { useEffect, useState } from 'react';
import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

// The "AI is working" cue used wherever Pulsar AI is waiting on a reply: three dots hopping
// in turn, next to a label with a highlight sweeping across it. Both animations stop for
// people who ask for reduced motion.

const hop = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.55; }
  30% { transform: translateY(-70%); opacity: 1; }
`;

const shimmer = keyframes`
  from { background-position: 150% 0; }
  to { background-position: -50% 0; }
`;

interface ThinkingIndicatorProps {
  /** Labels to show, stepped through every few seconds so a long wait still reads as progress. */
  labels?: string[];
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { dot: '6px', font: 'sm', gap: 2 },
  md: { dot: '8px', font: 'md', gap: 2.5 },
  lg: { dot: '10px', font: 'lg', gap: 3 },
} as const;

const LABEL_INTERVAL_MS = 2800;
const DOT_COLORS = ['cyan.400', 'teal.400', 'purple.400'];

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ labels = ['Thinking'], size = 'sm' }) => {
  const [labelIndex, setLabelIndex] = useState(0);
  const base = useColorModeValue('#6B7280', '#A0AEC0');
  const highlight = useColorModeValue('#0BC5EA', '#76E4F7');
  const { dot, font, gap } = SIZES[size];
  const labelKey = labels.join('|');

  // A new set of labels (a new phase) starts from its first label.
  useEffect(() => {
    setLabelIndex(0);
    if (labels.length < 2) return;
    const id = setInterval(() => setLabelIndex(i => Math.min(i + 1, labels.length - 1)), LABEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [labelKey]);

  return (
    <Flex align="center" gap={gap} role="status" aria-live="polite" data-testid="ai-thinking">
      <Flex align="flex-end" gap={`calc(${dot} * 0.6)`} h={`calc(${dot} * 2.4)`} aria-hidden>
        {DOT_COLORS.map((color, i) => (
          <Box
            key={color}
            w={dot}
            h={dot}
            borderRadius="full"
            bg={color}
            animation={`${hop} 1.1s ease-in-out ${i * 0.16}s infinite`}
            sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
          />
        ))}
      </Flex>
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
        {labels[Math.min(labelIndex, labels.length - 1)]}...
      </Text>
    </Flex>
  );
};

export default ThinkingIndicator;
