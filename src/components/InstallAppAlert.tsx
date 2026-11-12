import React from 'react';
import { Box, Button, CloseButton, Flex, Text, SlideFade, useToast, useColorModeValue } from '@chakra-ui/react';
import { FaMobileAlt, FaDownload, FaShareSquare } from 'react-icons/fa';
import { useInstallBannerVisible, useInstallPromptStore } from '../store/installPromptStore';

/**
 * Extra room to leave at the bottom of the page while the banner shows, so the end of a
 * page can scroll clear of it. The banner is about 9rem tall and sits 5.5rem up.
 */
export const INSTALL_BANNER_SPACE = '11rem';

const InstallAppAlert: React.FC = () => {
  const { deferredPrompt, dismiss, promptInstall } = useInstallPromptStore();
  const isVisible = useInstallBannerVisible();
  const toast = useToast();
  const glassBg = useColorModeValue('whiteAlpha.900', 'rgba(26, 32, 44, 0.92)');
  const glassBorder = useColorModeValue('whiteAlpha.800', 'whiteAlpha.100');
  const mutedColor = useColorModeValue('gray.600', 'gray.300');

  const canPromptInstall = !!deferredPrompt;
  const showIOSInstructions = !canPromptInstall;

  if (!isVisible) {
    return null;
  }

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      toast({ title: 'Installing Pulsar...', status: 'success', duration: 2000, isClosable: true });
    }
  };

  // Floats over the page just above the bottom nav instead of sitting in the flow, so it
  // never pushes any view's content down (and stays within thumb reach). Near-opaque so it
  // reads over whatever is underneath.
  return (
    <Box
      position="fixed"
      left={0}
      right={0}
      bottom="calc(env(safe-area-inset-bottom, 0px) + 88px)"
      zIndex="sticky"
      px={4}
      pointerEvents="none"
    >
      <SlideFade in={true} offsetY="20px">
        <Box
          position="relative"
          maxW="lg"
          mx="auto"
          pointerEvents="auto"
          borderRadius="xl"
          p={{ base: 4, sm: 5 }}
          bg={glassBg}
          backdropFilter="blur(16px) saturate(180%)"
          border="1px solid"
          borderColor={glassBorder}
          boxShadow="0 8px 32px rgba(0,0,0,0.25)"
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
    </Box>
  );
};

export default InstallAppAlert;
