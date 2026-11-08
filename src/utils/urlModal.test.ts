import { describe, expect, it } from 'vitest';
import { getPushedModals, planClose, planOpen, stepsToLeaveModals, URL_MODAL_STATE_KEY } from './urlModal';

describe('planOpen', () => {
  it('pushes an entry and records the modal as pushed', () => {
    expect(planOpen('', null, 'activity', '1')).toEqual({
      kind: 'navigate', search: '?activity=1', state: { [URL_MODAL_STATE_KEY]: ['activity'] }, replace: false,
    });
  });

  it('keeps other params and existing state', () => {
    const step = planOpen('?routineId=r1', { from: 'x' }, 'finish', '1');
    expect(step).toEqual({
      kind: 'navigate', search: '?routineId=r1&finish=1', state: { from: 'x', [URL_MODAL_STATE_KEY]: ['finish'] }, replace: false,
    });
  });

  it('stacks on top of an open modal', () => {
    const step = planOpen('?dayTemplates=Monday', { [URL_MODAL_STATE_KEY]: ['dayTemplates'] }, 'applyTemplate', 'Monday');
    expect(step).toMatchObject({ replace: false, state: { [URL_MODAL_STATE_KEY]: ['dayTemplates', 'applyTemplate'] } });
  });

  it('does nothing when already open with the same value', () => {
    expect(planOpen('?exercise=e1', null, 'exercise', 'e1')).toEqual({ kind: 'none' });
  });

  it('swaps the value in place when already open with another value', () => {
    const step = planOpen('?exercise=e1', { [URL_MODAL_STATE_KEY]: ['exercise'] }, 'exercise', 'e2');
    expect(step).toEqual({
      kind: 'navigate', search: '?exercise=e2', state: { [URL_MODAL_STATE_KEY]: ['exercise'] }, replace: true,
    });
  });

  it('takes the place of the modal it replaces', () => {
    const step = planOpen('?finish=1', { [URL_MODAL_STATE_KEY]: ['finish'] }, 'celebrate', '1', 'finish');
    expect(step).toEqual({
      kind: 'navigate', search: '?celebrate=1', state: { [URL_MODAL_STATE_KEY]: ['celebrate'] }, replace: true,
    });
  });

  it('pushes normally when the modal to replace is not open', () => {
    expect(planOpen('', null, 'celebrate', '1', 'finish')).toMatchObject({ replace: false, search: '?celebrate=1' });
  });

  it('replacing a deep-linked modal does not mark the new one as pushed', () => {
    const step = planOpen('?ai=action', null, 'templates', '1', 'ai');
    expect(step).toEqual({ kind: 'navigate', search: '?templates=1', state: {}, replace: true });
  });
});

describe('planClose', () => {
  it('goes back when the app pushed the modal', () => {
    expect(planClose('?menu=1', { [URL_MODAL_STATE_KEY]: ['menu'] }, 'menu')).toEqual({ kind: 'back', steps: 1 });
  });

  it('goes back past modals opened on top of it', () => {
    const state = { [URL_MODAL_STATE_KEY]: ['dayTemplates', 'applyTemplate'] };
    expect(planClose('?dayTemplates=Monday&applyTemplate=Monday', state, 'dayTemplates')).toEqual({ kind: 'back', steps: 2 });
    expect(planClose('?dayTemplates=Monday&applyTemplate=Monday', state, 'applyTemplate')).toEqual({ kind: 'back', steps: 1 });
  });

  it('drops a deep-linked param in place', () => {
    expect(planClose('?activity=1&x=2', null, 'activity')).toEqual({ kind: 'navigate', search: '?x=2', state: {}, replace: true });
  });

  it('does nothing when the modal is not open', () => {
    expect(planClose('?x=2', { [URL_MODAL_STATE_KEY]: ['menu'] }, 'activity')).toEqual({ kind: 'none' });
  });
});

describe('history state helpers', () => {
  it('reads pushed modals defensively', () => {
    expect(getPushedModals(undefined)).toEqual([]);
    expect(getPushedModals({ [URL_MODAL_STATE_KEY]: 'nope' })).toEqual([]);
    expect(getPushedModals({ [URL_MODAL_STATE_KEY]: ['a', 3, 'b'] })).toEqual(['a', 'b']);
  });

  it('counts the entries to unwind when leaving the page', () => {
    expect(stepsToLeaveModals({ [URL_MODAL_STATE_KEY]: ['exercise', 'saveAs'] })).toBe(2);
    expect(stepsToLeaveModals(null)).toBe(0);
  });
});
