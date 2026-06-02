import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { parseBoardString, serializeBoardString, applyMove } from "@checkers/shared";
import type { Team } from "@checkers/shared";
import { Board } from "~/components/Board";
import { AnimationOverlay } from "~/components/AnimationOverlay";
import { MoveLog } from "~/components/MoveLog";
import {
  getGameState,
  getLegalMoves,
  makeMove,
  resignGame,
  type GameState,
  type LegalMovesResponse,
  type MoveResponse,
} from "~/lib/api";

export const Route = createFileRoute("/game/$gameId")({
  component: GameComponent,
});

const POLL_INTERVAL = 1500;
const ANIMATION_DURATION = 300;

interface AnimationStep {
  from: [number, number];
  to: [number, number];
  captures: Array<[number, number]>;
  promotion: boolean;
  pieceColor: "red" | "black";
  pieceType: "normal" | "king";
}

function countPieces(board: string): { red: number; black: number } {
  let red = 0;
  let black = 0;
  for (const ch of board) {
    if (ch === "r" || ch === "R") red++;
    else if (ch === "b" || ch === "B") black++;
  }
  return { red, black };
}

function buildAnimationSequence(
  move: MoveResponse,
  currentState: GameState,
): AnimationStep[] {
  const cells = parseBoardString(currentState.board, currentState.ruleset);
  const fromCell = cells[move.from[0]]?.[move.from[1]];
  const pieceColor = fromCell?.piece?.team ?? currentState.turn;
  const pieceType = fromCell?.piece?.type ?? "normal";

  if (move.captures.length <= 1) {
    return [
      {
        from: move.from,
        to: move.to,
        captures: move.captures,
        promotion: move.promotion,
        pieceColor,
        pieceType,
      },
    ];
  }

  const sequence: AnimationStep[] = [];
  let currentPos = move.from;
  for (let i = 0; i < move.captures.length; i++) {
    const capturePos = move.captures[i]!;
    const isLast = i === move.captures.length - 1;
    sequence.push({
      from: currentPos,
      to: isLast ? move.to : capturePos,
      captures: [capturePos],
      promotion: isLast ? move.promotion : false,
      pieceColor,
      pieceType,
    });
    currentPos = capturePos;
  }
  return sequence;
}

function detectAIMoveFromBoards(
  intermediateBoard: string,
  finalBoard: string,
  ruleset: { boardSize: 8 | 10; [key: string]: unknown },
  aiTeam: Team,
): { from: [number, number]; to: [number, number]; captures: [number, number][]; promotion: boolean } | null {
  const intermediate = parseBoardString(intermediateBoard, ruleset as any);
  const final = parseBoardString(finalBoard, ruleset as any);

  const sources: [number, number][] = [];
  const destinations: [number, number][] = [];
  const captures: [number, number][] = [];

  for (let r = 0; r < intermediate.length; r++) {
    for (let c = 0; c < intermediate[r]!.length; c++) {
      const interPiece = intermediate[r]![c]!.piece;
      const finalPiece = final[r]![c]!.piece;

      if (interPiece && !finalPiece) {
        if (interPiece.team === aiTeam) {
          sources.push([r, c]);
        } else {
          captures.push([r, c]);
        }
      } else if (!interPiece && finalPiece && finalPiece.team === aiTeam) {
        destinations.push([r, c]);
      }
    }
  }

  if (sources.length >= 1 && destinations.length >= 1) {
    const to = destinations[destinations.length - 1]!;
    const destPiece = final[to[0]]![to[1]]!.piece;
    const promotion = destPiece?.type === "king";
    return {
      from: sources[0]!,
      to,
      captures,
      promotion,
    };
  }
  return null;
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#fff",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    fontFamily: "sans-serif",
    padding: "1rem",
  },
  statusBar: {
    display: "flex",
    gap: "2rem",
    border: "2px solid #000",
    padding: "0.5rem 1.5rem",
    marginBottom: "1rem",
    fontSize: "1rem",
  },
  statusItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
  },
  label: {
    fontWeight: "bold" as const,
  },
  resignButton: {
    backgroundColor: "#fff",
    color: "#000",
    border: "2px solid #000",
    padding: "0.5rem 1.5rem",
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: "1rem",
  },
};

function GameComponent() {
  const { gameId } = Route.useParams();
  const navigate = useNavigate();

  const [state, setState] = useState<GameState | null>(null);
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<LegalMovesResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [resigning, setResigning] = useState(false);
  const [lastMove, setLastMove] = useState<{
    from: [number, number];
    to: [number, number];
  } | null>(null);

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingPiece, setAnimatingPiece] = useState<{
    pieceColor: "red" | "black";
    pieceType: "normal" | "king";
    from: [number, number];
    to: [number, number];
  } | null>(null);
  const [capturedPositions, setCapturedPositions] = useState<
    Array<[number, number]>
  >([]);
  const [animProgress, setAnimProgress] = useState(0);

  // Refs for values needed inside rAF callbacks (avoids stale closures)
  const animationQueueRef = useRef<AnimationStep[]>([]);
  const nextServerStateRef = useRef<GameState | null>(null);
  const lastMoveRef = useRef<{ from: [number, number]; to: [number, number] } | null>(null);
  const preMoveBoardRef = useRef<string | null>(null);
  const playerMoveRef = useRef<MoveResponse | null>(null);
  const pendingAIMoveRef = useRef(false);

  // Refs for AVA animation detection
  const previousBoardRef = useRef<string | null>(null);
  const previousTurnRef = useRef<Team | null>(null);
  const previousMoveCountRef = useRef<number>(0);
  const isAnimatingRef = useRef(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const loadGame = useCallback(async () => {
    try {
      const s = await getGameState(gameId);
      // Skip state update during animation to prevent overwriting intermediate board
      if (!isAnimatingRef.current) {
        setState(s);
      }
    } catch {
      // ignore
    }
  }, [gameId]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (state && state.status !== "active") {
      navigate({ to: "/game/$gameId/end", params: { gameId } });
    }
  }, [state, gameId, navigate]);

  // Detect AVA moves from polling and trigger animation
  useEffect(() => {
    if (
      !state ||
      state.status !== "active" ||
      state.mode !== "ava" ||
      isAnimating
    ) {
      // Track state for next comparison
      if (state) {
        previousBoardRef.current = state.board;
        previousTurnRef.current = state.turn;
        previousMoveCountRef.current = state.move_count;
      }
      return;
    }

    const prevBoard = previousBoardRef.current;
    const prevTurn = previousTurnRef.current;
    const prevMoveCount = previousMoveCountRef.current;

    // Detect a new move
    if (prevBoard && state.move_count > prevMoveCount && prevTurn) {
      const movedTeam: Team = prevTurn === "red" ? "black" : "red";

      const detectedMove = detectAIMoveFromBoards(
        prevBoard,
        state.board,
        state.ruleset,
        movedTeam,
      );

      if (detectedMove) {
        const intermediateState: GameState = {
          ...state,
          board: prevBoard,
          turn: movedTeam,
        };

        const sequence = buildAnimationSequence(
          { ...detectedMove, promotion: detectedMove.promotion },
          intermediateState,
        );

        if (sequence.length > 0) {
          nextServerStateRef.current = state;
          lastMoveRef.current = { from: detectedMove.from, to: detectedMove.to };
          animationQueueRef.current = sequence.slice(1);

          setIsAnimating(true);
          startAnimationStep(sequence[0]!);

          // Update tracking refs
          previousBoardRef.current = state.board;
          previousTurnRef.current = state.turn;
          previousMoveCountRef.current = state.move_count;
          return;
        }
      }
    }

    // Update tracking refs
    previousBoardRef.current = state.board;
    previousTurnRef.current = state.turn;
    previousMoveCountRef.current = state.move_count;
  }, [state, isAnimating]);

  const isAITurn =
    state?.status === "active" &&
    (state?.mode === "ava" ||
      (state?.mode === "pva" && state?.ai_team === state?.turn));

  useEffect(() => {
    if (isAITurn && !pending && !isAnimating) {
      pollingRef.current = setInterval(() => {
        loadGame();
        setSelectedPos(null);
        setLegalMoves(null);
      }, POLL_INTERVAL);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isAITurn, pending, isAnimating, loadGame]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Keep isAnimatingRef in sync with state
  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  function applyFinalState() {
    setIsAnimating(false);
    setAnimProgress(0);
    pendingAIMoveRef.current = false;

    const serverState = nextServerStateRef.current;
    if (serverState) {
      setState(serverState);
      nextServerStateRef.current = null;
      setSelectedPos(null);
      setLegalMoves(null);
    }
    if (lastMoveRef.current) {
      setLastMove(lastMoveRef.current);
      lastMoveRef.current = null;
    }
    preMoveBoardRef.current = null;
    playerMoveRef.current = null;
  }

  function handleAnimationComplete() {
    setCapturedPositions([]);

    const queue = animationQueueRef.current;
    if (queue.length > 0) {
      const nextStep = queue[0]!;
      animationQueueRef.current = queue.slice(1);
      startAnimationStep(nextStep);
      return;
    }

    setAnimatingPiece(null);
    setAnimProgress(0);

    if (pendingAIMoveRef.current) {
      applyFinalState();
      return;
    }

    const serverState = nextServerStateRef.current;
    const preMoveBoard = preMoveBoardRef.current;
    const playerMove = playerMoveRef.current;
    const currentState = state;

    if (serverState && preMoveBoard && playerMove && currentState) {
      const didAIMove =
        serverState.turn === currentState.turn &&
        serverState.status === "active" &&
        currentState.mode === "pva" &&
        currentState.ai_team;

      if (didAIMove) {
        const preMoveCells = parseBoardString(preMoveBoard, currentState.ruleset);
        const moveWithRuleset = {
          ...playerMove,
          ruleset: currentState.ruleset,
        };
        const intermediateCells = applyMove(
          preMoveCells,
          moveWithRuleset as any,
          currentState.ruleset as any,
        );
        const intermediateBoard = serializeBoardString(
          intermediateCells,
          currentState.ruleset as any,
        );

        setState({
          ...currentState,
          board: intermediateBoard,
          turn: currentState.ai_team!,
        });

        const aiMove = detectAIMoveFromBoards(
          intermediateBoard,
          serverState.board,
          currentState.ruleset,
          currentState.ai_team!,
        );

        if (aiMove) {
          const intermediateState = {
            ...currentState,
            board: intermediateBoard,
          };
          const aiSequence = buildAnimationSequence(
            { ...aiMove, promotion: aiMove.promotion },
            intermediateState,
          );

          if (aiSequence.length > 0) {
            pendingAIMoveRef.current = true;
            animationQueueRef.current = aiSequence.slice(1);
            startAnimationStep(aiSequence[0]!);
            return;
          }
        }
      }
    }

    applyFinalState();
  }

  function startAnimationStep(step: AnimationStep) {
    setAnimatingPiece({
      pieceColor: step.pieceColor,
      pieceType: step.pieceType,
      from: step.from,
      to: step.to,
    });
    setCapturedPositions(step.captures);
    setAnimProgress(0);

    const startTime = performance.now();

    function animate(timestamp: number) {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      setAnimProgress(progress);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
        handleAnimationComplete();
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }

  async function handleCellClick(row: number, col: number) {
    if (pending || !state || state.status !== "active" || isAITurn || isAnimating)
      return;

    if (selectedPos && legalMoves) {
      const move = legalMoves.legal_moves.find(
        (m) => m.to[0] === row && m.to[1] === col,
      );
      if (move) {
        setPending(true);
        try {
          const result = await makeMove(gameId, {
            from: move.from,
            to: move.to,
            captures: move.captures,
            promotion: move.promotion,
          });

          // Store server state in ref (for rAF access) AND state (for React)
          nextServerStateRef.current = result.state;
          preMoveBoardRef.current = state.board;
          playerMoveRef.current = move;

          const sequence = buildAnimationSequence(move, state);

          // Store last move for highlighting after animation
          lastMoveRef.current = { from: move.from, to: move.to };

          // Store queue in ref BEFORE starting animation
          animationQueueRef.current = sequence.slice(1);

          setIsAnimating(true);

          if (sequence.length > 0) {
            startAnimationStep(sequence[0]!);
          }

          setSelectedPos(null);
          setLegalMoves(null);
        } catch {
          // ignore
        } finally {
          setPending(false);
        }
        return;
      }
    }

    const cells = parseBoardString(state.board, state.ruleset);
    const piece = cells[row]?.[col]?.piece;
    if (piece && piece.team === state.turn) {
      setSelectedPos([row, col]);
      try {
        const lm = await getLegalMoves(gameId, row, col);
        setLegalMoves(lm);
      } catch {
        setLegalMoves(null);
      }
    } else {
      setSelectedPos(null);
      setLegalMoves(null);
    }
  }

  async function handleResign() {
    if (!state || resigning) return;
    setResigning(true);
    try {
      const result = await resignGame(gameId, state.turn);
      setState(result.state);
      navigate({ to: "/game/$gameId/end", params: { gameId } });
    } catch {
      // ignore
    } finally {
      setResigning(false);
    }
  }

  if (!state) {
    return (
      <div style={styles.page}>
        <p>Loading...</p>
      </div>
    );
  }

  const cells = parseBoardString(state.board, state.ruleset);
  const pieces = countPieces(state.board);
  const boardSize = state.ruleset.boardSize as 8 | 10;
  const disabled = pending || isAITurn || state.status !== "active";

  return (
    <div style={styles.page}>
      <div style={styles.statusBar}>
        <div style={styles.statusItem}>
          <span style={styles.label}>Turn:</span>
          <span>{state.turn === "red" ? "Red" : "Black"}</span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.label}>Status:</span>
          <span>{state.status}</span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.label}>Moves:</span>
          <span>{state.move_count}</span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.label}>Pieces:</span>
          <span>
            Red {pieces.red} / Black {pieces.black}
          </span>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <Board
          boardSize={boardSize}
          cells={cells}
          selectedPosition={selectedPos}
          legalMoves={legalMoves?.legal_moves.map((m) => ({ to: m.to }))}
          lastMove={lastMove}
          onCellClick={handleCellClick}
          disabled={disabled}
          boardRef={boardRef}
          animatingFrom={animatingPiece?.from ?? null}
          capturedPositions={capturedPositions}
          pieceStyleId={state.styleConfig?.pieceStyleId}
        />

        <AnimationOverlay
          boardRef={boardRef}
          boardSize={boardSize}
          animatingPiece={animatingPiece}
          progress={animProgress}
          pieceStyleId={state.styleConfig?.pieceStyleId}
        />
      </div>

      <div style={{ width: "100%", maxWidth: "400px", marginTop: "1rem" }}>
        <MoveLog
          history={state.history ?? []}
          currentTurn={state.turn}
          boardSize={boardSize}
        />
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <button
          style={styles.resignButton}
          onClick={handleResign}
          disabled={resigning || state.status !== "active"}
        >
          {resigning ? "Resigning..." : "Resign"}
        </button>
        <button
          style={styles.resignButton}
          onClick={() => navigate({ to: "/" })}
        >
          Home
        </button>
      </div>
    </div>
  );
}
