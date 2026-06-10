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
const STORAGE_KEY_PLAYER_NAME = 'checkers-player-name';

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
    padding: "2rem 1rem",
  },
  heading: {
    fontSize: "3rem",
    marginBottom: "3rem",
    border: "2px solid #000",
    padding: "0.6rem 2rem",
  },
  button: {
    backgroundColor: "#fff",
    color: "#000",
    border: "2px solid #000",
    padding: "0.85rem 2.25rem",
    fontSize: "1.35rem",
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
    padding: "1rem",
  },
  modal: {
    backgroundColor: "#fff",
    border: "2px solid #000",
    padding: "2rem 2.5rem",
    width: "min(560px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.25rem",
  },
  modalTitle: {
    fontSize: "1.6rem",
    marginBottom: "0.25rem",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
    padding: "0.3rem 0",
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: "0.5rem",
    fontSize: "0.95rem",
  },
  sectionBox: {
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    padding: "0.85rem 1rem",
  },
  startButton: {
    backgroundColor: "#000",
    color: "#fff",
    border: "2px solid #000",
    padding: "0.85rem",
    fontSize: "1.15rem",
    cursor: "pointer",
    marginTop: "0.25rem",
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
  rulesetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: "0.75rem",
  },
  rulesetCard: {
    border: "1px solid #ccc",
    borderRadius: "6px",
    padding: "0.75rem 1rem",
    cursor: "pointer",
    backgroundColor: "#fafafa",
  },
  rulesetCardSelected: {
    border: "2px solid #000",
    borderRadius: "6px",
    padding: "0.75rem 1rem",
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
    marginTop: "0.2rem",
  },
  rulesetRules: {
    fontSize: "0.75rem",
    color: "#777",
    marginTop: "0.35rem",
    paddingLeft: "1rem",
    margin: "0.35rem 0 0 1rem",
  },
};

function HomeComponent() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
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
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(STORAGE_KEY_PLAYER_NAME) ?? "");
  const [leaderboardFilters, setLeaderboardFilters] = useState({
    difficulty: '',
    ruleset: '',
    algorithm: '',
    player_team: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PIECE_STYLE);
    if (saved) {
      setPieceStyleId(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PIECE_STYLE, pieceStyleId);
  }, [pieceStyleId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PLAYER_NAME, playerName);
  }, [playerName]);

  async function openLeaderboard() {
    setLeaderboardOpen(true);
    try {
      const params = new URLSearchParams();
      if (leaderboardFilters.difficulty) params.set('difficulty', leaderboardFilters.difficulty);
      if (leaderboardFilters.ruleset) params.set('ruleset', leaderboardFilters.ruleset);
      if (leaderboardFilters.algorithm) params.set('algorithm', leaderboardFilters.algorithm);
      if (leaderboardFilters.player_team) params.set('player_team', leaderboardFilters.player_team);
      const res = await fetch(`/api/leaderboard?${params}`);
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
        ...(playerName.trim() && { player_name: playerName.trim() }),
      };

      const result = await createGame(req, await getToken() ?? undefined);

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
      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem' }}>Player Name:</label>
        <input
          type="text"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          placeholder="Optional display name"
          style={{ padding: '0.3rem 0.5rem', border: '1px solid #ccc', fontSize: '0.85rem', width: '180px' }}
        />
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
              <div style={styles.rulesetGrid}>
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
            </div>

            <div style={styles.sectionBox}>
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
                <div style={styles.sectionBox}>
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

                <div style={styles.sectionBox}>
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
              <div style={styles.sectionBox}>
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
          <div style={{ ...styles.modal, width: "min(640px, 100%)" }} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>🏆 Leaderboard</h2>
            <p style={{ fontSize: '0.8rem', color: '#555', margin: 0 }}>
              Fewest moves to beat AI (Player vs AI only)
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
              <select
                value={leaderboardFilters.difficulty}
                onChange={e => setLeaderboardFilters(f => ({ ...f, difficulty: e.target.value }))}
                style={{ padding: '0.25rem', border: '1px solid #ccc' }}
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select
                value={leaderboardFilters.ruleset}
                onChange={e => setLeaderboardFilters(f => ({ ...f, ruleset: e.target.value }))}
                style={{ padding: '0.25rem', border: '1px solid #ccc' }}
              >
                <option value="">All Rulesets</option>
                <option value="english">English</option>
                <option value="international">International</option>
                <option value="brazilian">Brazilian</option>
                <option value="russian">Russian</option>
                <option value="pool">Pool</option>
              </select>
              <select
                value={leaderboardFilters.algorithm}
                onChange={e => setLeaderboardFilters(f => ({ ...f, algorithm: e.target.value }))}
                style={{ padding: '0.25rem', border: '1px solid #ccc' }}
              >
                <option value="">All Algorithms</option>
                <option value="minimax">Minimax</option>
                <option value="astar">A*</option>
              </select>
              <select
                value={leaderboardFilters.player_team}
                onChange={e => setLeaderboardFilters(f => ({ ...f, player_team: e.target.value }))}
                style={{ padding: '0.25rem', border: '1px solid #ccc' }}
              >
                <option value="">All Teams</option>
                <option value="red">Red</option>
                <option value="black">Black</option>
              </select>
              <button
                onClick={openLeaderboard}
                style={{ padding: '0.25rem 0.75rem', border: '1px solid #000', background: '#fff', cursor: 'pointer' }}
              >
                Apply
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000' }}>
                    <th style={{ textAlign: 'left', padding: '0.25rem' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '0.25rem' }}>Player</th>
                    <th style={{ textAlign: 'left', padding: '0.25rem' }}>Team</th>
                    <th style={{ textAlign: 'left', padding: '0.25rem' }}>Algorithm</th>
                    <th style={{ textAlign: 'left', padding: '0.25rem' }}>Difficulty</th>
                    <th style={{ textAlign: 'left', padding: '0.25rem' }}>Ruleset</th>
                    <th style={{ textAlign: 'right', padding: '0.25rem' }}>Moves</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((entry, i) => (
                    <tr key={entry._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.25rem' }}>{i + 1}</td>
                      <td style={{ padding: '0.25rem' }}>{entry.player_name || entry.username}</td>
                      <td style={{ padding: '0.25rem', textTransform: 'capitalize' }}>{entry.player_team}</td>
                      <td style={{ padding: '0.25rem', textTransform: 'capitalize' }}>{entry.algorithm}</td>
                      <td style={{ padding: '0.25rem', textTransform: 'capitalize' }}>{entry.difficulty}</td>
                      <td style={{ padding: '0.25rem', textTransform: 'capitalize' }}>{entry.ruleset}</td>
                      <td style={{ textAlign: 'right', padding: '0.25rem', fontWeight: 'bold' }}>
                        {entry.bestMoves}
                      </td>
                    </tr>
                  ))}
                  {leaderboardData.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
                      No scores yet. Be the first!
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
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
