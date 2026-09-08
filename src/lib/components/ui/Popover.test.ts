import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import Fixture from './PopoverPair.fixture.svelte';

/**
 * A Select's dropdown lives inside its own <Popover>, portaled to <body> as a
 * sibling of the popover it was opened from. A pointerdown on one of its
 * options must NOT be treated as an "outside" click by the outer popover —
 * otherwise picking a fane in the calendar "Nytt notat" popover closes the
 * whole popover before the note can be added.
 */
describe('Popover — nested / layered popovers', () => {
  it('stays open when a pointerdown lands inside another popover layer', async () => {
    render(Fixture);
    await tick();

    screen.getByTestId('in-b').dispatchEvent(
      new Event('pointerdown', { bubbles: true }),
    );
    await tick();

    expect(screen.getByTestId('a-state').textContent).toBe('open');
  });

  it('still closes on a genuine outside pointerdown', async () => {
    render(Fixture);
    await tick();

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await tick();

    expect(screen.getByTestId('a-state').textContent).toBe('closed');
  });
});
