import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { getGameState, createGame, type GameState, type CreateGameRequest } from "~/lib/api";
import { useAuth } from "@clerk/clerk-react";
import { isClerkEnabled } from "~/lib/clerk";
import { GameBanner } from "~/components/GameBanner";

export const Route = createFileRoute("/game/$gameId/end")({
  component: GameEndComponent,
});

function ScoreSubmitter({ state }: { state: GameState }) {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    async function submitScore() {
      if (!isSignedIn) return;
      if (state.mode !== 'pva') return;

      const playerTeam = state.ai_team === 'red' ? 'black' : 'red';
      if (state.status !== `${playerTeam}_wins`) return;

      try {
        const token = await getToken();
        if (!token) return;

        await fetch('/api/leaderboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            gameId: state.gameId,
            moves: state.move_count,
            difficulty: state.difficulty,
            ruleset: state.ruleset.name,
            player_team: state.ai_team === 'red' ? 'black' : 'red',
            algorithm: state.algorithm,
            player_name: state.player_name,
          }),
        });
      } catch (e) {
        console.error('Failed to submit leaderboard score:', e);
      }
    }
    submitScore();
  }, [state.status, isSignedIn, getToken, state]);

  return null;
}

function GameEndComponent() {
  const { gameId } = Route.useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playAgainLoading, setPlayAgainLoading] = useState(false);

  useEffect(() => {
    getGameState(gameId)
      .then(setState)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading) return <div style={{ ...styles.page, alignItems: "center", justifyContent: "center" }}>Loading...</div>;
  if (error || !state) return <div style={{ ...styles.page, alignItems: "center", justifyContent: "center" }}>Error: {error ?? "Game not found"}</div>;

  const redPieces = (state.board.match(/[rR]/g) ?? []).length;
  const blackPieces = (state.board.match(/[bB]/g) ?? []).length;

  let resultText: string;
  if (state.status === "red_wins") resultText = "Red Wins";
  else if (state.status === "black_wins") resultText = "Black Wins";
  else resultText = "Draw";

  const handlePlayAgain = async () => {
    setPlayAgainLoading(true);
    try {
      const req: CreateGameRequest = {
        ruleset: state!.ruleset,
        mode: state!.mode,
        difficulty: state!.difficulty,
        ai_team: state!.ai_team,
        algorithm: state!.algorithm,
      };
      const { gameId: newId } = await createGame(req);
      navigate({ to: "/game/$gameId", params: { gameId: newId } });
    } catch (e: any) {
      alert(`Failed to create game: ${e.message || e}`);
    } finally {
      setPlayAgainLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {isClerkEnabled && state && <ScoreSubmitter state={state} />}
      <GameBanner status={state.status as "red_wins" | "black_wins" | "draw"} />
      <div style={styles.content}>
        <h1 style={styles.title}>Game Over</h1>

        <div style={styles.card}>
          <div style={styles.result}>{resultText}</div>

          <div style={styles.stats}>
            <div style={styles.statRow}>
              <span>Moves played</span>
              <span>{state.move_count}</span>
            </div>
            <div style={styles.statRow}>
              <span>Red pieces</span>
              <span>{redPieces}</span>
            </div>
            <div style={styles.statRow}>
              <span>Black pieces</span>
              <span>{blackPieces}</span>
            </div>
          </div>
        </div>

        <div style={styles.buttons}>
          <button style={styles.btn} onClick={handlePlayAgain} disabled={playAgainLoading}>
            {playAgainLoading ? "Creating..." : "Play Again"}
          </button>
          <button style={styles.btn} onClick={() => navigate({ to: "/" })}>
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    fontFamily: "system-ui, sans-serif",
    background: "#fff",
    color: "#000",
  },
  content: {
    flex: 1,
    maxWidth: 480,
    margin: "80px auto",
    padding: "0 24px",
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 32,
    borderBottom: "2px solid #000",
    paddingBottom: 8,
  },
  card: {
    border: "2px solid #000",
    padding: 24,
    marginBottom: 32,
  },
  result: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 20,
  },
  stats: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 16,
  },
  buttons: {
    display: "flex",
    gap: 12,
  },
  btn: {
    flex: 1,
    padding: "10px 16px",
    fontSize: 16,
    fontWeight: 600,
    border: "2px solid #000",
    background: "#fff",
    color: "#000",
    cursor: "pointer",
  },
};
