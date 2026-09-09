export type FocusEntryEdge =
    | 'WEST' | 'EAST' | 'NORTH' | 'SOUTH'
    | 'NORTH_WEST' | 'NORTH_EAST' | 'SOUTH_WEST' | 'SOUTH_EAST'
    | null;

export interface FocusDirection {
    dx: number;
    dy: number;
    angleDegrees: number;
}

export function focusDirectionForCells(
    sourceCell: number | null | undefined,
    targetCell: number | null | undefined,
    width: number,
): FocusDirection | null {
    if (sourceCell === null || sourceCell === undefined || targetCell === null || targetCell === undefined) {
        return null;
    }
    const sourceX = (sourceCell % width) + 0.5;
    const sourceY = Math.floor(sourceCell / width) + 0.5;
    const targetX = (targetCell % width) + 0.5;
    const targetY = Math.floor(targetCell / width) + 0.5;
    let dx = targetX - sourceX;
    if (dx > width / 2) dx -= width;
    if (dx < -width / 2) dx += width;
    const dy = targetY - sourceY;
    const length = Math.hypot(dx, dy);
    if (length < 0.0001) return null;
    const ndx = dx / length;
    const ndy = dy / length;
    return { dx: ndx, dy: ndy, angleDegrees: Math.atan2(ndy, ndx) * 180 / Math.PI };
}

export function focusEntryEdgeForCells(
    parentCell: number | null | undefined,
    cell: number,
    width: number,
): FocusEntryEdge {
    if (parentCell === null || parentCell === undefined) return null;
    const parentX = parentCell % width;
    const parentY = Math.floor(parentCell / width);
    const cellX = cell % width;
    const cellY = Math.floor(cell / width);
    let dx = parentX - cellX;
    if (dx > width / 2) dx -= width;
    if (dx < -width / 2) dx += width;
    const dy = parentY - cellY;
    if (dx === -1 && dy === 0) return 'WEST';
    if (dx === 1 && dy === 0) return 'EAST';
    if (dx === 0 && dy === -1) return 'NORTH';
    if (dx === 0 && dy === 1) return 'SOUTH';
    if (dx === -1 && dy === -1) return 'NORTH_WEST';
    if (dx === 1 && dy === -1) return 'NORTH_EAST';
    if (dx === -1 && dy === 1) return 'SOUTH_WEST';
    if (dx === 1 && dy === 1) return 'SOUTH_EAST';
    return null;
}
