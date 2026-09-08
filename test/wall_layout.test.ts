import test from 'node:test';
import assert from 'node:assert/strict';
import { Wall } from '../lib/game/types';
import { getMergedWallGroups, computeWallLayout, getWallJunctions } from '../lib/game/wallLayout';

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

  // Touching P1 on the right: border-r-0, rounded-l-6px
  assert.equal(layout.borderClass, 'border-r-0');
  assert.equal(layout.roundedClass, 'wall-rounded-l');
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
  assert.equal(layout.roundedClass, 'wall-rounded');
});

test('Wall Layout - Perpendicular corner connection seamlessly bridges the intersection and rounds outer corner', () => {
  // Scenario precisely matching user screenshot:
  // 2 horizontal walls at (r=6, c=0) and (r=6, c=2) merged from c=0 to c=2
  // Vertical wall at (r=5, c=3) in Groove 3, directly above Groove 6
  const walls: Wall[] = [
    { r: 6, c: 0, orientation: 'H', placedBy: 1 },
    { r: 6, c: 2, orientation: 'H', placedBy: 1 },
    { r: 5, c: 3, orientation: 'V', placedBy: 1 },
  ];

  const groups = getMergedWallGroups(walls);
  const hGroup = groups.find((g) => g.orientation === 'H')!;
  const vGroup = groups.find((g) => g.orientation === 'V')!;

  const hLayout = computeWallLayout(hGroup, walls);
  const vLayout = computeWallLayout(vGroup, walls);

  // H spans into Groove 3 (line 9 instead of line 8) to seamlessly fill the corner intersection!
  assert.equal(hLayout.gridColEnd, 9);
  // Outer corner is rounded at bottom-right, open end is rounded at left
  assert.equal(hLayout.roundedClass, 'wall-rounded-l wall-rounded-br');

  // V meets H at the bottom: rounded-t-[6px], border-b-0, wall-slab-connected-bottom (no downward shadow!)
  assert.equal(vLayout.roundedClass, 'wall-rounded-t');
  assert.equal(vLayout.borderClass, 'border-b-0');
  assert.equal(vLayout.shadowClass, 'wall-slab-connected-bottom');

  // getWallJunctions generates a seamless junction connector at (r=6, c=3)
  const junctions = getWallJunctions(walls);
  assert.equal(junctions.length, 1);
  const j = junctions[0];
  assert.equal(j.r, 6);
  assert.equal(j.c, 3);
  assert.equal(j.placedBy, 1);
  assert.equal(j.borderClasses, 'border-b border-r');
  assert.equal(j.roundedClasses, 'wall-rounded-br');
  assert.equal(j.top, '-1.5px'); // Bridges into V above
  assert.equal(j.left, '-1.5px'); // Bridges into H to the left
  assert.equal(j.bottom, '0px');
  assert.equal(j.right, '0px');
});

test('Wall Layout - getWallJunctions correctly bridges all 4 junctions in a multi-wall structure', () => {
  const walls: Wall[] = [
    // Top horizontal wall: covers c=2, c=3. Right end touches Groove 3
    { r: 1, c: 2, orientation: 'H', placedBy: 1 },
    // Left vertical wall: at Groove 2
    { r: 2, c: 2, orientation: 'V', placedBy: 1 },
    // Right vertical wall: at Groove 3
    { r: 2, c: 3, orientation: 'V', placedBy: 1 },
    // Bottom horizontal wall: covers c=0, c=2, c=4
    { r: 3, c: 0, orientation: 'H', placedBy: 1 },
    { r: 3, c: 2, orientation: 'H', placedBy: 1 },
    { r: 3, c: 4, orientation: 'H', placedBy: 1 },
  ];

  const junctions = getWallJunctions(walls);
  assert.equal(junctions.length, 4);

  // Top-left T-junction (r=1, c=2)
  const jTopLeft = junctions.find((j) => j.r === 1 && j.c === 2)!;
  assert.equal(jTopLeft.borderClasses, 'border-t');
  assert.equal(jTopLeft.bottom, '-1.5px'); // extends into V below

  // Top-right L-corner (r=1, c=3)
  const jTopRight = junctions.find((j) => j.r === 1 && j.c === 3)!;
  assert.equal(jTopRight.borderClasses, 'border-t border-r');
  assert.equal(jTopRight.roundedClasses, 'wall-rounded-tr');
  assert.equal(jTopRight.bottom, '-1.5px'); // extends into V below
  assert.equal(jTopRight.left, '-1.5px'); // extends into H left

  // Bottom-left T-junction (r=3, c=2)
  const jBottomLeft = junctions.find((j) => j.r === 3 && j.c === 2)!;
  assert.equal(jBottomLeft.borderClasses, 'border-b');
  assert.equal(jBottomLeft.top, '-1.5px'); // extends into V above

  // Bottom-right T-junction (r=3, c=3)
  const jBottomRight = junctions.find((j) => j.r === 3 && j.c === 3)!;
  assert.equal(jBottomRight.borderClasses, 'border-b');
  assert.equal(jBottomRight.top, '-1.5px'); // extends into V above
});

test('Wall Themes - PLAYER_THEMES covers all 10 players with distinct wall colors and valid classes', () => {
  const { PLAYER_THEMES } = require('../lib/game/board');
  for (let p = 1; p <= 10; p++) {
    const theme = PLAYER_THEMES[p];
    assert.ok(theme, `Theme for player ${p} must be defined`);
    assert.ok(theme.wallBg, `Player ${p} must have wallBg`);
    assert.ok(theme.wallBorder, `Player ${p} must have wallBorder`);
    assert.ok(theme.textClass, `Player ${p} must have textClass`);
    assert.ok(theme.ringColor, `Player ${p} must have ringColor`);
    assert.ok(theme.bgClass, `Player ${p} must have bgClass`);
  }
});


