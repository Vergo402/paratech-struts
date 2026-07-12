// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingStack } from './FloatingStack';

// Regression guard for the Pointer Events L3 click-retarget bug: capturing the
// wrapper on pointerdown makes Chromium retarget the synthesized click to the
// wrapper, so the child <button>s never fire. The fix captures lazily — only
// once travel crosses the drag threshold. jsdom can't synthesize click from
// pointer events, so we assert the actual contract that changed: no capture on
// a plain tap; capture once the pointer moves past 6px.
beforeAll(() => {
  // jsdom stubs these as throwing "Not implemented"; make them spy-able no-ops.
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

function renderStack() {
  const onInventory = vi.fn();
  const onChecklist = vi.fn();
  render(
    <FloatingStack
      inventoryOpen={false}
      onInventory={onInventory}
      checklistOpen={false}
      onChecklist={onChecklist}
    />,
  );
  return { onInventory, onChecklist };
}

describe('FloatingStack', () => {
  it('does not capture the pointer on a plain tap (so the child button click survives)', () => {
    const capture = Element.prototype.setPointerCapture as ReturnType<typeof vi.fn>;
    capture.mockClear();
    const { onInventory } = renderStack();
    const btn = screen.getByLabelText('Open inventory summary');

    fireEvent.pointerDown(btn, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(btn, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.click(btn);

    expect(capture).not.toHaveBeenCalled();
    expect(onInventory).toHaveBeenCalledTimes(1);
  });

  it('captures the pointer once travel crosses the drag threshold', () => {
    const capture = Element.prototype.setPointerCapture as ReturnType<typeof vi.fn>;
    capture.mockClear();
    renderStack();
    const stack = document.querySelector('.fs-stack') as HTMLElement;

    fireEvent.pointerDown(stack, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stack, { pointerId: 1, clientX: 100, clientY: 120 }); // >6px

    expect(capture).toHaveBeenCalledTimes(1);
  });
});
