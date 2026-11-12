import { useState } from 'react';
import { Button, Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerFooter, DrawerHeader, DrawerOverlay, Flex, Text, VStack } from '@chakra-ui/react';
import { WorkoutExercise } from '../models/types';
import { WeightUnit } from '../utils/units';
import WeightControl from './WeightControl';
import NumericStepper from './NumericStepper';

interface EditSetSheetProps {
  exercise: WorkoutExercise;
  index: number;
  unit: WeightUnit;
  onClose: () => void;
  onSave: (change: { weightKg?: number; reps?: number }) => void;
}

/** Bottom sheet to fix a finished set: its weight, and the reps actually done. */
const EditSetSheet: React.FC<EditSetSheetProps> = ({ exercise, index, unit, onClose, onSave }) => {
  const rec = exercise.setLog?.[index];
  const [weightKg, setWeightKg] = useState<number | undefined>(rec?.weightKg);
  const [reps, setReps] = useState<number>(rec?.reps ?? exercise.reps ?? 0);
  const hasReps = !!exercise.reps;

  return (
    <Drawer isOpen placement="bottom" onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent borderTopRadius="2xl" pb="env(safe-area-inset-bottom, 0px)" data-testid="edit-set-sheet">
        <DrawerCloseButton />
        <DrawerHeader fontSize="md">Set {index + 1}</DrawerHeader>
        <DrawerBody>
          <VStack spacing={5} align="stretch">
            <Flex justify="space-between" align="center" gap={3}>
              <Text fontWeight="medium">Weight</Text>
              <WeightControl weightKg={weightKg} unit={unit} onChange={setWeightKg} alwaysShown />
            </Flex>
            {hasReps && (
              <Flex justify="space-between" align="center" gap={3}>
                <Text fontWeight="medium">Reps done</Text>
                <Flex align="center" gap={1}>
                  <NumericStepper value={reps} min={0} onChange={setReps} label="reps" />
                  <Text fontSize="sm" color="gray.500">of {exercise.reps}</Text>
                </Flex>
              </Flex>
            )}
          </VStack>
        </DrawerBody>
        <DrawerFooter>
          <Button colorScheme="cyan" w="100%" size="lg" onClick={() => onSave({ weightKg, reps: hasReps ? reps : undefined })}>
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default EditSetSheet;
