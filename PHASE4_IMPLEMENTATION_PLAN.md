# Phase 4 Implementation Plan: Web API

## Overview
Phase 4 focuses on implementing the Web API service that will handle game management, move validation, and AI integration. This phase builds upon the shared package (Phase 1) and will work with the AI microservice (Phase 2) and MongoDB setup (Phase 3).

## Key Changes from Original Vision

1. **Ruleset Support**: The API must handle multiple checkers variants, not just standard English draughts
2. **Enhanced Move Validation**: Moves now include ruleset context for proper validation
3. **Complex Game Logic**: Support for advanced rules like flying kings, backward captures, etc.
4. **Ruleset Validation**: Games include a ruleset field that must be validated on creation

## Execution Order

### Task 4.1: Scaffold Hono API Structure
- Create `apps/web/server/` directory
- Set up Hono server with proper TypeScript configuration
- Create base router structure
- Add environment variable support for MongoDB and AI service URLs

### Task 4.2: Implement Core API Utilities
- Create `apps/web/server/utils/` directory
- Implement ruleset validation middleware
- Create game state management utilities
- Add error handling middleware
- Implement CORS configuration

### Task 4.3: Implement POST /api/game (Game Creation)
- Validate ruleset using shared package's validateRuleSet
- Create initial board using buildStandardLayout or buildCustomLayout
- Set up game document in MongoDB with proper schema
- Return game ID and initial state
- Handle different game modes (pvp, pva, ava)

### Task 4.4: Implement GET /api/game/:gameId/state
- Fetch game from MongoDB
- Return current game state including:
  - Board string
  - Current turn
  - Game status
  - Move count
  - Ruleset information
- Handle 404 for non-existent games

### Task 4.5: Implement GET /api/game/:gameId/legal
- Parse board string using parseBoardString from shared package
- Use getLegalMoves to generate legal moves for current player
- Return array of legal moves with proper formatting
- Handle query parameters for specific piece positions

### Task 4.6: Implement POST /api/game/:gameId/move
- Validate it's the correct player's turn
- Parse and validate the move using shared package utilities
- Apply move using applyMove function
- Update game state in MongoDB
- Add move to history
- Check for game over condition using isGameOver
- If AI turn follows and game is pva/ava mode:
  - Call AI microservice with proper ruleset context
  - Validate AI response
  - Apply AI move
  - Update game state again
- Return updated game state

### Task 4.7: Implement POST /api/game/:gameId/resign
- Validate it's the correct player resigning
- Update game status to reflect winner
- Add resignation to game history
- Return final game state

### Task 4.8: Implement AI Integration Layer
- Create AI service client with proper error handling
- Implement retry logic for AI service calls
- Add timeout handling (10 seconds max)
- Validate AI responses match expected format
- Handle different difficulty levels properly

### Task 4.9: Implement Ruleset-Specific Logic
- Add middleware to validate ruleset consistency
- Ensure all moves are validated against current ruleset
- Handle ruleset changes (if allowed in future)
- Add ruleset information to all API responses

### Task 4.10: Write Integration Tests
- Test game creation with different rulesets
- Test move validation and application
- Test AI integration flow
- Test game over detection
- Test error cases and edge conditions

## Technical Implementation Details

### API Response Format
All successful responses should return:
```typescript
{
  success: boolean;
  data?: any;  // Response-specific data
  error?: string;  // Error message if applicable
  ruleset?: RuleSet;  // Current ruleset information
  timestamp: string;  // ISO timestamp
}
```

### Error Handling
- 400: Invalid input (validation failures)
- 401: Unauthorized (if authentication added later)
- 404: Game not found
- 409: Conflict (invalid move, wrong turn, etc.)
- 422: Unprocessable entity (game over, no legal moves)
- 500: Internal server error
- 503: AI service unavailable

### AI Service Integration
When calling the AI service:
1. Include full ruleset in the request context
2. Validate AI response includes correct ruleset
3. Handle timeout and retry scenarios
4. Log AI service performance metrics

### Ruleset Validation Flow
1. On game creation: validate ruleset using validateRuleSet
2. On each move: ensure move.ruleset matches game.ruleset
3. When applying moves: use ruleset from game state
4. When generating legal moves: use current ruleset

## Edge Cases & Gotchas

1. **Ruleset Mismatch**: Ensure moves generated with one ruleset aren't applied to games with different rulesets
2. **AI Ruleset Context**: AI service must receive and respect the current ruleset
3. **Complex Move Validation**: Multi-jump moves with promotions must be properly validated
4. **Game State Consistency**: Ensure atomic updates when applying player + AI moves
5. **Ruleset Evolution**: Consider how to handle potential ruleset changes mid-game (currently not supported)

## Testing Strategy

1. **Unit Tests**: Test individual API endpoints in isolation
2. **Integration Tests**: Test complete flows (create game → make moves → game over)
3. **Ruleset Tests**: Test each supported ruleset variant
4. **AI Integration Tests**: Test with mock AI service and real AI service
5. **Error Path Testing**: Test all error conditions and edge cases

## Dependencies

- Shared package (@checkers/shared) with all board utilities
- MongoDB connection and game model
- AI microservice (for pva/ava modes)
- Hono framework
- Environment variables for service URLs and ports

## Success Criteria

- All API endpoints implemented and tested
- Full ruleset support working correctly
- AI integration functioning properly
- All error cases handled gracefully
- Performance acceptable (AI moves < 10s on hard difficulty)
- Code follows project conventions and TypeScript best practices