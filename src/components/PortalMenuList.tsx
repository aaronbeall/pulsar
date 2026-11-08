import { forwardRef, MenuList, MenuListProps, Portal } from '@chakra-ui/react';

/**
 * The only MenuList the app should render. It portals the list to <body>, so a menu
 * always floats above the rest of the page instead of being trapped inside whatever
 * stacking context its trigger lives in.
 *
 * Without the portal, a menu opened from inside a card was painted *under* later
 * siblings in the card (e.g. RoutineCard's header and body both set `zIndex={1}`, so
 * the body's text drew straight through the open menu), and anything in the main
 * content area could never rise above the fixed bottom nav. A z-index on the list
 * itself can't fix that: z-index only competes within the nearest stacking context.
 *
 * `src/components/layering.test.ts` fails the build if a bare <MenuList> or
 * <PopoverContent> appears anywhere else.
 */
export const PortalMenuList = forwardRef<MenuListProps, 'div'>((props, ref) => (
  <Portal>
    <MenuList ref={ref} {...props} />
  </Portal>
));

PortalMenuList.displayName = 'PortalMenuList';
