export interface Position {
  x: number
  y: number
}

export interface TileState {
  id: number
  position: Position
  value: number
  previousPosition: Position | null
  mergedFrom: TileState[] | null
}

export type GridState = (TileState | null)[][]
