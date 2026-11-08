import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FaDatabase, FaDownload, FaUpload, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { format, formatDistanceToNow } from 'date-fns';
import { usePulsarStore } from '../store/pulsarStore';
import { useUrlModal } from '../hooks/useUrlModal';
import {
  BackupParseError,
  PulsarBackup,
  backupFileName,
  compareBackupToDevice,
  createBackup,
  parseBackup,
  summarizeBackup,
} from '../utils/backup';
import { PersistenceStatus, getPersistenceStatus, requestPersistentStorage } from '../utils/storagePersistence';

const formatDate = (t: number | null) => (t ? format(t, 'MMM d, yyyy h:mm a') : 'none');

const LAST_BACKUP_KEY = 'pulsar:lastBackupAt';

const readLastBackup = (): number | null => {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_KEY);
    return raw ? Number(raw) || null : null;
  } catch {
    return null;
  }
};

const writeLastBackup = (at: number) => {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(at));
  } catch {
    // Private mode etc. The backup itself still worked.
  }
};

/**
 * On phones, hand the file to the OS share sheet (lets it go to Files / iCloud Drive /
 * Google Drive / email). Elsewhere, or if sharing files isn't supported, download it.
 * Returns false if the user cancelled the share sheet.
 */
async function saveBackupFile(json: string, fileName: string): Promise<boolean> {
  const file = new File([json], fileName, { type: 'application/json' });
  const isTouch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Pulsar backup' });
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false;
      // Some browsers claim support then fail; fall through to a plain download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

const BackupRestoreCard: React.FC = () => {
  const toast = useToast();
  const replaceAll = usePulsarStore(s => s.replaceAll);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(readLastBackup);
  const [persistence, setPersistence] = useState<PersistenceStatus | null>(null);
  const [pendingRestore, setPendingRestore] = useState<PulsarBackup | null>(null);
  // ?restore=1 so Back cancels. The chosen file only lives in memory, so a reload drops it.
  const restoreDialog = useUrlModal('restore', { isStale: () => !pendingRestore });
  // Compared once when a file is chosen, against what's on the device at that moment.
  const comparison = useMemo(
    () => (pendingRestore ? compareBackupToDevice(pendingRestore, usePulsarStore.getState()) : null),
    [pendingRestore],
  );
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    getPersistenceStatus().then(setPersistence);
  }, []);

  const handleRequestPersistence = async () => {
    const status = await requestPersistentStorage();
    setPersistence(status);
    if (status !== 'persistent') {
      toast({
        title: "The browser didn't allow it",
        description: 'Installing Pulsar to your home screen usually helps. Keep a backup either way.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleExport = async () => {
    const { exercises, routines, workouts } = usePulsarStore.getState();
    const now = Date.now();
    const json = JSON.stringify(createBackup({ exercises, routines, workouts }, now));
    try {
      const saved = await saveBackupFile(json, backupFileName(now));
      if (!saved) return;
      writeLastBackup(now);
      setLastBackupAt(now);
      toast({ title: 'Backup saved', status: 'success', duration: 2500, isClosable: true });
    } catch (err) {
      toast({
        title: 'Could not save backup',
        description: err instanceof Error ? err.message : undefined,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    try {
      setPendingRestore(parseBackup(await file.text()));
      restoreDialog.open();
    } catch (err) {
      toast({
        title: 'Could not read backup',
        description: err instanceof BackupParseError ? err.message : 'The file could not be read.',
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setIsRestoring(true);
    try {
      await replaceAll(pendingRestore);
      toast({
        title: 'Backup restored',
        description: summarizeBackup(pendingRestore),
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      await restoreDialog.close();
      setPendingRestore(null);
    } catch (err) {
      toast({
        title: 'Restore failed',
        description: `Your existing data was left as it was. ${err instanceof Error ? err.message : ''}`,
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="xl" p={{ base: 4, sm: 5 }} boxShadow="sm">
      <Flex align="center" gap={2} mb={1}>
        <Icon as={FaDatabase} color="cyan.500" />
        <Heading size="sm">Backup &amp; Restore</Heading>
      </Flex>
      <Text fontSize="xs" color={mutedColor} mb={3}>
        Your routines and workout history live only on this device. Save a backup file to keep them safe or move them to a new phone.
      </Text>

      {persistence && persistence !== 'unsupported' && (
        <Flex
          align="center"
          gap={2}
          mb={3}
          fontSize="sm"
          color={persistence === 'persistent' ? 'green.500' : 'orange.400'}
        >
          <Icon as={persistence === 'persistent' ? FaCheckCircle : FaExclamationCircle} flexShrink={0} />
          <Text flex={1}>
            {persistence === 'persistent'
              ? 'Storage is protected from automatic cleanup.'
              : 'The browser may clear this data if space runs low.'}
          </Text>
          {persistence !== 'persistent' && (
            <Button size="sm" variant="ghost" colorScheme="orange" onClick={handleRequestPersistence} flexShrink={0}>
              Protect
            </Button>
          )}
        </Flex>
      )}

      <Text fontSize="sm" mb={4}>
        Last backup:{' '}
        <Text as="span" fontWeight="semibold">
          {lastBackupAt ? `${formatDistanceToNow(lastBackupAt)} ago` : 'never'}
        </Text>
      </Text>

      <Stack direction={{ base: 'column', sm: 'row' }} spacing={3}>
        <Button colorScheme="cyan" leftIcon={<FaDownload />} onClick={handleExport} flex={1} minH="44px">
          Save Backup
        </Button>
        <Button variant="outline" leftIcon={<FaUpload />} onClick={() => fileInputRef.current?.click()} flex={1} minH="44px">
          Restore Backup
        </Button>
      </Stack>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />

      <AlertDialog
        isOpen={restoreDialog.isOpen && !!pendingRestore}
        leastDestructiveRef={cancelRef}
        onClose={() => !isRestoring && restoreDialog.close()}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Restore this backup?</AlertDialogHeader>
            <AlertDialogBody>
              {pendingRestore && (
                <>
                  <Box fontSize="sm" borderWidth="1px" borderColor={cardBorder} borderRadius="md" mb={3}>
                    <Box p={3} borderBottomWidth="1px" borderColor={cardBorder}>
                      <Text fontWeight="semibold">
                        Backup{pendingRestore.exportedAt ? `, saved ${formatDate(pendingRestore.exportedAt)}` : ''}
                      </Text>
                      <Text color={mutedColor}>{summarizeBackup(pendingRestore)}</Text>
                      <Text color={mutedColor}>Last activity: {formatDate(comparison?.backupLatest ?? null)}</Text>
                    </Box>
                    <Box p={3}>
                      <Text fontWeight="semibold">This device now</Text>
                      <Text color={mutedColor}>{summarizeBackup(createBackup(usePulsarStore.getState()))}</Text>
                      <Text color={mutedColor}>Last activity: {formatDate(comparison?.deviceLatest ?? null)}</Text>
                    </Box>
                  </Box>
                  {comparison?.deviceIsNewer && (
                    <Flex gap={2} color="orange.400" fontSize="sm" mb={3} align="start">
                      <Icon as={FaExclamationCircle} mt={0.5} flexShrink={0} />
                      <Text>This device has newer activity than the backup. Restoring will lose it.</Text>
                    </Flex>
                  )}
                  <Text fontWeight="semibold">It will replace everything currently in Pulsar on this device.</Text>
                </>
              )}
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} onClick={() => restoreDialog.close()} isDisabled={isRestoring}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleConfirmRestore} isLoading={isRestoring}>
                Replace &amp; Restore
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default BackupRestoreCard;
