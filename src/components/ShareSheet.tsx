import { useEffect, useMemo, useState } from 'react';
import {
  AspectRatio,
  Box,
  Button,
  ButtonGroup,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Image,
  Skeleton,
  Text,
  Wrap,
  WrapItem,
  useToast,
} from '@chakra-ui/react';
import { FaCopy, FaDownload, FaShareAlt } from 'react-icons/fa';
import { useUrlModal } from '../hooks/useUrlModal';
import { useRoutines, useWorkouts } from '../store/pulsarStore';
import {
  ALL_CARD_KINDS, buildCard, CARD_LABELS, getOfferedCards, getShareFileName, getShareText, parseShareParam,
  SAMPLE_CARDS, SHARE_SIZES, shareParam, type ShareCard, type ShareCardKind, type ShareSize,
} from '../services/share/cards';
import { renderShareImage } from '../services/share/render';
import { isDevMode } from '../utils/devMode';

const SIZE_KEY = 'pulsar:shareSize';

function readSize(): ShareSize {
  try {
    return localStorage.getItem(SIZE_KEY) === 'square' ? 'square' : 'story';
  } catch {
    return 'story';
  }
}

function saveSize(size: ShareSize) {
  try {
    localStorage.setItem(SIZE_KEY, size);
  } catch {
    // Private mode or blocked storage: the size just isn't remembered.
  }
}

/** Opens the share sheet. <ShareSheet /> is rendered once, in App. */
export function useShareSheet() {
  const modal = useUrlModal('share');
  return {
    ...modal,
    /** Start on `kind`. With a workout id, the sheet offers that workout's card first. */
    openShare: (kind: ShareCardKind, workoutId?: string) => modal.open(shareParam(kind, workoutId)),
    openGallery: () => modal.open('dev'),
  };
}

interface Rendered {
  key: string;
  file: File;
  url: string;
}

/**
 * Share a win: a branded image of a workout, the streak, the week, the month or all time,
 * through the phone's own share sheet. The image is made as soon as the card or size changes,
 * not on the tap, because iOS only allows navigator.share() straight from the tap.
 */
const ShareSheet: React.FC = () => {
  const sheet = useShareSheet();
  const workouts = useWorkouts();
  const routines = useRoutines();
  const toast = useToast();
  const param = useMemo(() => {
    const parsed = sheet.value ? parseShareParam(sheet.value) : null;
    // The sample-card gallery is a testing tool (DEV-FEATURES.md).
    return parsed?.gallery && !isDevMode() ? { gallery: false } : parsed;
  }, [sheet.value]);
  const context = useMemo(() => ({ workoutId: param?.workoutId }), [param?.workoutId]);

  const offered = useMemo<ShareCardKind[]>(() => {
    if (!param) return [];
    if (param.gallery) return [...ALL_CARD_KINDS];
    return getOfferedCards(context, workouts, routines);
  }, [param, context, workouts, routines]);

  const [picked, setPicked] = useState<ShareCardKind | null>(null);
  const [size, setSize] = useState<ShareSize>(readSize);
  // A new opening starts on the card it asked for.
  useEffect(() => setPicked(null), [sheet.value]);
  const kind = picked && offered.includes(picked)
    ? picked
    : (param?.kind && offered.includes(param.kind) ? param.kind : offered[0]);

  const card = useMemo<ShareCard | null>(() => {
    if (!param || !kind) return null;
    if (param.gallery) return SAMPLE_CARDS[kind];
    return buildCard(kind, context, workouts, routines);
  }, [param, kind, context, workouts, routines]);

  const renderKey = card ? `${JSON.stringify(card)}|${size}` : '';
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!card) return;
    let cancelled = false;
    let url: string | null = null;
    setFailed(false);
    renderShareImage(card, size).then(blob => {
      if (cancelled) return;
      const file = new File([blob], getShareFileName(card), { type: 'image/png' });
      url = URL.createObjectURL(file);
      setRendered({ key: renderKey, file, url });
    }).catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // renderKey stands in for card and size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKey]);

  if (!sheet.isOpen) return null;

  const ready = rendered && rendered.key === renderKey ? rendered : null;
  const text = card ? getShareText(card) : '';
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const canShareFiles = !!ready && canShare && typeof navigator.canShare === 'function' && navigator.canShare({ files: [ready.file] });
  const { width, height } = SHARE_SIZES[size];

  const share = () => {
    if (!ready) return;
    // Called straight from the tap, with the file already made (see above).
    const data: ShareData = canShareFiles ? { files: [ready.file], text, title: 'Pulsar' } : { text, title: 'Pulsar' };
    navigator.share(data).catch((err: unknown) => {
      if ((err as Error)?.name === 'AbortError') return; // closed the share sheet
      toast({ status: 'error', title: "Couldn't share", description: 'Try Save image instead.', duration: 4000 });
    });
  };

  const saveImage = () => {
    if (!ready) return;
    const a = document.createElement('a');
    a.href = ready.url;
    a.download = ready.file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ status: 'success', title: 'Copied', duration: 2000 });
    } catch {
      toast({ status: 'error', title: "Couldn't copy", duration: 3000 });
    }
  };

  const pickSize = (next: ShareSize) => {
    setSize(next);
    saveSize(next);
  };

  return (
    <Drawer isOpen placement="bottom" onClose={sheet.close}>
      <DrawerOverlay />
      <DrawerContent borderTopRadius="2xl" maxH="94vh" pb="env(safe-area-inset-bottom)" data-testid="share-sheet">
        <DrawerCloseButton top={4} />
        <DrawerHeader pb={2}>{param?.gallery ? 'Share cards (dev)' : 'Share'}</DrawerHeader>
        <DrawerBody pb={5} px={4}>
          {!card ? (
            <Text color="gray.500" py={6} textAlign="center">
              Finish a workout and you'll have a win to share.
            </Text>
          ) : (
            <Flex direction="column" gap={3}>
              <Box mx="auto" w="100%" maxW={size === 'story' ? 'min(100%, calc(46vh * 9 / 16))' : 'min(100%, 46vh)'}>
                <AspectRatio ratio={width / height}>
                  <Box borderRadius="xl" overflow="hidden" bg="#0b0d1a" boxShadow="lg">
                    {ready ? (
                      <Image src={ready.url} alt={text} w="100%" h="100%" objectFit="cover" data-testid="share-preview" />
                    ) : failed ? (
                      <Text color="whiteAlpha.700" fontSize="sm" p={4}>Couldn't make the image.</Text>
                    ) : (
                      <Skeleton w="100%" h="100%" startColor="whiteAlpha.100" endColor="whiteAlpha.300" />
                    )}
                  </Box>
                </AspectRatio>
              </Box>

              {offered.length > 1 && (
                <Wrap spacing={2} justify="center">
                  {offered.map(k => (
                    <WrapItem key={k}>
                      <Button
                        size="sm"
                        borderRadius="full"
                        variant={k === kind ? 'solid' : 'outline'}
                        colorScheme={k === kind ? 'cyan' : 'gray'}
                        onClick={() => setPicked(k)}
                        aria-pressed={k === kind}
                      >
                        {CARD_LABELS[k]}
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
              )}

              <ButtonGroup isAttached size="sm" w="100%" variant="outline">
                {(Object.keys(SHARE_SIZES) as ShareSize[]).map(s => (
                  <Button
                    key={s}
                    flex={1}
                    variant={s === size ? 'solid' : 'outline'}
                    onClick={() => pickSize(s)}
                    aria-pressed={s === size}
                  >
                    {SHARE_SIZES[s].label}
                  </Button>
                ))}
              </ButtonGroup>

              {canShare ? (
                <Button size="lg" colorScheme="cyan" leftIcon={<FaShareAlt />} onClick={share} isDisabled={!ready} borderRadius="full">
                  Share
                </Button>
              ) : (
                <Button size="lg" colorScheme="cyan" leftIcon={<FaDownload />} onClick={saveImage} isDisabled={!ready} borderRadius="full">
                  Save image
                </Button>
              )}
              <Flex justify="center" gap={2}>
                {canShare && (
                  <Button size="sm" variant="ghost" leftIcon={<FaDownload />} onClick={saveImage} isDisabled={!ready}>
                    Save image
                  </Button>
                )}
                <Button size="sm" variant="ghost" leftIcon={<FaCopy />} onClick={copyText}>
                  Copy text
                </Button>
              </Flex>
            </Flex>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default ShareSheet;
