import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { Workout } from '../models/types';
import { isPerfectWorkout } from '../utils/historyStats';

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WeeklyActivityGraphProps {
  workouts: Workout[]; // already scoped to whatever this graph should represent (one routine, or all)
  title?: string;
}

// Stacked bar chart of started/completed/perfect workouts by day of week.
const WeeklyActivityGraph: React.FC<WeeklyActivityGraphProps> = ({ workouts, title = 'Weekly Activity' }) => {
  const data = WEEK_DAYS.map(day => {
    const dayWorkouts = workouts.filter(w => {
      const d = new Date(w.startedAt);
      return d.toLocaleDateString('en-US', { weekday: 'long' }) === day;
    });
    const started = dayWorkouts.length;
    const completed = dayWorkouts.filter(w => w.completedAt).length;
    const perfect = dayWorkouts.filter(isPerfectWorkout).length;
    return { day, started, completed, perfect };
  });
  // SVG bar chart dimensions
  const width = 320;
  const height = 100;
  const barWidth = 28;
  const maxY = Math.max(1, ...data.map(d => d.started));
  return (
    <Box>
      <Text fontWeight="bold" fontSize="md" mb={2}>{title}</Text>
      <Box as="svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block', maxWidth: '100%' }}>
        {data.map((d, i) => {
          const x = i * (barWidth + 8) + 16;
          // True stacking: started (bottom), completed (middle), perfect (top)
          const startedOnly = d.started - d.completed;
          const completedOnly = d.completed - d.perfect;
          const perfectOnly = d.perfect;
          // Heights with 1px gap between segments
          const gap = 1;
          const startedHeight = startedOnly > 0 ? (startedOnly / maxY) * 70 : 0;
          const completedHeight = completedOnly > 0 ? (completedOnly / maxY) * 70 : 0;
          const perfectHeight = perfectOnly > 0 ? (perfectOnly / maxY) * 70 : 0;
          // Y positions: stack from bottom up, add gap between segments
          let y = height - 16;
          // Start from bottom and draw in order: started, completed, perfect
          y -= startedHeight;
          const yStarted = y;
          y -= completedHeight > 0 && startedHeight > 0 ? gap : 0;
          y -= completedHeight;
          const yCompleted = y;
          y -= perfectHeight > 0 && (completedHeight > 0 || startedHeight > 0) ? gap : 0;
          y -= perfectHeight;
          const yPerfect = y;
          return (
            <g key={d.day}>
              {/* Started only (bottom) */}
              {startedOnly > 0 && (
                <rect x={x} y={yStarted} width={barWidth} height={startedHeight} fill="#06b6d4" rx={4} />
              )}
              {/* Completed only (middle) */}
              {completedOnly > 0 && (
                <rect x={x} y={yCompleted} width={barWidth} height={completedHeight} fill="#22c55e" rx={4} />
              )}
              {/* Perfect only (top) */}
              {perfectOnly > 0 && (
                <rect x={x} y={yPerfect} width={barWidth} height={perfectHeight} fill="#facc15" rx={4} />
              )}
              {/* Day label */}
              <text x={x + barWidth / 2} y={height - 2} textAnchor="middle" fontSize="10" fill="#64748b">{d.day[0]}</text>
            </g>
          );
        })}
      </Box>
      <Flex gap={3} mt={1} fontSize="xs" color="gray.500">
        <Flex align="center" gap={1}><Box w={3} h={3} bg="#06b6d4" borderRadius={2} /> Started</Flex>
        <Flex align="center" gap={1}><Box w={3} h={3} bg="#22c55e" borderRadius={2} /> Completed</Flex>
        <Flex align="center" gap={1}><Box w={3} h={3} bg="#facc15" borderRadius={2} /> Perfect</Flex>
      </Flex>
    </Box>
  );
};

export default React.memo(WeeklyActivityGraph);
