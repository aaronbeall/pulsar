import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Floating layers (menus, popovers) must be portaled to <body>, or they get trapped in
// the stacking context of whatever they're opened from and render under sibling content.
// See PortalMenuList.tsx. Modal, AlertDialog, Drawer, Tooltip and toasts already portal
// by default in Chakra v2, so only these need the guard.
const SRC = join(__dirname, '..');
const ALLOWED = new Set(['components/PortalMenuList.tsx']);
const UNPORTALED = /<(MenuList|PopoverContent)\b/g;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

describe('floating layers', () => {
  it('only renders MenuList/PopoverContent through a portal', () => {
    const offenders = tsxFiles(SRC)
      .map(path => relative(SRC, path).split('\\').join('/'))
      .filter(file => !ALLOWED.has(file))
      .flatMap(file => {
        const source = readFileSync(join(SRC, file), 'utf8');
        return [...source.matchAll(UNPORTALED)].map(m => `${file}: <${m[1]}> (use PortalMenuList, or add a portaled wrapper to ALLOWED)`);
      });
    expect(offenders).toEqual([]);
  });
});
