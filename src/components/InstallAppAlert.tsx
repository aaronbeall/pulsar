import React from 'react';
import { Box, Button, CloseButton, Flex, Text, SlideFade, useToast, useColorModeValue } from '@chakra-ui/react';
import { FaMobileAlt, FaDownload, FaShareSquare } from 'react-icons/fa';
import { useInstallPromptStore } from '../store/installPromptStore';

const InstallAppAlert: React.FC = () => {
  const { deferredPrompt, isInstalled, isIOS, dismissed, dismiss, promptInstall } = useInstallPromptStore();
  const toast = useToast();
  const glassBg = useColorModeValue('whiteAlpha.700', 'blackAlpha.400');
  const glassBorder = useColorModeValue('whiteAlpha.800', 'whiteAlpha.100');
  const mutedColor = useColorModeValue('gray.600', 'gray.300');

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
      <Box
        position="relative"
        borderRadius="xl"
        mb={{ base: 4, sm: 5 }}
        p={{ base: 4, sm: 5 }}
        bg={glassBg}
        backdropFilter="blur(16px) saturate(180%)"
        border="1px solid"
        borderColor={glassBorder}
        boxShadow="0 4px 20px rgba(0,0,0,0.1)"
      >
        <CloseButton
          position="absolute"
          top={2}
          right={2}
          size="sm"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
        />
        <Flex align="center" gap={4} pr={8}>
          <Flex
            flexShrink={0}
            align="center"
            justify="center"
            boxSize={{ base: '44px', sm: '52px' }}
            borderRadius="full"
            bgGradient="linear(to-br, cyan.400, blue.500)"
            color="white"
            fontSize="lg"
          >
            <FaMobileAlt />
          </Flex>
          <Box flex={1} minW={0}>
            <Text fontWeight="bold" fontSize={{ base: 'sm', sm: 'md' }} mb={0.5}>
              Install Pulsar
            </Text>
            <Text fontSize="xs" color={mutedColor} mb={canPromptInstall ? 2 : 0}>
              {showIOSInstructions
                ? <>Tap <FaShareSquare style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }} /> Share, then "Add to Home Screen"</>
                : 'Add to your home screen for offline, full-screen access.'}
            </Text>
            {canPromptInstall && (
              <Button
                size="sm"
                colorScheme="blue"
                fontWeight="bold"
                leftIcon={<FaDownload />}
                onClick={handleInstall}
              >
                Install App
              </Button>
            )}
          </Box>
        </Flex>
      </Box>
    </SlideFade>
  );
};

export default InstallAppAlert;
