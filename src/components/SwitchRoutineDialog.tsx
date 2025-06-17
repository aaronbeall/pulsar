import { usePulsarStore } from '../store/pulsarStore';
import { Routine } from '../models/types';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  useToast,
} from '@chakra-ui/react';
import { FaExchangeAlt, FaLayerGroup, FaTimesCircle } from 'react-icons/fa';
import React from 'react';

interface SwitchRoutineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  routine: Routine;
}

const SwitchRoutineDialog: React.FC<SwitchRoutineDialogProps> = ({ isOpen, onClose, routine }) => {
  const routines = usePulsarStore(s => s.routines);
  const updateRoutine = usePulsarStore(s => s.updateRoutine);
  const toast = useToast();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [switching, setSwitching] = React.useState(false);

  const activeRoutines = React.useMemo(() => routines.filter(r => r.active && r.id !== routine.id), [routines, routine.id]);
  const hasOtherActive = activeRoutines.length > 0;

  // If dialog is opened and there are no other active routines, immediately activate this one and close
  React.useEffect(() => {
    if (isOpen && !hasOtherActive && !routine.active) {
      (async () => {
        setSwitching(true);
        await updateRoutine({ ...routine, active: true });
        setSwitching(false);
        toast({
          title: 'Routine activated',
          description: `${routine.name} is now your active routine.`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        onClose();
      })();
    }
  }, [isOpen, hasOtherActive, routine.id]);

  const handleSwitch = async () => {
    setSwitching(true);
    for (const r of routines) {
      if (r.id === routine.id && !r.active) {
        await updateRoutine({ ...r, active: true });
      } else if (r.id !== routine.id && r.active) {
        await updateRoutine({ ...r, active: false });
      }
    }
    setSwitching(false);
    toast({
      title: 'Routine activated',
      description: `${routine.name} is now your active routine.`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
    onClose();
  };

  const handleUseBoth = async () => {
    setSwitching(true);
    await updateRoutine({ ...routine, active: true });
    setSwitching(false);
    toast({
      title: 'Both routines active',
      description: `${activeRoutines.map(r => r.name).join(', ')} and ${routine.name} are now both active.`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
    onClose();
  };

  // If no other active routines, don't show dialog (handled by effect above)
  if (!hasOtherActive || routine.active) return null;

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent borderRadius="xl">
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Switch Active Routine
          </AlertDialogHeader>
          <AlertDialogBody>
            You already have an active routine ({activeRoutines.map(r => r.name).join(', ')}). What would you like to do?
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              ref={cancelRef}
              onClick={onClose}
              leftIcon={<FaTimesCircle />}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              colorScheme="yellow"
              ml={2}
              leftIcon={<FaLayerGroup />}
              onClick={handleUseBoth}
              isLoading={switching}
            >
              Use Both
            </Button>
            <Button
              colorScheme="cyan"
              ml={2}
              isLoading={switching}
              leftIcon={<FaExchangeAlt />}
              onClick={handleSwitch}
            >
              Switch
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default SwitchRoutineDialog;
