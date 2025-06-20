import React, { useEffect, useState } from "react";
import "./App.css";

// Color palette as CSS variables (to be used inline for highlight)
const COLORS = {
  primary: "#1976d2",
  secondary: "#424242",
  accent: "#ffca28",
};

const API_BASE =
  process.env.REACT_APP_TTT_API ||
  "http://localhost:3001"; // Update if backend runs elsewhere

// Board cell rendering helper (stateless)
function Square({ value, onClick, highlighted }) {
  // PUBLIC_INTERFACE
  /** Renders a square button on the board */
  return (
    <button
      className="ttt-square"
      style={{
        color: value === "X" ? COLORS.primary : value === "O" ? COLORS.secondary : "#888",
        background: highlighted
          ? COLORS.accent
          : "#fff",
        borderColor: highlighted ? COLORS.accent : "rgba(25, 118, 210, 0.15)",
      }}
      onClick={onClick}
      disabled={value !== null}
      aria-label={value ? `Cell ${value}` : "Empty cell"}
      tabIndex="0"
    >
      {value}
    </button>
  );
}

// Draws 3x3 grid
function Board({ board, onCellClick, winLine }) {
  // PUBLIC_INTERFACE
  /** Renders the 3x3 Tic Tac Toe board */
  return (
    <div className="ttt-board">
      {[0, 1, 2].map((row) => (
        <div key={row} className="ttt-row">
          {[0, 1, 2].map((col) => {
            const idx = row * 3 + col;
            const value = board && board[row] ? board[row][col] : null;
            const highlighted =
              (winLine &&
                winLine.some(([r, c]) => r === row && c === col));
            return (
              <Square
                key={col}
                value={value}
                onClick={() => onCellClick(row, col)}
                highlighted={highlighted}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Winner line detector (for highlighting)
function findWinningLine(board, winner) {
  // Returns array of [row, col] for the winning line, or null
  if (!winner || !board) return null;
  const lines = [
    // rows
    [
      [0, 0], [0, 1], [0, 2]
    ],
    [
      [1, 0], [1, 1], [1, 2]
    ],
    [
      [2, 0], [2, 1], [2, 2]
    ],
    // cols
    [
      [0, 0], [1, 0], [2, 0]
    ],
    [
      [0, 1], [1, 1], [2, 1]
    ],
    [
      [0, 2], [1, 2], [2, 2]
    ],
    // diags
    [
      [0, 0], [1, 1], [2, 2]
    ],
    [
      [0, 2], [1, 1], [2, 0]
    ],
  ];
  for (let line of lines) {
    const [a, b, c] = line;
    const va = board[a[0]][a[1]];
    const vb = board[b[0]][b[1]];
    const vc = board[c[0]][c[1]];
    if (va && va === vb && va === vc && va === winner) {
      return line;
    }
  }
  return null;
}

// Main app
function App() {
  // Game state
  const [board, setBoard] = useState([
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ]);
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [gameState, setGameState] = useState("in_progress"); // in_progress, win, draw
  const [winner, setWinner] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [winLine, setWinLine] = useState(null);

  // Helper to normalize board from flat to nested array
  function normalizeBoard(flat) {
    if (!Array.isArray(flat) || flat.length !== 3 || !Array.isArray(flat[0])) {
      // May get nested array from backend, which is correct
      return flat;
    }
    // Already nested
    return flat;
  }

  // Fetches current game state
  // PUBLIC_INTERFACE
  async function fetchGame() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/game/board`);
      if (!res.ok) throw new Error("Could not fetch game.");
      const data = await res.json();
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
      setGameState(data.state);
      setWinner(data.winner);
      setMessage(data.message || "");
      setWinLine(findWinningLine(data.board, data.winner));
    } catch (e) {
      setError("Backend error.");
    }
    setLoading(false);
  }

  // PUBLIC_INTERFACE
  async function startNewGame() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/game/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Could not start a new game.");
      const data = await res.json();
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
      setGameState(data.state);
      setWinner(data.winner);
      setMessage("");
      setWinLine(null);
    } catch (e) {
      setError("Failed to start a new game.");
    }
    setLoading(false);
  }

  // PUBLIC_INTERFACE
  async function restartGame() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/game/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Could not restart the game.");
      const data = await res.json();
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
      setGameState(data.state);
      setWinner(data.winner);
      setMessage(data.message || "");
      setWinLine(null);
    } catch (e) {
      setError("Backend error.");
    }
    setLoading(false);
  }

  // PUBLIC_INTERFACE
  async function makeMove(row, col) {
    if (gameState !== "in_progress" || board[row][col]) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/game/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row, col }),
      });
      if (!res.ok) throw new Error("Invalid move.");
      const data = await res.json();
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
      setGameState(data.state);
      setWinner(data.winner);
      setMessage(data.message || "");
      setWinLine(findWinningLine(data.board, data.winner));
    } catch (e) {
      setError("Move error.");
    }
    setLoading(false);
  }

  // On mount: start game or fetch state
  useEffect(() => {
    fetchGame();
    // eslint-disable-next-line
  }, []);

  // UI layout

  return (
    <div className="app" style={{ minHeight: "100vh", background: "#fafcff", color: COLORS.secondary }}>
      <nav className="navbar" style={{ background: COLORS.primary }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <div className="logo">
              <span className="logo-symbol" style={{ color: COLORS.accent, fontWeight: 700 }}>◯X</span> Tic Tac Toe
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="container" style={{ marginTop: 90 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minHeight: "75vh",
              justifyContent: "center",
            }}
          >
            <h2 className="title" style={{
              color: COLORS.primary,
              letterSpacing: 0.3,
              marginBottom: 16,
              marginTop: 18,
            }}>
              Tic Tac Toe Game
            </h2>
            <div className="description" style={{
              color: COLORS.secondary,
              marginBottom: 24,
            }}>
              Minimal digital game powered by AI backend. Player <span style={{ color: COLORS.primary, fontWeight: 600 }}>X</span> vs <span style={{ color: COLORS.secondary, fontWeight: 600 }}>O</span>
            </div>

            <div>
              <Board
                board={board}
                onCellClick={makeMove}
                winLine={winLine}
              />
            </div>
            <div style={{ marginTop: 24, minHeight: 28 }}>
              {loading ? (
                <span style={{ color: COLORS.primary, letterSpacing: 2 }}>Loading...</span>
              ) : error ? (
                <span style={{ color: "red" }}>{error}</span>
              ) : (
                <>
                  {gameState === "in_progress" && (
                    <span style={{ fontWeight: 500 }}>
                      Current Player:{" "}
                      <span
                        style={{
                          color:
                            currentPlayer === "X"
                              ? COLORS.primary
                              : COLORS.secondary,
                        }}
                      >
                        {currentPlayer}
                      </span>
                    </span>
                  )}
                  {gameState === "win" && winner && (
                    <span>
                      <span style={{ color: COLORS.accent, fontWeight: 700 }}>Winner</span>:{" "}
                      <span
                        style={{
                          color:
                            winner === "X"
                              ? COLORS.primary
                              : COLORS.secondary,
                          fontWeight: 600,
                        }}
                      >
                        {winner}
                      </span>
                      {" 🎉"}
                    </span>
                  )}
                  {gameState === "draw" && (
                    <span>
                      <span style={{ color: COLORS.accent, fontWeight: 700 }}>Draw!</span> No winner.
                    </span>
                  )}
                </>
              )}
            </div>

            <div style={{ margin: "26px 0 0 0", display: "flex", gap: "16px" }}>
              <button
                className="btn btn-large"
                style={{
                  background: COLORS.primary,
                  color: "#fff",
                  minWidth: 120,
                  border: "none"
                }}
                onClick={startNewGame}
                disabled={loading}
              >
                New Game
              </button>
              <button
                className="btn btn-large"
                style={{
                  background: COLORS.secondary,
                  color: "#fff",
                  minWidth: 120,
                  border: "none"
                }}
                onClick={restartGame}
                disabled={loading}
              >
                Restart
              </button>
            </div>
            {message && (
              <div style={{ color: COLORS.secondary, marginTop: 20 }}>{message}</div>
            )}
          </div>
        </div>
      </main>

      {/* Inline styles for Tic Tac Toe specifics */}
      <style>
        {`
        .ttt-board {
          display: grid;
          grid-template-rows: repeat(3, 68px);
          gap: 7px;
          background: #fff;
          border-radius: 12px;
          padding: 24px 20px;
          box-shadow: 0 2px 16px 0 rgba(34,49,63,.08);
        }
        .ttt-row {
          display: flex;
        }
        .ttt-square {
          width: 65px; height: 65px;
          margin: 3px 7px;
          font-size: 2.5rem;
          font-family: 'Inter', 'Roboto', sans-serif;
          font-weight: 600;
          background: #fff;
          border: 3px solid rgba(25,118,210,0.12);
          border-radius: 8px;
          cursor: pointer;
          transition: border 0.14s, background 0.14s;
          outline: none;
          box-shadow: none;
        }
        .ttt-square:disabled {
          background: #f6f6f6;
          cursor: default;
        }
        `}
      </style>
    </div>
  );
}

export default App;