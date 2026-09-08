import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import Fixture from './PopoverPair.fixture.svelte';
import VirtualFixture from './PopoverVirtual.fixture.svelte';

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

  it('positions the panel at a virtual anchor (mouse pointer)', async () => {
    render(VirtualFixture, { props: { x: 200, y: 300 } });
    await tick();
    await tick();

    const panel = screen.getByTestId('in-panel').closest('.notab-popover') as HTMLElement;
    // bottom-start off a zero-size point: left = x, top = y + 6px offset
    expect(panel.style.left).toBe('200px');
    expect(panel.style.top).toBe('306px');
  });
});
