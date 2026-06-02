import { useEffect, useRef } from "react";

type Team = "red" | "black";

interface MoveEntry {
  from: [number, number];
  to: [number, number];
  captures: [number, number][];
  promotion: boolean;
  timestamp: string;
}

interface MoveLogProps {
  history: MoveEntry[];
  currentTurn: Team;
  boardSize: 8 | 10;
}

const styles = {
  container: {
    width: "100%",
    maxHeight: "200px",
    overflowY: "auto" as const,
    border: "2px solid #000",
    padding: "0.5rem",
    fontSize: "0.85rem",
    fontFamily: "monospace",
    backgroundColor: "#fafafa",
  },
  header: {
    fontWeight: "bold" as const,
    marginBottom: "0.25rem",
    fontSize: "0.9rem",
  },
  moveRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.15rem 0",
  },
  moveNumber: {
    color: "#888",
    minWidth: "2rem",
    textAlign: "right" as const,
  },
  redDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#d32f2f",
    flexShrink: 0,
  },
  blackDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#333",
    flexShrink: 0,
  },
  moveText: {
    flex: 1,
  },
  captureText: {
    color: "#c62828",
    fontWeight: "bold" as const,
  },
  promotionText: {
    color: "#f59e0b",
    fontWeight: "bold" as const,
  },
  emptyText: {
    color: "#999",
    fontStyle: "italic" as const,
  },
};

function formatCoord(row: number, col: number, boardSize: number): string {
  const letter = String.fromCharCode(65 + col);
  const number = boardSize - row;
  return `${letter}${number}`;
}

export function MoveLog({ history, currentTurn, boardSize }: MoveLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length]);

  return (
    <div style={styles.container} ref={scrollRef}>
      <div style={styles.header}>Moves</div>
      {history.length === 0 ? (
        <div style={styles.emptyText}>No moves yet</div>
      ) : (
        history.map((entry, i) => {
          const team: Team = i % 2 === 0 ? "red" : "black";
          const moveNum = Math.floor(i / 2) + 1;
          const from = formatCoord(entry.from[0], entry.from[1], boardSize);
          const to = formatCoord(entry.to[0], entry.to[1], boardSize);
          const captureCount = entry.captures.length;

          return (
            <div key={i} style={styles.moveRow}>
              <span style={styles.moveNumber}>
                {i % 2 === 0 ? `${moveNum}.` : ""}
              </span>
              <div style={team === "red" ? styles.redDot : styles.blackDot} />
              <span style={styles.moveText}>
                {from}
                {captureCount > 0 ? "x" : "-"}
                {to}
                {captureCount > 0 && (
                  <span style={styles.captureText}>
                    {" "}
                    ({captureCount}x)
                  </span>
                )}
                {entry.promotion && (
                  <span style={styles.promotionText}> =K</span>
                )}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
