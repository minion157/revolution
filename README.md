# Revolution! Board Game

A complete, polished, browser-based multiplayer implementation of the classic board game **Revolution!** (by Philip duBarry / Steve Jackson Games). 

This application allows you to host the game on a local computer and have friends join directly from their phones, tablets, or laptops on the same Wi-Fi/LAN network—no app installation required!

## Features

- **Real-Time Multiplayer:** Built with Express and Socket.IO for seamless LAN play.
- **Mobile-First Responsive UI:** Designed to work perfectly on mobile devices so players can keep their bids secret in their hands.
- **Full Game Engine:** Complete implementation of all 12 characters, 7 influence areas, and the 4 phases (Espionage, Bidding, Resolution, Patronage).
- **Hidden Information:** Server-authoritative bidding ensures that bids are never leaked to other clients before the Resolution phase.
- **Robust Reconnection:** Players can drop out and reconnect seamlessly using session tokens.
- **Interactive UI:** Smooth transitions, informative game logs, and clear indicators of whose turn it is.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A local network (Wi-Fi or LAN) for multiplayer

## Installation

1. Clone this repository to your local machine.
2. Open a terminal in the project directory.
3. Install the dependencies:
   ```bash
   npm install
   ```

## Running the Game (Development)

To run the game in development mode (with hot-reloading for both the client and server):

```bash
npm run dev
```

The server will display a QR code and a LAN address (e.g., `http://192.168.1.5:3000`). Players can scan the QR code with their phones to instantly join the lobby.

## Building and Running (Production)

For the best performance, build the game for production:

1. Build the client and server:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```

## How to Play

**Objective:** Gain the most Support (Victory Points) by the end of the game!

The game is played in rounds, each consisting of four phases:

1. **Espionage:** Players can observe each other's total available resources (Force, Blackmail, and Gold).
2. **Bidding:** Players secretly assign their resources to any of the 12 Character cards. 
   - **Force** beats Blackmail and Gold.
   - **Blackmail** beats Gold.
   - **Gold** is the tiebreaker, but more tokens always beat fewer tokens of the same type.
3. **Resolution:** Bids are revealed! The highest bidder on each character wins their favor, gaining their unique rewards (Support, new tokens, or placing Influence on the board).
4. **Patronage:** Any player with fewer than 5 tokens receives Gold until they have 5.

The game ends when the board is filled with Influence, or when the final round is triggered. The player with the most Support wins!

## Technologies Used

- **Frontend:** React, Vite, TypeScript, CSS (Mobile-responsive)
- **Backend:** Node.js, Express, Socket.IO, TypeScript
- **Testing:** Vitest
