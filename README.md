# dGameBet - Decentralized Football Betting

A transparent, trustless betting platform for football matches powered by Ethereum smart contracts on the Sepolia testnet.

## Overview

dGameBet enables organizers to create betting markets for football matches, where users can place fixed-amount bets on team victories. The system operates entirely on the Ethereum blockchain, ensuring transparency, immutability, and trustless execution of betting logic.

### Key Features

- **Trustless Betting:** Smart contracts handle all funds and prize distribution
- **Transparent Operations:** All bets and outcomes are publicly verifiable on-chain
- **Fair Prize Distribution:** Automatic 95/5 split between winners and organizers
- **Pull Payment Pattern:** Secure withdrawal mechanism (no push payments)
- **Rating System:** Bettors can rate organizers (1-5 stars) after match completion
- **Real-time Updates:** WebSocket-based live notifications

## Architecture

| Component       | Technology                        | Port |
| --------------- | --------------------------------- | ---- |
| Smart Contracts | Solidity 0.8.24 + Foundry         | -    |
| Backend         | Node.js 20 + Fastify + TypeScript | 3001 |
| Frontend        | Next.js 14 + wagmi + RainbowKit   | 3000 |
| Database        | PostgreSQL 16                     | 5432 |
| Cache           | Redis 7                           | 6379 |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Make

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd dGameBet

# Create environment file
make setup-env
# Edit .env with your Alchemy/Infura RPC URL

# Start all services (database migrations run automatically)
make up
```

### Access

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **API Health:** http://localhost:3001/health

## Commands

```bash
# Docker
make up              # Start all services
make down            # Stop all services
make logs            # View service logs
make rebuild         # Rebuild and restart
make clean           # Remove all containers and volumes

# Smart Contracts
make contracts-build     # Compile contracts
make contracts-test      # Run tests
make contracts-coverage  # Coverage report
make contracts-fuzz      # Fuzz testing (10k runs)
make contracts-clean     # Clear build cache
make contracts-deploy    # Clean, build, and deploy to Sepolia
make contracts-abi       # Generate ABIs for backend & frontend
make contracts-lint      # Check contract formatting
make contracts-fmt       # Auto-format contract code

# Backend
make backend-build       # Build backend
make backend-test        # Run tests
make backend-coverage    # Coverage report
make backend-lint        # Lint code
make backend-migrate     # Run database migrations (auto on start)

# Frontend
make frontend-build      # Build frontend
make frontend-test       # Run tests
make frontend-coverage   # Coverage report
make frontend-lint       # Lint code

# Full Project
make test            # Run all tests
make coverage        # Full coverage report
make build           # Build everything
make lint            # Lint everything
make test-integration    # Run integration tests
make test-e2e            # Run E2E tests (Playwright)

# Data & Utilities
make fetch-teams     # Fetch team data from TheSportsDB API
make setup-env       # Create .env from .env.example
make check-deps      # Verify Docker & Compose are installed
```

## Smart Contracts

### BetFactory

Factory contract that deploys individual match contracts and manages the organizer rating system.

### BetMatch

Individual betting match contract with:

- Fixed bet amounts
- Team A / Team B betting
- Result setting (organizer only, after match start)
- Prize claiming (95% to winners)
- Refund claiming (100% on draws)

### Security

- ReentrancyGuard on all state-changing functions with external calls (`setResult`, `claimPrize`, `claimRefund`)
- Checks-Effects-Interactions pattern
- Pull payment pattern (no push payments)
- Graceful organizer payment failure handling (emits event, doesn't block match completion)
- Custom errors for gas efficiency
- Input validation on all parameters
- Mathematically proven solvency (7 fuzz invariants, 10,000 runs each)

## API Endpoints

| Method | Endpoint                              | Description                                                      |
| ------ | ------------------------------------- | ---------------------------------------------------------------- |
| GET    | `/api/v1/matches`                     | List all matches (supports `organizer`, `sort`, `order` filters) |
| GET    | `/api/v1/matches/active`              | Active matches                                                   |
| GET    | `/api/v1/matches/completed`           | Completed matches                                                |
| GET    | `/api/v1/matches/:address`            | Match details                                                    |
| GET    | `/api/v1/matches/:address/bets`       | Match bets                                                       |
| GET    | `/api/v1/matches/:address/stats`      | Match statistics                                                 |
| GET    | `/api/v1/users/:address/bets`         | User bets                                                        |
| GET    | `/api/v1/users/:address/unclaimed`    | Unclaimed prizes                                                 |
| GET    | `/api/v1/organizers/:address`         | Organizer profile                                                |
| GET    | `/api/v1/organizers/:address/matches` | Organizer's matches (paginated)                                  |
| GET    | `/api/v1/organizers/:address/ratings` | Organizer's ratings (paginated)                                  |
| GET    | `/api/v1/organizers/top`              | Top-rated organizers                                             |
| GET    | `/health`                             | Health check                                                     |
| GET    | `/health/detailed`                    | Detailed health (DB, Redis, blockchain)                          |

## Project Structure

```
dGameBet/
├── contracts/          # Solidity smart contracts (Foundry)
│   ├── src/            # Contract source files
│   ├── test/           # Contract tests
│   └── script/         # Deployment scripts
├── backend/            # Node.js backend service
│   └── src/
│       ├── api/        # REST & WebSocket routes
│       ├── services/   # Business logic
│       ├── db/         # Database schema
│       ├── blockchain/ # Indexer & chain client
│       └── config/     # Configuration
├── frontend/           # Next.js frontend
│   └── src/
│       ├── app/        # Pages (App Router)
│       ├── components/ # UI components
│       ├── hooks/      # Custom React hooks
│       ├── lib/        # Utilities & configs
│       └── types/      # TypeScript types
├── scripts/            # Utility scripts
```

## Testing

| Component       | Coverage Target | Framework                |
| --------------- | --------------- | ------------------------ |
| Smart Contracts | 100%            | Foundry (forge test)     |
| Backend         | 80%+            | Vitest                   |
| Frontend        | 80%+            | Vitest + Testing Library |

## License

MIT
