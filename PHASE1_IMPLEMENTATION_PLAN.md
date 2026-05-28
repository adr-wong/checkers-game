# Phase 1 Implementation Plan: Shared Package

## Execution Order

### Task 1.1: Create package structure
- Create `packages/shared/` directory
- Create `packages/shared/src/` subdirectory  
- Create `packages/shared/package.json` with:
  - "name": "@checkers/shared"
  - "type": "module"
  - TypeScript configuration pointing to src/

### Task 1.2: Define types in types.ts
- Define `Team` = "red" | "black"
- Define `PieceType` = "normal" | "king"
- Define `Cell` = { piece: { team: Team; type: PieceType } | null } (per PRD spec)
- Define `Move` = { from: [number, number]; to: [number, number]; captures: [number, number][]; promotion: boolean }
- Define `GameOverResult` = { winner: Team | "draw" }
- Export all types

### Task 1.3: Implement parseBoardString in board.ts
- Input validation: verify string length equals size²
- Iterate through string, converting each char to Cell object
- '-' → Cell with null piece (light square, never has pieces)
- '#' → Cell with null piece (dark square, empty)
- 'r', 'R', 'b', 'B' → Cell with piece object

### Task 1.4: Implement serializeBoardString in board.ts
- Input validation: verify 2D array dimensions match size
- Flatten 2D array to string
- Cell with null piece and dark square (inferred) → '#'  
- Cell with null piece and light square → '-'
- Cell with piece → appropriate char ('r', 'R', 'b', 'B') based on square type

### Task 1.5: Implement isPlayableSquare helper
- Use (row + col) % 2 !== 0 to determine playable (dark) squares
- Needed for move validation since Cell doesn't store square type

### Task 1.6: Implement getLegalMovesFromPiece helper
- Recursive function to find all moves (including multi-jumps) from a single piece
- Returns moves starting from position, continuing after captures if possible
- Handles promotion ending jump chain during multi-jump

### Task 1.7: Implement getLegalMoves in board.ts
- For each piece of the specified team, generate potential moves
- Normal pieces: diagonal forward one square
- Kings: diagonal any direction one square
- Validate destination is empty and on dark square
- If captures exist → filter to return only capture moves (mandatory capture)
- For capture moves → calculate captured piece position between from/to
- Handle multi-jump: recursively find continued jumps after capture
- Check promotion when piece reaches opponent's back rank

### Task 1.8: Implement applyMove in board.ts
- Create deep copy of board (no mutation)
- Move piece from source to destination
- Clear captured pieces from board
- Handle promotion: change normal piece to king when reaching back rank
- Return new board state

### Task 1.9: Implement isGameOver in board.ts
- Count pieces for each team
- Check if either team has zero pieces
- Get legal moves for red team → if none, black wins
- Get legal moves for black team → if none, red wins
- Check for draw conditions (no captures in 40 moves, or fewer than 5 pieces total)
- Return null if game still active

### Task 1.10: Write unit tests
- Create test file for board utilities

## Edge Cases & Gotchas

1. **Multi-jump moves**: A piece may capture multiple pieces in sequence; `getLegalMoves` must return each complete sequence as separate moves. Build-up of captures array must be ordered correctly.

2. **Mandatory capture rule**: If any capture exists on the board, all non-capture moves must be filtered out. Must check all pieces for captures before returning any regular moves.

3. **Promotion during multi-jump**: Piece reaching back rank promotes and ends jump chain immediately (cannot continue jumping as king in same turn). This affects recursive move generation.

4. **Board size parameterization**: All functions must accept `size` parameter. Back rank is always row 0 for red and row (size-1) for black.

5. **Immutable updates**: `applyMove` must return new array, not mutate input. Use JSON.parse(JSON.stringify()) or manual deep copy.

6. **Light squares handling**: Logic must skip light squares ('-') for move generation - pieces only exist on dark squares.

7. **Empty captures array**: Regular moves have empty captures array `[]`, not undefined/null.

8. **Draw detection**: The 40-move draw rule requires history tracking, but `isGameOver` only receives the board. Basic implementation can check for "blocked" positions (no captures possible and no moves) as stalemate = draw.

9. **Capture position calculation**: When moving diagonally, the captured piece is at the midpoint: row 2, col 2 moves → captures at row 1, col 1 (the midpoint).

10. **10x10 board offset**: Initial piece placement rows differ (rows 0-3 for one team, 6-9 for other on 10x10). But `getLegalMoves` only cares about rule enforcement, not initial setup.

## Suggested Test Cases

### parseBoardString
- Valid 8x8 board string → correct 2D array
- Valid 10x10 board string → correct 2D array
- Invalid length string → throw error or handle gracefully
- All piece types present in result

### serializeBoardString  
- Round-trip: parse then serialize returns original string
- Board with mixed piece types → correct serialization
- Empty dark square → '#' in output

### getLegalMoves
- Empty board → empty array
- Piece with no valid moves → empty array
- Normal piece forward moves → correct destinations
- Normal piece blocked by own pieces → no moves
- Capture available → only capture moves returned
- Multi-jump sequence → all capture positions in captures array
- King moves in all directions → correct destinations
- No captures available → all non-capture moves returned
- Forced capture when multiple pieces have optional captures
- Red piece at row 7 (promotion row) → can still move diagonally
- Black piece at row 0 (promotion row) → can still move diagonally
- Verify mandatory capture with mixed move options

### applyMove
- Simple move → piece relocated correctly
- Move with capture → piece removed from board
- Multi-capture move → all captured pieces removed
- Promotion to king → piece type changes correctly
- Non-mutating → original board unchanged (deep equality check)
- Promotion during multi-capture → stops after single capture

### isGameOver
- Game in progress → null
- One team has all pieces captured → other team wins
- Neither team has legal moves → draw (stalemate)
- Board with empty cells → still game over if no legal moves
- Single piece remaining but can move → not game over

## Dependencies & Prerequisites

- Bun runtime with TypeScript support (project standard)
- Test framework - Bun's built-in test runner or Vitest (check project setup)
- No external dependencies required for shared package (pure TypeScript)