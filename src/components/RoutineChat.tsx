import React, { useRef, useState } from 'react';
import { Box, VStack, Text, Flex, Button, Collapse, IconButton, Input } from '@chakra-ui/react';
import { FaRobot, FaPaperPlane, FaChevronDown, FaChevronUp } from 'react-icons/fa';

export interface ChatMessage {
  role: 'user' | 'ai';
  message: string;
}

interface RoutineChatProps {
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const RoutineChat: React.FC<RoutineChatProps> = ({ chatHistory, setChatHistory }) => {
  const [chatInput, setChatInput] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    setChatHistory((prev) => [...prev, { role: 'user', message: userMessage }]);
    setChatInput('');
    // Simulate AI response (replace with real AI call if available)
    setTimeout(() => {
      setChatHistory((prev) => [...prev, { role: 'ai', message: `AI: I received your message: "${userMessage}"` }]);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 600);
  };

  return (
    <Box w="100%" maxW="600px" mb={6} p={4} borderWidth="1px" borderRadius="lg" bg="gray.50" _dark={{ bg: 'gray.700' }}>
      <Flex align="center" justify="space-between" mb={isOpen ? 2 : 0}>
        <Flex align="center" gap={2}>
          <FaRobot size={18} color="#6B7280" />
          <Text fontWeight="bold" color="gray.600" fontSize="md">Pulsar AI</Text>
        </Flex>
        <IconButton
          aria-label={isOpen ? 'Collapse chat' : 'Expand chat'}
          icon={isOpen ? <FaChevronUp /> : <FaChevronDown />}
          size="sm"
          variant="ghost"
          onClick={() => setIsOpen((v) => !v)}
        />
      </Flex>
      <Collapse in={isOpen} animateOpacity>
        <VStack align="stretch" spacing={3} maxH="300px" overflowY="auto">
          {chatHistory.length === 0 && (
            <Text color="gray.500" fontSize="sm">Ask anything about this routine, or request changes!</Text>
          )}
          {chatHistory.map((msg, idx) => (
            <Flex key={idx} align={msg.role === 'user' ? 'flex-end' : 'flex-start'}>
              <Box
                bg={msg.role === 'user' ? 'cyan.400' : 'gray.200'}
                color={msg.role === 'user' ? 'white' : 'gray.800'}
                px={3} py={2} borderRadius="xl" maxW="80%"
                ml={msg.role === 'user' ? 'auto' : 0}
                mr={msg.role === 'ai' ? 'auto' : 0}
                fontSize="md"
                display="flex"
                flexDirection="column"
                alignItems={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                gap={1}
              >
                {msg.role === 'ai' && (
                  <Box mb={0.5} color="gray.400" display="flex" alignItems="center" justifyContent="flex-start" fontWeight="bold" fontSize="sm" gap={1} lineHeight={1}>
                    <FaRobot size={16} />
                    <span style={{ fontWeight: 600, fontSize: '0.93em', color: '#6B7280', lineHeight: 1 }}>Pulsar AI</span>
                  </Box>
                )}
                <span style={{ marginTop: 0 }}>{msg.message}</span>
              </Box>
            </Flex>
          ))}
          <div ref={chatEndRef} />
        </VStack>
        <Flex ml="1px" mb="1px" mt={3} gap={2}>
          <Input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Suggest changes or ask a question..."
            borderRadius={16}
            fontSize="1em"
            bg="gray.50"
            _dark={{ bg: 'gray.700', color: 'gray.100', borderColor: 'gray.600' }}
            _focus={{ bg: 'white', _dark: { bg: 'gray.800' } }}
            color="gray.800"
            borderColor="gray.200"
            flex={1}
            transition="background 0.2s, color 0.2s"
          />
          <Button colorScheme="cyan" onClick={handleSend} borderRadius="full" px={3} minW={10} aria-label="Send">
            <FaPaperPlane />
          </Button>
        </Flex>
      </Collapse>
    </Box>
  );
};

export default RoutineChat;
