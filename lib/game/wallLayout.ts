import { Wall, WallOrientation } from '@/lib/game/types';

export interface MergedWallGroup {
  orientation: WallOrientation;
  placedBy: 1 | 2;
  r: number;
  c: number;
  rStart: number;
  rEnd: number;
  cStart: number;
  cEnd: number;
  isLatest: boolean;
  wallIds: string[];
}

export interface WallLayout {
  gridRowStart: number;
  gridRowEnd: number;
  gridColStart: number;
  gridColEnd: number;
  roundedClass: string;
  borderClass: string;
  marginRight?: string;
  marginLeft?: string;
  marginTop?: string;
  marginBottom?: string;
}

/**
 * Merges contiguous collinear walls placed by the same player into a single
 * visual entity. This eliminates DOM element boundaries between same-player
 * walls, completely removing subpixel seams, step notches, and drop-shadow bleed.
 */
export function getMergedWallGroups(walls: Wall[]): MergedWallGroup[] {
  if (!walls || walls.length === 0) return [];

  const latestIndex = walls.length - 1;
  const groups: MergedWallGroup[] = [];

  // 1. Group Horizontal walls by (placedBy, r)
  const hMap = new Map<string, Array<{ wall: Wall; index: number }>>();
  walls.forEach((wall, index) => {
    if (wall.orientation === 'H') {
      const key = `${wall.placedBy}-${wall.r}`;
      if (!hMap.has(key)) hMap.set(key, []);
      hMap.get(key)!.push({ wall, index });
    }
  });

  hMap.forEach((list) => {
    list.sort((a, b) => a.wall.c - b.wall.c);
    let curRun = [list[0]];
    for (let i = 1; i < list.length; i++) {
      if (list[i].wall.c === curRun[curRun.length - 1].wall.c + 2) {
        curRun.push(list[i]);
      } else {
        groups.push({
          orientation: 'H',
          placedBy: curRun[0].wall.placedBy,
          r: curRun[0].wall.r,
          c: curRun[0].wall.c,
          rStart: curRun[0].wall.r,
          rEnd: curRun[0].wall.r,
          cStart: curRun[0].wall.c,
          cEnd: curRun[curRun.length - 1].wall.c,
          isLatest: curRun.some((item) => item.index === latestIndex),
          wallIds: curRun.map((item) => `wall-${item.index}`),
        });
        curRun = [list[i]];
      }
    }
    groups.push({
      orientation: 'H',
      placedBy: curRun[0].wall.placedBy,
      r: curRun[0].wall.r,
      c: curRun[0].wall.c,
      rStart: curRun[0].wall.r,
      rEnd: curRun[0].wall.r,
      cStart: curRun[0].wall.c,
      cEnd: curRun[curRun.length - 1].wall.c,
      isLatest: curRun.some((item) => item.index === latestIndex),
      wallIds: curRun.map((item) => `wall-${item.index}`),
    });
  });

  // 2. Group Vertical walls by (placedBy, c)
  const vMap = new Map<string, Array<{ wall: Wall; index: number }>>();
  walls.forEach((wall, index) => {
    if (wall.orientation === 'V') {
      const key = `${wall.placedBy}-${wall.c}`;
      if (!vMap.has(key)) vMap.set(key, []);
      vMap.get(key)!.push({ wall, index });
    }
  });

  vMap.forEach((list) => {
    list.sort((a, b) => a.wall.r - b.wall.r);
    let curRun = [list[0]];
    for (let i = 1; i < list.length; i++) {
      if (list[i].wall.r === curRun[curRun.length - 1].wall.r + 2) {
        curRun.push(list[i]);
      } else {
        groups.push({
          orientation: 'V',
          placedBy: curRun[0].wall.placedBy,
          r: curRun[0].wall.r,
          c: curRun[0].wall.c,
          rStart: curRun[0].wall.r,
          rEnd: curRun[curRun.length - 1].wall.r,
          cStart: curRun[0].wall.c,
          cEnd: curRun[0].wall.c,
          isLatest: curRun.some((item) => item.index === latestIndex),
          wallIds: curRun.map((item) => `wall-${item.index}`),
        });
        curRun = [list[i]];
      }
    }
    groups.push({
      orientation: 'V',
      placedBy: curRun[0].wall.placedBy,
      r: curRun[0].wall.r,
      c: curRun[0].wall.c,
      rStart: curRun[0].wall.r,
      rEnd: curRun[curRun.length - 1].wall.r,
      cStart: curRun[0].wall.c,
      cEnd: curRun[0].wall.c,
      isLatest: curRun.some((item) => item.index === latestIndex),
      wallIds: curRun.map((item) => `wall-${item.index}`),
    });
  });

  return groups;
}

/**
 * Computes the exact grid tracks, corner rounding, border masking,
 * and micro-overlap offsets for a wall group or single wall segment.
 */
export function computeWallLayout(
  group: MergedWallGroup | { r: number; c: number; orientation: WallOrientation; placedBy?: 1 | 2 },
  allWalls: Wall[]
): WallLayout {
  const isH = group.orientation === 'H';
  const placedBy = 'placedBy' in group ? group.placedBy : undefined;
  const rStart = 'rStart' in group ? group.rStart : group.r;
  const rEnd = 'rEnd' in group ? group.rEnd : group.r;
  const cStart = 'cStart' in group ? group.cStart : group.c;
  const cEnd = 'cEnd' in group ? group.cEnd : group.c;
  const r = group.r;
  const c = group.c;

  if (isH) {
    const gridRowStart = 2 * r + 2;
    const gridRowEnd = 2 * r + 3;
    const gridColStart = 2 * cStart + 1;
    let gridColEnd = 2 * cEnd + 4;

    // Collinear horizontal neighbors
    const hasRightCollinear = allWalls.some(
      (w) => w.orientation === 'H' && w.r === r && w.c === cEnd + 2
    );
    const hasLeftCollinear = allWalls.some(
      (w) => w.orientation === 'H' && w.r === r && w.c === cStart - 2
    );

    // If there is an adjacent horizontal wall directly to the right, span across the groove track
    if (hasRightCollinear) {
      gridColEnd = 2 * cEnd + 5;
    }

    // Perpendicular vertical walls meeting at either end
    const meetsVerticalLeft = allWalls.some(
      (w) =>
        w.orientation === 'V' &&
        w.c === cStart - 1 &&
        (w.r === r || w.r === r - 1 || w.r === r + 1)
    );
    const meetsVerticalRight = allWalls.some(
      (w) =>
        w.orientation === 'V' &&
        w.c === cEnd + 1 &&
        (w.r === r || w.r === r - 1 || w.r === r + 1)
    );

    // Same-player perpendicular vertical wall meetings (for micro-overlap fusing)
    const meetsSamePlayerLeft = allWalls.some(
      (w) =>
        w.placedBy === placedBy &&
        w.orientation === 'V' &&
        w.c === cStart - 1 &&
        (w.r === r || w.r === r - 1 || w.r === r + 1)
    );
    const meetsSamePlayerRight = allWalls.some(
      (w) =>
        w.placedBy === placedBy &&
        w.orientation === 'V' &&
        w.c === cEnd + 1 &&
        (w.r === r || w.r === r - 1 || w.r === r + 1)
    );

    const connectRight = hasRightCollinear || meetsVerticalRight;
    const connectLeft = hasLeftCollinear || meetsVerticalLeft;

    let roundedClass = 'rounded-[3px]';
    let borderClass = '';

    if (connectLeft && connectRight) {
      roundedClass = 'rounded-none';
      borderClass = 'border-x-0';
    } else if (connectLeft) {
      roundedClass = 'rounded-l-none rounded-r-[3px]';
      borderClass = 'border-l-0';
    } else if (connectRight) {
      roundedClass = 'rounded-r-none rounded-l-[3px]';
      borderClass = 'border-r-0';
    }

    // Micro-overlap by 1px to seamlessly eliminate subpixel seams
    let marginRight: string | undefined;
    let marginLeft: string | undefined;

    if (hasRightCollinear || meetsSamePlayerRight) {
      marginRight = '-1px';
    }
    if (meetsSamePlayerLeft) {
      marginLeft = '-1px';
    }

    return {
      gridRowStart,
      gridRowEnd,
      gridColStart,
      gridColEnd,
      roundedClass,
      borderClass,
      marginRight,
      marginLeft,
    };
  } else {
    // Vertical wall
    const gridRowStart = 2 * rStart + 1;
    let gridRowEnd = 2 * rEnd + 4;
    const gridColStart = 2 * c + 2;
    const gridColEnd = 2 * c + 3;

    // Collinear vertical neighbors
    const hasBottomCollinear = allWalls.some(
      (w) => w.orientation === 'V' && w.c === c && w.r === rEnd + 2
    );
    const hasTopCollinear = allWalls.some(
      (w) => w.orientation === 'V' && w.c === c && w.r === rStart - 2
    );

    // If there is an adjacent vertical wall directly below, span across the groove track
    if (hasBottomCollinear) {
      gridRowEnd = 2 * rEnd + 5;
    }

    // Perpendicular horizontal walls meeting at either end
    const meetsHorizontalTop = allWalls.some(
      (w) =>
        w.orientation === 'H' &&
        w.r === rStart - 1 &&
        (w.c === c || w.c === c - 1 || w.c === c + 1)
    );
    const meetsHorizontalBottom = allWalls.some(
      (w) =>
        w.orientation === 'H' &&
        w.r === rEnd + 1 &&
        (w.c === c || w.c === c - 1 || w.c === c + 1)
    );

    // Same-player perpendicular horizontal wall meetings (for micro-overlap fusing)
    const meetsSamePlayerTop = allWalls.some(
      (w) =>
        w.placedBy === placedBy &&
        w.orientation === 'H' &&
        w.r === rStart - 1 &&
        (w.c === c || w.c === c - 1 || w.c === c + 1)
    );
    const meetsSamePlayerBottom = allWalls.some(
      (w) =>
        w.placedBy === placedBy &&
        w.orientation === 'H' &&
        w.r === rEnd + 1 &&
        (w.c === c || w.c === c - 1 || w.c === c + 1)
    );

    const connectBottom = hasBottomCollinear || meetsHorizontalBottom;
    const connectTop = hasTopCollinear || meetsHorizontalTop;

    let roundedClass = 'rounded-[3px]';
    let borderClass = '';

    if (connectTop && connectBottom) {
      roundedClass = 'rounded-none';
      borderClass = 'border-y-0';
    } else if (connectTop) {
      roundedClass = 'rounded-t-none rounded-b-[3px]';
      borderClass = 'border-t-0';
    } else if (connectBottom) {
      roundedClass = 'rounded-b-none rounded-t-[3px]';
      borderClass = 'border-b-0';
    }

    // Micro-overlap by 1px to seamlessly eliminate subpixel seams
    let marginBottom: string | undefined;
    let marginTop: string | undefined;

    if (hasBottomCollinear || meetsSamePlayerBottom) {
      marginBottom = '-1px';
    }
    if (meetsSamePlayerTop) {
      marginTop = '-1px';
    }

    return {
      gridRowStart,
      gridRowEnd,
      gridColStart,
      gridColEnd,
      roundedClass,
      borderClass,
      marginBottom,
      marginTop,
    };
  }
}
