import React from 'react';
import { Box, Button, CloseButton, Flex, Alert, AlertTitle, AlertDescription, SlideFade, useToast } from '@chakra-ui/react';
import { FaMobileAlt, FaDownload, FaShareSquare } from 'react-icons/fa';
import { useInstallPromptStore } from '../store/installPromptStore';

const InstallAppAlert: React.FC = () => {
  const { deferredPrompt, isInstalled, isIOS, dismissed, dismiss, promptInstall } = useInstallPromptStore();
  const toast = useToast();

  const canPromptInstall = !!deferredPrompt;
  const showIOSInstructions = !canPromptInstall && isIOS;

  if (isInstalled || dismissed || !(canPromptInstall || showIOSInstructions)) {
    return null;
  }

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      toast({ title: 'Installing Pulsar...', status: 'success', duration: 2000, isClosable: true });
    }
  };

  return (
    <SlideFade in={true} offsetY="20px">
      <Alert
        status="info"
        variant="solid"
        borderRadius="xl"
        mb={6}
        p={6}
        bgGradient="linear(to-r, cyan.500, blue.500)"
        boxShadow="xl"
        justifyContent="flex-start"
        alignItems="center"
        position="relative"
      >
        <CloseButton
          position="absolute"
          top={2}
          right={2}
          color="whiteAlpha.800"
          _hover={{ color: 'white', bg: 'whiteAlpha.300' }}
          onClick={dismiss}
          aria-label="Dismiss install prompt"
        />
        <Box fontSize="3.5em" mr={5} color="whiteAlpha.900" display="flex" alignItems="center">
          <FaMobileAlt />
        </Box>
        <Flex direction="column" align="start" flex={1}>
          <AlertTitle fontSize="xl" fontWeight="extrabold" mb={1} color="white">
            Install Pulsar
          </AlertTitle>
          <AlertDescription fontSize="md" mb={showIOSInstructions ? 0 : 4} color="whiteAlpha.900">
            {showIOSInstructions
              ? <>Tap <FaShareSquare style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }} /> Share, then "Add to Home Screen" for quick access and a full-screen experience.</>
              : 'Add it to your home screen for quick access, offline support, and a full-screen experience.'}
          </AlertDescription>
          {canPromptInstall && (
            <Button
              size="md"
              bg="white"
              color="cyan.600"
              variant="solid"
              fontWeight="bold"
              leftIcon={<FaDownload />}
              _hover={{ bg: 'whiteAlpha.900' }}
              onClick={handleInstall}
            >
              Install App
            </Button>
          )}
        </Flex>
      </Alert>
    </SlideFade>
  );
};

export default InstallAppAlert;
