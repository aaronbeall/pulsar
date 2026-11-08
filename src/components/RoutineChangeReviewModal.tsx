import React from 'react';
import {
  Box,
  Button,
  Divider,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import type { Routine, RoutineChange, RoutineChangeItemKey } from '../models/types';
import { dayAfterOp, getChangeItemKeys, getDayOp, getItemStatus, getPendingItemKeys } from '../utils/routineChangeUtils';
import { ChangeStatusIcon, DayChangeDiff, DecisionButtons, DescriptionDiff } from './RoutineChangeDiff';
import { dayBeforeChange, descriptionBeforeChange } from './RoutineChangeCard';

interface RoutineChangeReviewModalProps {
  routine: Routine;
  change: RoutineChange | undefined;
  onClose: () => void;
  onDecide: (keys: RoutineChangeItemKey[], status: 'accepted' | 'rejected') => void;
}

// The expanded view of one AI-suggested change: every affected day in full, with every
// exercise listed (removed/replaced struck through, new ones highlighted), and Accept /
// Reject per day as well as for everything still waiting. Full screen on a phone.
const RoutineChangeReviewModal: React.FC<RoutineChangeReviewModalProps> = ({ routine, change, onClose, onDecide }) => {
  if (!change) return null;
  const keys = getChangeItemKeys(change);
  const pending = getPendingItemKeys(change);

  return (
    <Modal isOpen onClose={onClose} size={{ base: 'full', md: 'lg' }} scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader pr={12}>
          Suggested changes
          <Text fontSize="sm" fontWeight="normal" color="gray.500" _dark={{ color: 'gray.400' }}>
            {pending.length > 0
              ? `${pending.length} of ${keys.length} waiting for review`
              : 'All reviewed'}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction="column" gap={4}>
            {keys.map((key, i) => {
              const status = getItemStatus(change, key);
              const decide = (s: 'accepted' | 'rejected') => onDecide([key], s);
              return (
                <Box key={key}>
                  {i > 0 && <Divider mb={4} />}
                  <Flex align="center" gap={2} mb={2}>
                    <ChangeStatusIcon status={status} />
                    <Text fontWeight="bold" flex={1}>{key === 'description' ? 'Description' : key}</Text>
                    {status !== 'pending' && (
                      <Text fontSize="xs" color={status === 'accepted' ? 'green.500' : 'red.400'} fontWeight="semibold">
                        {status === 'accepted' ? 'Accepted' : change.decisions?.[key]?.superseded ? 'Replaced by a newer suggestion' : 'Rejected'}
                      </Text>
                    )}
                  </Flex>
                  <Box pl={6} opacity={status === 'rejected' ? 0.6 : 1}>
                    {key === 'description' ? (
                      <DescriptionDiff before={descriptionBeforeChange(change, routine)} after={change.patch.description ?? ''} />
                    ) : (
                      <DayChangeDiff
                        before={(() => {
                          const before = dayBeforeChange(change, routine, key);
                          return before && before.exercises.length > 0 ? before : null;
                        })()}
                        after={dayAfterOp(getDayOp(change, key)!)}
                      />
                    )}
                    {status === 'pending' && (
                      <Flex justify="flex-end" mt={3}>
                        <DecisionButtons onAccept={() => decide('accepted')} onReject={() => decide('rejected')} />
                      </Flex>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Flex>
        </ModalBody>
        <ModalFooter gap={2}>
          {pending.length > 0 ? (
            <>
              <Button variant="ghost" leftIcon={<FaTimes />} onClick={() => onDecide(pending, 'rejected')}>
                {pending.length < keys.length ? 'Reject rest' : 'Reject all'}
              </Button>
              <Button colorScheme="cyan" leftIcon={<FaCheck />} onClick={() => onDecide(pending, 'accepted')}>
                {pending.length < keys.length ? 'Accept rest' : 'Accept all'}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Done</Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RoutineChangeReviewModal;
