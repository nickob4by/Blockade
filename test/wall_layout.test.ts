import test from 'node:test';
import assert from 'node:assert/strict';
import { Wall } from '../lib/game/types';
import { getMergedWallGroups, computeWallLayout } from '../lib/game/wallLayout';

test('Wall Layout - getMergedWallGroups merges collinear same-player horizontal walls', () => {
  const walls: Wall[] = [
    { r: 0, c: 0, orientation: 'H', placedBy: 2 },
    { r: 0, c: 2, orientation: 'H', placedBy: 2 },
    { r: 0, c: 4, orientation: 'H', placedBy: 1 },
  ];

  const groups = getMergedWallGroups(walls);
  assert.equal(groups.length, 2, 'Should merge 2 adjacent P2 walls into 1 group, keeping P1 as separate group');

  const p2Group = groups.find((g) => g.placedBy === 2)!;
  assert.equal(p2Group.cStart, 0);
  assert.equal(p2Group.cEnd, 2);
  assert.equal(p2Group.orientation, 'H');
  assert.equal(p2Group.r, 0);

  const p1Group = groups.find((g) => g.placedBy === 1)!;
  assert.equal(p1Group.cStart, 4);
  assert.equal(p1Group.cEnd, 4);
  assert.equal(p1Group.orientation, 'H');
});

test('Wall Layout - computeWallLayout for collinear same-player wall has no internal seam and bridges to adjacent enemy wall', () => {
  const walls: Wall[] = [
    { r: 0, c: 0, orientation: 'H', placedBy: 2 },
    { r: 0, c: 2, orientation: 'H', placedBy: 2 },
    { r: 0, c: 4, orientation: 'H', placedBy: 1 },
  ];

  const groups = getMergedWallGroups(walls);
  const p2Group = groups.find((g) => g.placedBy === 2)!;
  const layout = computeWallLayout(p2Group, walls);

  // Row 0 is track 2
  assert.equal(layout.gridRowStart, 2);
  assert.equal(layout.gridRowEnd, 3);

  // Col starts at 1 (Cell 0)
  assert.equal(layout.gridColStart, 1);
  // Extends across Groove 3 (line 8 to 9) to touch P1 at line 9
  assert.equal(layout.gridColEnd, 9);

  // Touching P1 on the right: border-r-0, rounded-r-none, rounded-l-[3px]
  assert.equal(layout.borderClass, 'border-r-0');
  assert.equal(layout.roundedClass, 'rounded-r-none rounded-l-[3px]');
  // Negative margin on right for micro-overlap
  assert.equal(layout.marginRight, '-1px');
});

test('Wall Layout - getMergedWallGroups merges collinear same-player vertical walls', () => {
  const walls: Wall[] = [
    { r: 1, c: 2, orientation: 'V', placedBy: 1 },
    { r: 3, c: 2, orientation: 'V', placedBy: 1 },
  ];

  const groups = getMergedWallGroups(walls);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].rStart, 1);
  assert.equal(groups[0].rEnd, 3);
  assert.equal(groups[0].c, 2);

  const layout = computeWallLayout(groups[0], walls);
  assert.equal(layout.gridColStart, 6);
  assert.equal(layout.gridColEnd, 7);
  assert.equal(layout.gridRowStart, 3);
  assert.equal(layout.gridRowEnd, 10);
  assert.equal(layout.roundedClass, 'rounded-[3px]');
});

test('Wall Layout - Perpendicular corner connection flattens touching borders and rounds', () => {
  const walls: Wall[] = [
    { r: 0, c: 0, orientation: 'H', placedBy: 1 },
    { r: 0, c: 1, orientation: 'V', placedBy: 1 },
  ];

  const groups = getMergedWallGroups(walls);
  const hGroup = groups.find((g) => g.orientation === 'H')!;
  const vGroup = groups.find((g) => g.orientation === 'V')!;

  const hLayout = computeWallLayout(hGroup, walls);
  const vLayout = computeWallLayout(vGroup, walls);

  // H touches V on H's right end
  assert.equal(hLayout.borderClass, 'border-r-0');
  assert.equal(hLayout.roundedClass, 'rounded-r-none rounded-l-[3px]');
  assert.equal(hLayout.marginRight, '-1px');

  // Both should render cleanly
  assert.ok(vLayout);
});
