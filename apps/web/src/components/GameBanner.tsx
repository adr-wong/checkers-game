type GameStatus = "red_wins" | "black_wins" | "draw";

interface GameBannerProps {
  status: GameStatus;
}

const config: Record<GameStatus, { text: string; bg: string }> = {
  red_wins: { text: "Red Wins!", bg: "#c62828" },
  black_wins: { text: "Black Wins!", bg: "#212121" },
  draw: { text: "Draw!", bg: "#757575" },
};

export function GameBanner({ status }: GameBannerProps) {
  const { text, bg } = config[status];

  return (
    <div
      style={{
        width: "12vh",
        height: "100%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        color: "#fff",
        fontWeight: 700,
        fontSize: "6vh",
        letterSpacing: "0.05em",
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        userSelect: "none",
      }}
    >
      {text}
    </div>
  );
}
