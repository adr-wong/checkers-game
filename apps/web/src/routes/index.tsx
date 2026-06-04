import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { createGame, type CreateGameRequest } from "~/lib/api";
import { StylePicker } from "~/components/StylePicker";
import { isClerkEnabled } from "~/lib/clerk";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

type GameMode = "pvp" | "pva" | "ava";
type Difficulty = "easy" | "medium" | "hard";
type Algorithm = "minimax" | "astar";
type PresetKey = "english" | "international" | "brazilian" | "russian" | "pool";
type Team = "red" | "black";

const STORAGE_KEY_PIECE_STYLE = 'checkers-piece-style';

interface RulesetInfo {
  name: string;
  boardSize: 8 | 10;
  description: string;
  rules: string[];
}

const RULESETS: Record<PresetKey, RulesetInfo> = {
  english: {
    name: "English Draughts",
    boardSize: 8,
    description: "The classic checkers rules played worldwide. Simple and beginner-friendly.",
    rules: [
      "8x8 board",
      "Kings move one square diagonally",
      "Captures are mandatory",
      "Pieces can only move forward",
    ],
  },
  international: {
    name: "International Draughts",
    boardSize: 10,
    description: "The standard for tournament play. Played on a larger board with flying kings.",
    rules: [
      "10x10 board",
      "Kings fly across the board (any distance diagonally)",
      "Captures are mandatory and must take the maximum number of pieces",
      "Pieces can capture backwards",
    ],
  },
  brazilian: {
    name: "Brazilian Draughts",
    boardSize: 8,
    description: "Similar to International rules but on a smaller board.",
    rules: [
      "8x8 board",
      "Kings fly across the board",
      "Captures are mandatory and must take the maximum",
      "Pieces can capture backwards",
    ],
  },
  russian: {
    name: "Russian Draughts",
    boardSize: 8,
    description: "Popular in Eastern Europe. Kings are powerful but captures end the turn.",
    rules: [
      "8x8 board",
      "Kings fly across the board",
      "Captures are mandatory",
      "Promotion does not end the jump — a piece can continue after becoming a king",
    ],
  },
  pool: {
    name: "Pool Checkers",
    boardSize: 8,
    description: "American variant where pieces can move in any direction once on the board.",
    rules: [
      "8x8 board",
      "Kings fly across the board",
      "Normal pieces can move in any diagonal direction (not just forward)",
      "Pieces can capture backwards",
    ],
  },
};

const PRESET_KEYS: PresetKey[] = ["english", "international", "brazilian", "russian", "pool"];

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
    width: "440px",
    maxHeight: "90vh",
    overflowY: "auto" as const,
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
  rulesetCard: {
    border: "1px solid #ccc",
    borderRadius: "4px",
    padding: "0.5rem 0.75rem",
    cursor: "pointer",
    backgroundColor: "#fafafa",
  },
  rulesetCardSelected: {
    border: "2px solid #000",
    borderRadius: "4px",
    padding: "0.5rem 0.75rem",
    cursor: "pointer",
    backgroundColor: "#f0f0f0",
  },
  rulesetName: {
    fontWeight: "bold" as const,
    fontSize: "0.95rem",
  },
  rulesetDesc: {
    fontSize: "0.8rem",
    color: "#555",
    marginTop: "0.15rem",
  },
  rulesetRules: {
    fontSize: "0.75rem",
    color: "#777",
    marginTop: "0.25rem",
    paddingLeft: "1rem",
    margin: "0.25rem 0 0 1rem",
  },
};

function HomeComponent() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [ruleset, setRuleset] = useState<PresetKey>("english");
  const [mode, setMode] = useState<GameMode>("pvp");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [algorithm, setAlgorithm] = useState<Algorithm>("minimax");
  const [aiTeam, setAiTeam] = useState<Team>("black");
  const [loading, setLoading] = useState(false);
  const [pieceStyleId, setPieceStyleId] = useState<string>("classic");
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PIECE_STYLE);
    if (saved) {
      setPieceStyleId(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PIECE_STYLE, pieceStyleId);
  }, [pieceStyleId]);

  async function openLeaderboard() {
    setLeaderboardOpen(true);
    try {
      const res = await fetch('/api/leaderboard');
      const json = await res.json();
      setLeaderboardData(json.entries);
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    }
  }

  async function handleStart() {
    setLoading(true);

    try {
      const req: CreateGameRequest = {
        ruleset: { preset: ruleset },
        mode,
        ...(mode !== "pvp" && { difficulty, algorithm, ai_team: aiTeam }),
        styleConfig: {
          pieceStyleId,
          boardStyleId: "classic",
        },
      };

      const result = await createGame(req);

      navigate({ 
        to: "/game/$gameId", 
        params: { gameId: result.gameId } 
      });
    } catch (err: any) {
      alert(`Failed to create game: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  const showAIOptions = mode !== "pvp";

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Checkers Game</h1>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button   style={styles.button}
                  onClick={() => setModalOpen(true)}>
          New Game
        </button>
        <button   style={styles.button}
                  onClick={openLeaderboard}>
          Leaderboard
        </button>
      </div>

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
              <div style={styles.sectionTitle}>Ruleset</div>
              {PRESET_KEYS.map((key) => {
                const info = RULESETS[key];
                const isSelected = ruleset === key;
                return (
                  <div
                    key={key}
                    style={isSelected ? styles.rulesetCardSelected : styles.rulesetCard}
                    onClick={() => setRuleset(key)}
                  >
                    <div style={styles.rulesetName}>
                      {info.name} ({info.boardSize}x{info.boardSize})
                    </div>
                    <div style={styles.rulesetDesc}>{info.description}</div>
                    <ul style={styles.rulesetRules}>
                      {info.rules.map((rule, i) => (
                        <li key={i}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
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

            <div>
              <div style={styles.sectionTitle}>Piece Style</div>
              {isClerkEnabled ? (
                <ShopSection
                  pieceStyleId={pieceStyleId}
                  setPieceStyleId={setPieceStyleId}
                />
              ) : (
                <StylePicker
                  selectedStyleId={pieceStyleId}
                  onSelect={setPieceStyleId}
                />
              )}
            </div>

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

      {leaderboardOpen && (
        <div style={styles.overlay} onClick={() => setLeaderboardOpen(false)}>
          <div style={{ ...styles.modal, minWidth: 360 }} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>🏆 Leaderboard</h2>
            <p style={{ fontSize: '0.8rem', color: '#555', margin: 0 }}>
              Fewest moves to beat AI (Player vs AI only)
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #000' }}>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Player</th>
                  <th style={{ textAlign: 'right', padding: '0.25rem' }}>Moves</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((entry, i) => (
                  <tr key={entry._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.25rem' }}>{i + 1}</td>
                    <td style={{ padding: '0.25rem' }}>{entry.username}</td>
                    <td style={{ textAlign: 'right', padding: '0.25rem', fontWeight: 'bold' }}>
                      {entry.bestMoves}
                    </td>
                    <td style={{ padding: '0.25rem', textTransform: 'capitalize' }}>
                      {entry.difficulty}
                    </td>
                  </tr>
                ))}
                {leaderboardData.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
                    No scores yet. Be the first!
                  </td></tr>
                )}
              </tbody>
            </table>
            <button style={{ ...styles.startButton, marginTop: '1rem' }}
              onClick={() => setLeaderboardOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShopSection({
  pieceStyleId,
  setPieceStyleId,
}: {
  pieceStyleId: string;
  setPieceStyleId: (id: string) => void;
}) {
  const { getToken, isSignedIn } = useAuth();
  const [ownedStyles, setOwnedStyles] = useState<string[]>(['classic']);

  useEffect(() => {
    async function fetchOwned() {
      if (!isSignedIn) { setOwnedStyles(['classic']); return }
      const token = await getToken();
      const res = await fetch('/api/shop/owned', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      setOwnedStyles(json.owned ?? ['classic']);
    }
    fetchOwned();
  }, [isSignedIn]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId || !params.get('style_purchased')) return;

    async function confirmPurchase() {
      if (!isSignedIn) return;
      const token = await getToken();
      const res = await fetch('/api/shop/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        const json = await res.json();
        setOwnedStyles(prev => [...new Set([...prev, json.styleId])]);
        window.history.replaceState({}, '', '/');
      }
    }
    confirmPurchase();
  }, [isSignedIn]);

  const handlePurchase = useCallback(async (styleId: string) => {
    if (!isSignedIn) { alert('Sign in to purchase styles.'); return }
    const token = await getToken();
    const res = await fetch('/api/shop/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ styleId }),
    });
    const json = await res.json();
    if (json.checkoutUrl) {
      window.location.href = json.checkoutUrl;
    }
  }, [isSignedIn, getToken]);

  return (
    <StylePicker
      selectedStyleId={pieceStyleId}
      onSelect={setPieceStyleId}
      ownedStyleIds={ownedStyles}
      onPurchase={handlePurchase}
    />
  );
}
