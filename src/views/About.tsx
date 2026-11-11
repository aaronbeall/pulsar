// About.tsx
// Static "About & Legal" page: app info, privacy policy, terms of use, and credits.
// Keep this in step with what the app actually does: workouts are local-only, an account is
// optional and only for Pulsar AI (worker/auth.ts), and subscriptions go through Stripe
// (worker/billing/). See CLAUDE.md.

import React from 'react';
import {
  Box,
  Divider,
  Flex,
  Heading,
  Image,
  Link,
  ListItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  UnorderedList,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaFileContract, FaHeart, FaShieldAlt } from 'react-icons/fa';
import logoSvg from '../assets/logo.svg';
import { PRIVACY_URL, TERMS_URL } from '../components/LegalLinks';

const REPO_URL = 'https://github.com/aaronbeall/pulsar';
const APP_VERSION = '1.0.0';

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading size="sm" mt={5} mb={2} _first={{ mt: 0 }}>
    {children}
  </Heading>
);

const About: React.FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Flex direction="column" gap={{ base: 4, sm: 5 }}>
      <Heading
        fontSize={{ base: 'xl', sm: '2xl' }}
        bgGradient="linear(to-r, cyan.400, blue.500)"
        bgClip="text"
        mb={1}
      >
        About
      </Heading>

      <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="xl" p={{ base: 4, sm: 5 }} boxShadow="sm">
        <Flex align="center" gap={3}>
          <Image src={logoSvg} alt="" boxSize="40px" />
          <Box>
            <Heading size="md">Pulsar</Heading>
            <Text fontSize="sm" color={mutedColor}>Personalized workouts, simplified · v{APP_VERSION}</Text>
          </Box>
        </Flex>
      </Box>

      <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="xl" p={{ base: 4, sm: 5 }} boxShadow="sm">
        <Tabs colorScheme="cyan" size="sm" isFitted>
          <TabList>
            <Tab><FaShieldAlt style={{ marginRight: 6 }} /> Privacy</Tab>
            <Tab><FaFileContract style={{ marginRight: 6 }} /> Terms</Tab>
            <Tab><FaHeart style={{ marginRight: 6 }} /> Credits</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0} fontSize="sm" color={mutedColor}>
              <Text mb={4}>
                A summary. The full <Link href={PRIVACY_URL} color="cyan.500">Privacy Policy</Link> has the details.
              </Text>
              <SectionHeading>Your data stays on your device</SectionHeading>
              <Text>
                Pulsar is free to use and doesn't need an account. Every routine, workout and
                preference you create is stored locally in your browser (IndexedDB). It's never
                uploaded, collected or sold, whether or not you sign in.
              </Text>

              <SectionHeading>Network requests</SectionHeading>
              <Text mb={2}>The app makes only a few network requests:</Text>
              <UnorderedList spacing={1} pl={2}>
                <ListItem>Exercise photos are loaded on demand from a public open-source dataset hosted on GitHub — no personal information is sent with these requests.</ListItem>
                <ListItem>If installed as an app (PWA), your browser may cache pages and assets locally for offline use. This cache stays on your device.</ListItem>
                <ListItem>The app asks Pulsar's server whether you're signed in, and talks to it when you sign in, use Pulsar AI or manage a subscription.</ListItem>
              </UnorderedList>

              <SectionHeading>If you sign in</SectionHeading>
              <Text>
                An account is optional and only needed for Pulsar AI. Signing in with Google stores
                your name, email address and profile photo, your sign-in sessions, and a record of your
                Pulsar AI uses (what kind, when, and how much it cost). It never stores your workouts,
                your routines or what you type to the AI. You can delete your account in Settings at
                any time, which removes all of it (cancel a subscription first).
              </Text>

              <SectionHeading>AI features</SectionHeading>
              <Text mb={2}>
                AI features are optional, and there are two ways to use them. With <b>Pulsar AI</b>{' '}
                (sign in required), your request goes through Pulsar's server, which passes it to OpenAI
                without keeping it. With <b>your own OpenAI key</b>, your browser sends it straight
                to OpenAI. Either way, OpenAI receives what the feature needs:
              </Text>
              <UnorderedList spacing={1} pl={2} mb={2}>
                <ListItem>Building a routine: your answers to the setup questions.</ListItem>
                <ListItem>Routine chat: your message, recent chat messages, and that routine's name, description and schedule.</ListItem>
              </UnorderedList>
              <Text>
                Your own key is stored only in this browser and is sent only to OpenAI. OpenAI handles
                that data under its own terms and privacy policy. Nothing is sent unless you use an AI
                feature.
              </Text>

              <SectionHeading>Payments</SectionHeading>
              <Text>
                Pulsar AI subscriptions are sold through Stripe, which is the merchant of record and
                handles your payment details and receipts. Pulsar never sees your card. It keeps only
                your subscription's status and renewal date, to know which AI allowance you have.
              </Text>
            </TabPanel>

            <TabPanel px={0} fontSize="sm" color={mutedColor}>
              <Text mb={4}>
                A summary. The full <Link href={TERMS_URL} color="cyan.500">Terms of Service</Link> apply.
              </Text>
              <SectionHeading>Use at your own risk</SectionHeading>
              <Text>
                Pulsar is free to use. Pulsar AI is optional, with a small free allowance and a paid
                subscription for more. Pulsar is provided "as is," without warranty of any kind. It is a
                personal project, not a medical or fitness authority — nothing in the app is professional
                medical or fitness advice. Talk to a qualified professional before starting any exercise
                program, especially if you have an existing health condition.
              </Text>

              <SectionHeading>Back up your own data</SectionHeading>
              <Text>
                Because your data lives only in this browser, it can be lost if you clear site data,
                switch browsers/devices, or uninstall the app. Use the export feature in Settings
                regularly if you want to keep a backup.
              </Text>

              <SectionHeading>No liability</SectionHeading>
              <Text>
                To the fullest extent permitted by law, the developer isn't liable for any injury,
                data loss, or other damage arising from use of this app. These terms may change as
                Pulsar evolves.
              </Text>
            </TabPanel>

            <TabPanel px={0} fontSize="sm" color={mutedColor}>
              <SectionHeading>Made by</SectionHeading>
              <Text>
                Aaron Beall — {' '}
                <Link href={REPO_URL} isExternal color="cyan.500">source code on GitHub</Link>.
              </Text>

              <SectionHeading>Exercise data & photos</SectionHeading>
              <Text>
                <Link href="https://github.com/yuhonas/free-exercise-db" isExternal color="cyan.500">
                  free-exercise-db
                </Link>{' '}
                — an open, public-domain exercise dataset.
              </Text>

              <SectionHeading>Built with</SectionHeading>
              <Text>
                React, TypeScript, Vite, Chakra UI, Zustand, react-router, and other open-source
                libraries — see the full list on{' '}
                <Link href={REPO_URL} isExternal color="cyan.500">GitHub</Link>.
              </Text>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <Divider />
      <Text fontSize="xs" color={mutedColor} textAlign="center">
        Pulsar v{APP_VERSION}
      </Text>
    </Flex>
  );
};

export default About;
