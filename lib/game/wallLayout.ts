import { PlayerId, Wall, WallOrientation } from '@/lib/game/types';

export interface MergedWallGroup {
  orientation: WallOrientation;
  placedBy: PlayerId;
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
  shadowClass: string;
  marginRight?: string;
  marginLeft?: string;
  marginTop?: string;
  marginBottom?: string;
  zIndex?: number;
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
 * and visual connection offsets for a wall group or single wall segment.
 * 
 * Uses explicit tactile wall classes (`wall-rounded-*`, `wall-slab-connected-bottom`)
 * so that corners are visibly rounded and no dark crease/shadow is cast onto connected walls.
 */
export function computeWallLayout(
  group: MergedWallGroup | { r: number; c: number; orientation: WallOrientation; placedBy?: 1 | 2 },
  allWalls: Wall[]
): WallLayout {
  const isH = group.orientation === 'H';
  const rStart = 'rStart' in group ? group.rStart : group.r;
  const rEnd = 'rEnd' in group ? group.rEnd : group.r;
  const cStart = 'cStart' in group ? group.cStart : group.c;
  const cEnd = 'cEnd' in group ? group.cEnd : group.c;
  const r = group.r;
  const c = group.c;

  if (isH) {
    const gridRowStart = 2 * r + 2;
    const gridRowEnd = 2 * r + 3;
    let gridColStart = 2 * cStart + 1;
    let gridColEnd = 2 * cEnd + 4;

    // Collinear horizontal neighbors
    const hasRightCollinear = allWalls.some(
      (w) => w.orientation === 'H' && w.r === r && w.c === cEnd + 2
    );
    const hasLeftCollinear = allWalls.some(
      (w) => w.orientation === 'H' && w.r === r && w.c === cStart - 2
    );

    // Perpendicular vertical walls meeting at the right end (Groove cEnd + 1)
    const vRightAbove = allWalls.some(
      (w) => w.orientation === 'V' && w.c === cEnd + 1 && (w.r === r - 1 || w.r === r)
    );
    const vRightBelow = allWalls.some(
      (w) => w.orientation === 'V' && w.c === cEnd + 1 && (w.r === r + 1 || w.r === r)
    );
    const meetsVerticalRight = vRightAbove || vRightBelow;

    // Perpendicular vertical walls meeting at the left end (Groove cStart - 1)
    const vLeftAbove = allWalls.some(
      (w) => w.orientation === 'V' && w.c === cStart - 1 && (w.r === r - 1 || w.r === r)
    );
    const vLeftBelow = allWalls.some(
      (w) => w.orientation === 'V' && w.c === cStart - 1 && (w.r === r + 1 || w.r === r)
    );
    const meetsVerticalLeft = vLeftAbove || vLeftBelow;

    // If there is an adjacent horizontal wall OR a vertical wall to the right,
    // span across Groove cEnd + 1 (into line 2 * cEnd + 5) to seamlessly connect the corner!
    if (hasRightCollinear || meetsVerticalRight) {
      gridColEnd = 2 * cEnd + 5;
    }

    // If there is an adjacent horizontal wall OR a vertical wall to the left,
    // span across Groove cStart - 1 (starting at line 2 * cStart) to seamlessly connect the corner!
    if (hasLeftCollinear || meetsVerticalLeft) {
      gridColStart = 2 * cStart;
    }

    // Determine corner rounding using explicit CSS classes
    let leftRounding = 'wall-rounded-l';
    if (hasLeftCollinear) {
      leftRounding = '';
    } else if (meetsVerticalLeft) {
      if (vLeftAbove && !vLeftBelow) {
        // Turns UP: outer corner is bottom-left
        leftRounding = 'wall-rounded-bl';
      } else if (vLeftBelow && !vLeftAbove) {
        // Turns DOWN: outer corner is top-left
        leftRounding = 'wall-rounded-tl';
      } else {
        leftRounding = '';
      }
    }

    let rightRounding = 'wall-rounded-r';
    if (hasRightCollinear) {
      rightRounding = '';
    } else if (meetsVerticalRight) {
      if (vRightAbove && !vRightBelow) {
        // Turns UP: outer corner is bottom-right (as shown in user screenshot)
        rightRounding = 'wall-rounded-br';
      } else if (vRightBelow && !vRightAbove) {
        // Turns DOWN: outer corner is top-right
        rightRounding = 'wall-rounded-tr';
      } else {
        rightRounding = '';
      }
    }

    let roundedClass = '';
    if (!meetsVerticalLeft && !meetsVerticalRight && !hasLeftCollinear && !hasRightCollinear) {
      roundedClass = 'wall-rounded';
    } else {
      roundedClass = [leftRounding, rightRounding].filter(Boolean).join(' ');
    }

    // Border suppression for collinear walls
    let borderClass = '';
    if (hasLeftCollinear && hasRightCollinear) {
      borderClass = 'border-x-0';
    } else if (hasLeftCollinear) {
      borderClass = 'border-l-0';
    } else if (hasRightCollinear) {
      borderClass = 'border-r-0';
    }

    // Micro-overlap by 1px to eliminate subpixel gaps
    let marginRight: string | undefined;
    let marginLeft: string | undefined;

    if (hasRightCollinear) {
      marginRight = '-1px';
    }
    if (hasLeftCollinear) {
      marginLeft = '-1px';
    }

    return {
      gridRowStart,
      gridRowEnd,
      gridColStart,
      gridColEnd,
      roundedClass,
      borderClass,
      shadowClass: 'wall-slab',
      marginRight,
      marginLeft,
    };
  } else {
    // Vertical wall
    let gridRowStart = 2 * rStart + 1;
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
    if (hasTopCollinear) {
      gridRowStart = 2 * rStart;
    }

    // Perpendicular horizontal walls meeting at either end
    // (Note: H extends across into the groove intersection, so V meets H's top or bottom edge)
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

    const connectTop = hasTopCollinear || meetsHorizontalTop;
    const connectBottom = hasBottomCollinear || meetsHorizontalBottom;

    const topRounding = connectTop ? '' : 'wall-rounded-t';
    const bottomRounding = connectBottom ? '' : 'wall-rounded-b';

    let roundedClass = '';
    if (!connectTop && !connectBottom) {
      roundedClass = 'wall-rounded';
    } else {
      roundedClass = [topRounding, bottomRounding].filter(Boolean).join(' ');
    }

    let borderClass = '';
    if (connectTop && connectBottom) {
      borderClass = 'border-y-0';
    } else if (connectTop) {
      borderClass = 'border-t-0';
    } else if (connectBottom) {
      borderClass = 'border-b-0';
    }

    // Suppress downward shadow on V when connecting to H at bottom to eliminate dark shadow crease
    const shadowClass = connectBottom ? 'wall-slab-connected-bottom' : 'wall-slab';

    let marginBottom: string | undefined;
    let marginTop: string | undefined;

    if (hasBottomCollinear) {
      marginBottom = '-1px';
    }
    if (hasTopCollinear) {
      marginTop = '-1px';
    }

    return {
      gridRowStart,
      gridRowEnd,
      gridColStart,
      gridColEnd,
      roundedClass,
      borderClass,
      shadowClass,
      marginBottom,
      marginTop,
      zIndex: 20,
    };
  }
}

export interface WallJunction {
  r: number;
  c: number;
  placedBy: PlayerId;
  gridRowStart: number;
  gridRowEnd: number;
  gridColStart: number;
  gridColEnd: number;
  top: string;
  bottom: string;
  left: string;
  right: string;
  borderClasses: string;
  roundedClasses: string;
  boxShadow?: string;
}

/**
 * Computes seamless intersection junction connectors for perpendicular walls of the same player.
 * These sit at zIndex: 25 and eliminate all internal border cutoffs, lines, and gaps between
 * horizontal and vertical walls, fusing them into a unified continuous structure.
 */
export function getWallJunctions(walls: Wall[]): WallJunction[] {
  const junctions: WallJunction[] = [];
  if (!walls || walls.length === 0) return junctions;

  const maxCoord = Math.max(...walls.map((w) => Math.max(w.r, w.c))) + 1;
  const maxLimit = Math.max(8, maxCoord);

  const players: PlayerId[] = [1, 2, 3, 4, 5, 6];

  for (let r = 0; r < maxLimit; r++) {
    for (let c = 0; c < maxLimit; c++) {
      for (const p of players) {
        const hasUp = walls.some(
          (w) => w.placedBy === p && w.orientation === 'V' && w.c === c && (w.r === r - 1 || w.r === r)
        );
        const hasDown = walls.some(
          (w) => w.placedBy === p && w.orientation === 'V' && w.c === c && (w.r === r || w.r === r + 1)
        );
        const hasLeft = walls.some(
          (w) => w.placedBy === p && w.orientation === 'H' && w.r === r && (w.c === c - 1 || w.c === c)
        );
        const hasRight = walls.some(
          (w) => w.placedBy === p && w.orientation === 'H' && w.r === r && (w.c === c || w.c === c + 1)
        );

        const vCount = (hasUp ? 1 : 0) + (hasDown ? 1 : 0);
        const hCount = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0);

        // A junction connects at least one vertical arm and at least one horizontal arm
        if (vCount > 0 && hCount > 0) {
          const borderTop = !hasUp ? 'border-t' : '';
          const borderBottom = !hasDown ? 'border-b' : '';
          const borderLeft = !hasLeft ? 'border-l' : '';
          const borderRight = !hasRight ? 'border-r' : '';
          const borderClasses = [borderTop, borderBottom, borderLeft, borderRight].filter(Boolean).join(' ');

          const roundedTL = !hasUp && !hasLeft ? 'wall-rounded-tl' : '';
          const roundedTR = !hasUp && !hasRight ? 'wall-rounded-tr' : '';
          const roundedBL = !hasDown && !hasLeft ? 'wall-rounded-bl' : '';
          const roundedBR = !hasDown && !hasRight ? 'wall-rounded-br' : '';
          const roundedClasses = [roundedTL, roundedTR, roundedBL, roundedBR].filter(Boolean).join(' ');

          // Top highlight inset if top edge is exterior
          const boxShadow = !hasUp ? 'inset 0 1px 0 rgba(255, 255, 255, 0.22)' : undefined;

          junctions.push({
            r,
            c,
            placedBy: p,
            gridRowStart: 2 * r + 2,
            gridRowEnd: 2 * r + 3,
            gridColStart: 2 * c + 2,
            gridColEnd: 2 * c + 3,
            top: hasUp ? '-1.5px' : '0px',
            bottom: hasDown ? '-1.5px' : '0px',
            left: hasLeft ? '-1.5px' : '0px',
            right: hasRight ? '-1.5px' : '0px',
            borderClasses,
            roundedClasses,
            boxShadow,
          });
        }
      }
    }
  }

  return junctions;
}

