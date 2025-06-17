import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  VStack,
  RadioGroup,
  Radio,
  Text,
  HStack,
  Box,
  useColorModeValue
} from '@chakra-ui/react';
import { FaFilePdf, FaFileCsv, FaFileCode } from 'react-icons/fa';
import { Routine } from '../models/types';
import { useExercises } from '../store/pulsarStore';

interface ExportRoutineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  routine: Routine;
}

export const ExportRoutineDialog: React.FC<ExportRoutineDialogProps> = ({ isOpen, onClose, routine }) => {
  const [format, setFormat] = React.useState<'pdf' | 'csv' | 'json'>('pdf');
  const exercises = useExercises();

  const boxBg = useColorModeValue('cyan.50', 'cyan.900');
  const boxBorder = useColorModeValue('cyan.400', 'cyan.300');
  const boxBgInactive = useColorModeValue('white', 'gray.800');
  const boxBorderInactive = useColorModeValue('gray.200', 'gray.600');
  const descColor = useColorModeValue('gray.600', 'gray.300');

  const formatOptions = [
    {
      value: 'pdf',
      label: 'PDF',
      icon: <FaFilePdf color="#E53E3E" />,
      description: 'Best for printing or sharing as a document.'
    },
    {
      value: 'csv',
      label: 'CSV',
      icon: <FaFileCsv color="#3182CE" />,
      description: 'Spreadsheet-friendly format for data analysis.'
    },
    {
      value: 'json',
      label: 'JSON',
      icon: <FaFileCode color="#38A169" />,
      description: 'Raw data for importing or development.'
    }
  ];

  const handleExport = async () => {
    if (format === 'json') {
      // Export as JSON with exercise names from store
      const routineForExport = {
        ...routine,
        dailySchedule: routine.dailySchedule.map(day => ({
          ...day,
          exercises: day.exercises.map(ex => {
            // Look up exercise name from store using exerciseId
            const found = exercises.find(e => e.id === ex.exerciseId);
            return {
              name: found ? found.name : ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              duration: ex.duration
            };
          })
        }))
      };
      const dataStr = JSON.stringify(routineForExport, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${routine.name || 'routine'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      // Export as CSV (name from store, support duration)
      let csv = `Name,Day,Exercise,Sets,Reps,Duration (sec)\n`;
      routine.dailySchedule.forEach(day => {
        day.exercises.forEach(ex => {
          const found = exercises.find(e => e.id === ex.exerciseId);
          const exName = found ? found.name : ex.exerciseId;
          csv += `"${routine.name}","${day.day}","${exName}",${ex.sets || ''},${ex.reps || ''},${ex.duration || ''}\n`;
        });
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${routine.name || 'routine'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      // Export as PDF (name from store, include description and indicators, each day in its own table)
      const liked = routine.liked ? '❤️' : '';
      const disliked = routine.disliked ? '👎' : '';
      const favorite = routine.favorite ? '⭐' : '';
      const descriptionHtml = routine.description ? `<p style="font-size:1.1em;margin-bottom:1em;">${routine.description}</p>` : '';
      const indicators = [liked, disliked, favorite].filter(Boolean).join(' ');
      const createdAtStr = routine.createdAt ? new Date(routine.createdAt).toLocaleDateString() : '';
      const createdAtHtml = createdAtStr ? `<div style=\"font-size:0.95em;color:#888;margin-bottom:0.5em;\">Created: ${createdAtStr}</div>` : '';
      // Render each day as its own table, combine Reps/Duration into a single column with dynamic header
      const scheduleHtml = routine.dailySchedule.map(day => {
        if (!day.exercises.length) return '';
        // Determine if all exercises use only reps, only duration, or mixed
        let hasReps = false, hasDuration = false;
        day.exercises.forEach(ex => {
          if (ex.reps) hasReps = true;
          if (ex.duration) hasDuration = true;
        });
        let repsHeader = 'Reps/Duration';
        if (hasReps && !hasDuration) repsHeader = 'Reps';
        else if (!hasReps && hasDuration) repsHeader = 'Duration';
        return `
          <h3 style=\"margin-top:2em;margin-bottom:0.5em;\">${day.day}${day.kind ? ` <span style='font-size:0.8em;color:#888;'>(${day.kind})</span>` : ''}</h3>
          <table border=\"1\" cellpadding=\"6\" style=\"border-collapse:collapse;width:100%;margin-bottom:1.5em;\">
            <thead><tr><th>Exercise</th><th>Sets</th><th>${repsHeader}</th></tr></thead>
            <tbody>
              ${day.exercises.map(ex => {
                const found = exercises.find(e => e.id === ex.exerciseId);
                const exName = found ? found.name : ex.exerciseId;
                let repsOrDuration = '';
                if (ex.duration) {
                  repsOrDuration = `${ex.duration} sec`;
                } else if (ex.reps) {
                  repsOrDuration = `${ex.reps}`;
                }
                return `<tr><td>${exName}</td><td>${ex.sets || ''}</td><td>${repsOrDuration}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        `;
      }).join('');
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
          <head>
            <title>${routine.name} - Routine Export</title>
            <style>
              body {
                font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
                max-width: 700px;
                margin: 2em auto;
                background: #f8fafc;
                color: #222;
              }
              h1 {
                font-size: 2.1em;
                margin-bottom: 0.2em;
                letter-spacing: 0.5px;
              }
              h2 {
                font-size: 1.3em;
                margin-top: 2em;
                margin-bottom: 0.7em;
                color: #0bc5ea;
                border-bottom: 1.5px solid #e2e8f0;
                padding-bottom: 0.2em;
              }
              h3 {
                font-size: 1.1em;
                margin-top: 2em;
                margin-bottom: 0.5em;
                color: #234e52;
                letter-spacing: 0.2px;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin-bottom: 1.5em;
                background: #fff;
                box-shadow: 0 1px 4px 0 #e2e8f0;
                border-radius: 7px;
                overflow: hidden;
              }
              th, td {
                padding: 8px 12px;
                text-align: left;
              }
              th {
                background: #e6f7fb;
                color: #234e52;
                font-weight: 600;
                border-bottom: 2px solid #b2f5ea;
              }
              tr:nth-child(even) td {
                background: #f7fafc;
              }
              tr:last-child td {
                border-bottom: none;
              }
              .routine-meta {
                font-size: 0.95em;
                color: #888;
                margin-bottom: 0.5em;
              }
              .routine-desc {
                font-size: 1.1em;
                margin-bottom: 1em;
                color: #444;
              }
              .branding {
                margin-top: 2.5em;
                text-align: center;
                color: #888;
                font-size: 0.95em;
              }
              .branding-logo {
                height: 2em;
                vertical-align: middle;
                margin-right: 0.5em;
                opacity: 0.85;
              }
              .branding-title {
                font-weight: bold;
                letter-spacing: 0.5px;
                font-size: 1.1em;
                color: #0bc5ea;
              }
              .branding-exported {
                margin-left: 0.5em;
                color: #888;
                font-size: 0.95em;
              }
            </style>
          </head>
          <body>
          ${createdAtHtml}
          <h1>${routine.name} ${indicators ? `<span style='font-size:0.7em;'>${indicators}</span>` : ''}</h1>
          ${descriptionHtml}
          <h2>Schedule</h2>
          ${scheduleHtml}
          <div class="branding">
            <img src="/favicon.svg" alt="Pulsar logo" class="branding-logo" />
            <span class="branding-title">PULSAR</span>
            <span class="branding-exported">Exported from Pulsar on ${new Date().toLocaleString()}</span>
          </div>
          </body></html>
        `);
        win.document.close();
        win.print();
      }
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="xl">
        <ModalHeader>Export Routine</ModalHeader>
        <ModalBody>
          <Text mb={2}>Choose export format:</Text>
          <RadioGroup value={format} onChange={val => setFormat(val as 'pdf' | 'csv' | 'json')}>
            <VStack align="start" spacing={4}>
              {formatOptions.map(opt => (
                <Box
                  key={opt.value}
                  w="100%"
                  p={3}
                  borderWidth={2}
                  borderRadius="md"
                  borderColor={format === opt.value ? boxBorder : boxBorderInactive}
                  bg={format === opt.value ? boxBg : boxBgInactive}
                  cursor="pointer"
                  onClick={() => setFormat(opt.value as 'pdf' | 'csv' | 'json')}
                  transition="all 0.2s"
                >
                  <HStack align="start">
                    <Radio value={opt.value} colorScheme="cyan">
                      <HStack>
                        {opt.icon}
                        <Text fontWeight="bold">{opt.label}</Text>
                      </HStack>
                    </Radio>
                    <Text color={descColor} fontSize="sm">{opt.description}</Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </RadioGroup>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="cyan" onClick={handleExport}>
            Export
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
