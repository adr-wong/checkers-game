import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createGame, type CreateGameRequest } from "~/lib/api";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

type GameMode = "pvp" | "pva" | "ava";
type Difficulty = "easy" | "medium" | "hard";
type Algorithm = "minimax" | "astar";
type BoardSize = 8 | 10;
type Team = "red" | "black";

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#fff",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "sans-serif",
  },
  heading: {
    fontSize: "2.5rem",
    marginBottom: "2rem",
    border: "2px solid #000",
    padding: "0.5rem 1.5rem",
  },
  button: {
    backgroundColor: "#fff",
    color: "#000",
    border: "2px solid #000",
    padding: "0.75rem 2rem",
    fontSize: "1.25rem",
    cursor: "pointer",
  },
  overlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#fff",
    border: "2px solid #000",
    padding: "2rem",
    width: "400px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
  },
  modalTitle: {
    fontSize: "1.5rem",
    marginBottom: "0.5rem",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: "0.25rem",
  },
  startButton: {
    backgroundColor: "#000",
    color: "#fff",
    border: "2px solid #000",
    padding: "0.75rem",
    fontSize: "1.1rem",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  closeModal: {
    position: "absolute" as const,
    top: "0.5rem",
    right: "0.75rem",
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
  },
  select: {
    padding: "0.4rem",
    border: "1px solid #000",
    backgroundColor: "#fff",
    fontSize: "1rem",
  },
};

function HomeComponent() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [boardSize, setBoardSize] = useState<BoardSize>(8);
  const [mode, setMode] = useState<GameMode>("pvp");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [algorithm, setAlgorithm] = useState<Algorithm>("minimax");
  const [aiTeam, setAiTeam] = useState<Team>("black");
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const req: CreateGameRequest = {
        ruleset: { preset: boardSize === 8 ? "international8" : "international10" },
        mode,
        ...(mode !== "pvp" && { difficulty, algorithm }),
        ...(mode === "pva" && { ai_team: aiTeam }),
      };
      const { gameId } = await createGame(req);
      navigate({ to: "/game/$gameId", params: { gameId } });
    } catch (err: any) {
      alert(err.message ?? "Failed to create game");
    } finally {
      setLoading(false);
    }
  }

  const showAIOptions = mode !== "pvp";

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Checkers Game</h1>
      <button style={styles.button} onClick={() => setModalOpen(true)}>
        New Game
      </button>

      {modalOpen && (
        <div style={styles.overlay} onClick={() => setModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ position: "relative" }}>
              <h2 style={styles.modalTitle}>New Game</h2>
              <button
                style={styles.closeModal}
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div>
              <div style={styles.sectionTitle}>Board Size</div>
              <label style={styles.label}>
                <input
                  type="radio"
                  name="boardSize"
                  checked={boardSize === 8}
                  onChange={() => setBoardSize(8)}
                />
                8x8
              </label>
              <label style={styles.label}>
                <input
                  type="radio"
                  name="boardSize"
                  checked={boardSize === 10}
                  onChange={() => setBoardSize(10)}
                />
                10x10
              </label>
            </div>

            <div>
              <div style={styles.sectionTitle}>Game Mode</div>
              <label style={styles.label}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "pvp"}
                  onChange={() => setMode("pvp")}
                />
                Player vs Player
              </label>
              <label style={styles.label}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "pva"}
                  onChange={() => setMode("pva")}
                />
                Player vs AI
              </label>
              <label style={styles.label}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "ava"}
                  onChange={() => setMode("ava")}
                />
                AI vs AI
              </label>
            </div>

            {showAIOptions && (
              <>
                <div>
                  <div style={styles.sectionTitle}>Difficulty</div>
                  <label style={styles.label}>
                    <input
                      type="radio"
                      name="difficulty"
                      checked={difficulty === "easy"}
                      onChange={() => setDifficulty("easy")}
                    />
                    Easy
                  </label>
                  <label style={styles.label}>
                    <input
                      type="radio"
                      name="difficulty"
                      checked={difficulty === "medium"}
                      onChange={() => setDifficulty("medium")}
                    />
                    Medium
                  </label>
                  <label style={styles.label}>
                    <input
                      type="radio"
                      name="difficulty"
                      checked={difficulty === "hard"}
                      onChange={() => setDifficulty("hard")}
                    />
                    Hard
                  </label>
                </div>

                <div>
                  <div style={styles.sectionTitle}>Algorithm</div>
                  <label style={styles.label}>
                    <input
                      type="radio"
                      name="algorithm"
                      checked={algorithm === "minimax"}
                      onChange={() => setAlgorithm("minimax")}
                    />
                    Minimax
                  </label>
                  <label style={styles.label}>
                    <input
                      type="radio"
                      name="algorithm"
                      checked={algorithm === "astar"}
                      onChange={() => setAlgorithm("astar")}
                    />
                    A*
                  </label>
                </div>
              </>
            )}

            {mode === "pva" && (
              <div>
                <div style={styles.sectionTitle}>AI Team</div>
                <label style={styles.label}>
                  <input
                    type="radio"
                    name="aiTeam"
                    checked={aiTeam === "red"}
                    onChange={() => setAiTeam("red")}
                  />
                  Red
                </label>
                <label style={styles.label}>
                  <input
                    type="radio"
                    name="aiTeam"
                    checked={aiTeam === "black"}
                    onChange={() => setAiTeam("black")}
                  />
                  Black
                </label>
              </div>
            )}

            <button
              style={styles.startButton}
              onClick={handleStart}
              disabled={loading}
            >
              {loading ? "Starting..." : "Start Game"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
