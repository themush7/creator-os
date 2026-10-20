import { describe, expect, it, vi } from 'vitest';
import { animateSpring, project, rubberband } from './spring';

describe('spring helpers', () => {
  it('projects a flick forward and is symmetric', () => {
    expect(project(1000)).toBeCloseTo(499, 0);
    expect(project(-1000)).toBeCloseTo(-499, 0);
    expect(project(0)).toBe(0);
  });

  it('rubber-bands with diminishing returns', () => {
    const a = rubberband(100, 800);
    const b = rubberband(200, 800);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(100);
    expect(b - a).toBeLessThan(a);
    expect(rubberband(-100, 800)).toBeCloseTo(-a);
  });

  it('settles on the target without overshoot when critically damped', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] });
    const values: number[] = [];
    let done = false;
    animateSpring({
      from: 0,
      to: 100,
      onUpdate: (v) => values.push(v),
      onComplete: () => (done = true),
    });
    vi.advanceTimersByTime(2000);
    vi.useRealTimers();
    expect(done).toBe(true);
    expect(values.at(-1)).toBe(100);
    expect(Math.max(...values)).toBeLessThanOrEqual(100.5);
  });
});
