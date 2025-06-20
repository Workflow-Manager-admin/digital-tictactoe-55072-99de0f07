from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


app = FastAPI(
    title="Tic Tac Toe API",
    description="Backend API for managing a digital Tic Tac Toe game.",
    version="1.0.0",
    openapi_tags=[
        {"name": "Game", "description": "Endpoints for game operations"}
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Player(str, Enum):
    X = "X"
    O_PLAYER = "O"


class Move(BaseModel):
    row: int = Field(
        ...,
        ge=0,
        le=2,
        description="Row index, 0-based"
    )
    col: int = Field(
        ...,
        ge=0,
        le=2,
        description="Column index, 0-based"
    )


class BoardState(str, Enum):
    in_progress = "in_progress"
    win = "win"
    draw = "draw"


class GameStatus(BaseModel):
    board: List[List[Optional[Player]]] = Field(
        ...,
        description="3x3 board state"
    )
    current_player: Player = Field(
        ...,
        description="The player whose turn it is"
    )
    winner: Optional[Player] = Field(
        None,
        description="The winner, if game is over"
    )
    state: BoardState = Field(
        ...,
        description="Game status (in_progress, win, draw)"
    )
    message: Optional[str] = Field(
        "",
        description="Status message"
    )


# ----- In-memory game state -----
def default_board():
    return [[None for _ in range(3)] for _ in range(3)]


game = {
    "board": default_board(),
    "current_player": Player.X,
    "state": BoardState.in_progress,
    "winner": None,
    "move_count": 0,
}


# ----- Core Game Logic -----
def check_winner(board: List[List[Optional[Player]]]) -> Optional[Player]:
    # Rows, columns, diagonals
    lines = (
        board
        + [list(col) for col in zip(*board)]
        + [
            [board[i][i] for i in range(3)],
            [board[i][2 - i] for i in range(3)],
        ]
    )
    for line in lines:
        if line[0] and all(cell == line[0] for cell in line):
            return line[0]
    return None


def is_draw(board):
    return all(cell is not None for row in board for cell in row)


def get_game_status():
    winner = check_winner(game["board"])
    state = BoardState.in_progress
    message = ""
    if winner:
        state = BoardState.win
        message = f"Player {winner} wins!"
    elif is_draw(game["board"]):
        state = BoardState.draw
        message = "Draw!"
    return GameStatus(
        board=game["board"],
        current_player=game["current_player"],
        winner=winner,
        state=state,
        message=message
    )


# PUBLIC_INTERFACE
@app.get("/", tags=["Game"])
def health_check():
    """
    Health Check endpoint.

    Returns:
        JSON message indicating health.
    """
    return {"message": "Healthy"}


# PUBLIC_INTERFACE
@app.post(
    "/game/start",
    response_model=GameStatus,
    tags=["Game"],
    summary="Start a new game",
    description=(
        "Resets the board and starts a new Tic Tac Toe game."
    ),
)
def start_new_game():
    """
    Start a new game of Tic Tac Toe.

    Returns:
        GameStatus: The reset board and starting player.
    """
    game["board"] = default_board()
    game["current_player"] = Player.X
    game["state"] = BoardState.in_progress
    game["winner"] = None
    game["move_count"] = 0
    return get_game_status()


# PUBLIC_INTERFACE
@app.get(
    "/game/board",
    response_model=GameStatus,
    tags=["Game"],
    summary="Get board status",
    description=(
        "Retrieves the current board state, active player, and outcome (if any)."
    ),
)
def get_board():
    """
    Get the current status of the game board.

    Returns:
        GameStatus: Board, player, state, winner, and message.
    """
    return get_game_status()


# PUBLIC_INTERFACE
@app.post(
    "/game/move",
    response_model=GameStatus,
    tags=["Game"],
    summary="Make a move",
    description=(
        "Submit a move for the current player."
        " Returns board state and status update."
    ),
)
def make_move(move: Move):
    """
    Make a move as the current player.

    Args:
        move (Move): The move to make.

    Raises:
        HTTPException: Invalid move or game not in progress.

    Returns:
        GameStatus: Updated board/status/result.
    """
    if game["state"] != BoardState.in_progress:
        raise HTTPException(
            status_code=400,
            detail="Game is not in progress. (Already won or draw)"
        )
    r, c = move.row, move.col
    if not (0 <= r <= 2 and 0 <= c <= 2):
        raise HTTPException(
            status_code=400,
            detail="Row and column must be between 0 and 2."
        )
    if game["board"][r][c] is not None:
        raise HTTPException(
            status_code=400,
            detail="That cell is already occupied."
        )
    game["board"][r][c] = game["current_player"]
    game["move_count"] += 1

    winner = check_winner(game["board"])
    if winner:
        game["state"] = BoardState.win
        game["winner"] = winner
    elif is_draw(game["board"]):
        game["state"] = BoardState.draw
        game["winner"] = None
    else:
        # Switch player
        game["current_player"] = (
            Player.O_PLAYER
            if game["current_player"] == Player.X
            else Player.X
        )

    return get_game_status()


# PUBLIC_INTERFACE
@app.post(
    "/game/restart",
    response_model=GameStatus,
    tags=["Game"],
    summary="Restart current game",
    description=(
        "Restart the current game (clears the board, X goes first)."
    ),
)
def restart_game():
    """
    Explicitly restart the current game (same as start).

    Returns:
        GameStatus: The reset state.
    """
    game["board"] = default_board()
    game["current_player"] = Player.X
    game["state"] = BoardState.in_progress
    game["winner"] = None
    game["move_count"] = 0
    return get_game_status()
