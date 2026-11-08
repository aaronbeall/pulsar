import { useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  FormControl,
  FormLabel,
  Select,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FaFlask } from 'react-icons/fa';
import { usePulsarStore } from '../store/pulsarStore';
import { useUrlModal } from '../hooks/useUrlModal';
import { summarizeBackup, createBackup } from '../utils/backup';
import { TEST_PRESETS, getTestPreset } from '../utils/testPresets';

/**
 * Dev mode only (Settings › Developer): replace everything on the device with a preset test
 * data set, through the same all-or-nothing path as restoring a backup. The confirmation
 * keeps the chosen preset in the URL (`?loadPreset=<id>`), so Back cancels it.
 */
const TestPresetLoader: React.FC = () => {
  const toast = useToast();
  const replaceAll = usePulsarStore(s => s.replaceAll);
  const [selected, setSelected] = useState(TEST_PRESETS[0].id);
  const [loading, setLoading] = useState(false);
  const confirm = useUrlModal('loadPreset', { isStale: id => !getTestPreset(id) });
  const cancelRef = useRef<HTMLButtonElement>(null);
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const chosen = getTestPreset(selected);
  const pending = confirm.value ? getTestPreset(confirm.value) : undefined;

  const handleLoad = async () => {
    if (!pending) return;
    setLoading(true);
    try {
      const data = pending.build();
      await replaceAll(data);
      toast({
        title: `Loaded “${pending.name}”`,
        description: summarizeBackup(createBackup(data)),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      await confirm.leaveTo('/');
    } catch (err) {
      toast({
        title: 'Could not load the preset',
        description: `Your data was left as it was. ${err instanceof Error ? err.message : ''}`,
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box data-testid="test-presets">
      <FormControl>
        <FormLabel fontSize="sm" mb={1}>Test data preset</FormLabel>
        <Select value={selected} onChange={e => setSelected(e.target.value)} aria-label="Test data preset">
          {TEST_PRESETS.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </FormControl>
      {chosen && (
        <Text fontSize="xs" color={mutedColor} mt={1} mb={2}>{chosen.description}</Text>
      )}
      <Button
        width="100%"
        minH="44px"
        variant="outline"
        colorScheme="purple"
        leftIcon={<FaFlask />}
        onClick={() => confirm.open(selected)}
      >
        Load Test Data
      </Button>

      <AlertDialog
        isOpen={confirm.isOpen && !!pending}
        leastDestructiveRef={cancelRef}
        onClose={() => !loading && confirm.close()}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Load “{pending?.name}”?</AlertDialogHeader>
            <AlertDialogBody>
              <Text fontSize="sm" color={mutedColor} mb={3}>{pending?.description}</Text>
              <Text fontWeight="semibold">
                It replaces everything currently in Pulsar on this device. Save a backup first if you want it back.
              </Text>
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} onClick={() => confirm.close()} isDisabled={loading}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleLoad} isLoading={loading}>
                Replace &amp; Load
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default TestPresetLoader;
