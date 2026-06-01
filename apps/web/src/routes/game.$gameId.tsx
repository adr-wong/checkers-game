import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { parseBoardString } from "@checkers/shared";
import { Board } from "~/components/Board";
import {
  getGameState,
  getLegalMoves,
  makeMove,
  resignGame,
  type GameState,
  type LegalMovesResponse,
} from "~/lib/api";

export const Route = createFileRoute("/game/$gameId")({
  component: GameComponent,
});

const POLL_INTERVAL = 1500;

function countPieces(board: string): { red: number; black: number } {
  let red = 0;
  let black = 0;
  for (const ch of board) {
    if (ch === "r" || ch === "R") red++;
    else if (ch === "b" || ch === "B") black++;
  }
  return { red, black };
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

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadGame = useCallback(async () => {
    try {
      const s = await getGameState(gameId);
      setState(s);
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

  const isAITurn =
    state?.mode !== "pvp" &&
    state?.ai_team === state?.turn &&
    state?.status === "active";

  useEffect(() => {
    if (isAITurn && !pending) {
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
  }, [isAITurn, pending, loadGame]);

  async function handleCellClick(row: number, col: number) {
    if (pending || !state || state.status !== "active" || isAITurn) return;

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
          setState(result.state);
          setLastMove({ from: move.from, to: move.to });
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

      <Board
        boardSize={boardSize}
        cells={cells}
        selectedPosition={selectedPos}
        legalMoves={legalMoves?.legal_moves.map((m) => ({ to: m.to }))}
        lastMove={lastMove}
        onCellClick={handleCellClick}
        disabled={disabled}
      />

      <button
        style={styles.resignButton}
        onClick={handleResign}
        disabled={resigning || state.status !== "active"}
      >
        {resigning ? "Resigning..." : "Resign"}
      </button>
    </div>
  );
}
