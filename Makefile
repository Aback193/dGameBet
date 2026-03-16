#!make
ifneq (,$(wildcard .env))
	include .env
	export $(shell grep -v '^\#' .env | grep '=' | cut -d= -f1)
endif

.PHONY: help up down logs rebuild clean \
        contracts-clean contracts-build contracts-test contracts-coverage contracts-deploy contracts-abi contracts-lint contracts-fmt \
        backend-build backend-test backend-coverage backend-lint backend-migrate backend-shell \
        frontend-build frontend-test frontend-coverage frontend-lint frontend-shell \
        lint test coverage build \
        test-integration test-e2e \
        setup-env check-deps fetch-teams

# ============================================================================
# Docker Commands
# ============================================================================

up:
	docker-compose up -d
	@echo "Services started. Frontend: http://localhost:3000, Backend: http://localhost:3001"

down:
	docker-compose down

logs:
	docker-compose logs -f

rebuild:
	docker-compose up -d --build

clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

# ============================================================================
# Contract Commands
# ============================================================================

contracts-clean:
	docker volume rm -f dgamebet_contracts_cache dgamebet_contracts_out 2>/dev/null || true
	@echo "Contract build cache cleared"

contracts-build:
	docker-compose run --rm contracts forge build

contracts-test:
	docker-compose run --rm contracts sh -c "rm -rf cache/fuzz/failures 2>/dev/null; forge test -vvv"

contracts-coverage:
	docker-compose run --rm contracts sh -c "rm -rf cache/fuzz/failures 2>/dev/null; forge coverage"

contracts-fuzz:
	docker-compose run --rm contracts sh -c "rm -rf cache/fuzz/failures 2>/dev/null; forge test --fuzz-runs 10000"

contracts-deploy: contracts-clean contracts-build
	docker-compose run --rm contracts forge script script/Deploy.s.sol \
		--rpc-url $(RPC_URL) \
		--broadcast \
		--verify

contracts-abi:
	docker-compose run --rm contracts forge build
	@mkdir -p backend/src/blockchain/abis frontend/src/lib/abis
	docker-compose run --rm contracts cat /app/out/BetFactory.sol/BetFactory.json > backend/src/blockchain/abis/BetFactory.json
	docker-compose run --rm contracts cat /app/out/BetMatch.sol/BetMatch.json > backend/src/blockchain/abis/BetMatch.json
	@cp backend/src/blockchain/abis/BetFactory.json frontend/src/lib/abis/
	@cp backend/src/blockchain/abis/BetMatch.json frontend/src/lib/abis/
	@echo "ABIs copied to backend and frontend"

contracts-lint:
	docker-compose run --rm contracts forge fmt --check

contracts-fmt:
	docker-compose run --rm contracts forge fmt

contracts-fmt-check: contracts-lint

contracts-deploy-local: contracts-build
	docker-compose run --rm contracts forge script script/Deploy.s.sol \
		--rpc-url http://host.docker.internal:8545 \
		--broadcast

# ============================================================================
# Backend Commands
# ============================================================================

backend-build:
	docker-compose run --rm backend npm run build

backend-test:
	docker-compose run --rm backend npm test

backend-coverage:
	docker-compose run --rm backend npm run test:coverage

backend-lint:
	docker-compose run --rm backend npm run lint

backend-migrate:
	docker-compose run --rm backend npm run db:migrate

backend-shell:
	docker-compose exec backend sh

# ============================================================================
# Frontend Commands
# ============================================================================

frontend-build:
	docker-compose run --rm frontend npm run build

frontend-test:
	docker-compose run --rm frontend npm test

frontend-coverage:
	docker-compose run --rm frontend npm run test:coverage

frontend-lint:
	docker-compose run --rm frontend npm run lint

frontend-shell:
	docker-compose exec frontend sh

# ============================================================================
# Full Project Commands
# ============================================================================

lint: contracts-lint backend-lint frontend-lint
	@echo "All linting passed!"

test: contracts-test backend-test frontend-test
	@echo "All tests passed!"

coverage: contracts-coverage backend-coverage frontend-coverage
	@echo "Coverage reports generated"

build: contracts-build backend-build frontend-build
	@echo "Full project built successfully"

test-integration:
	docker-compose -f docker-compose.yml -f docker-compose.test.yml \
		run --rm backend npm run test:integration
	@echo "Integration tests passed!"

test-e2e:
	docker-compose -f docker-compose.yml -f docker-compose.test.yml \
		run --rm frontend-e2e npx playwright test
	@echo "E2E tests passed!"

# ============================================================================
# Data Commands
# ============================================================================

fetch-teams:
	@echo "Fetching team data from TheSportsDB API..."
	bash scripts/fetch-teams.sh
	@echo "All documentation generated"

# ============================================================================
# Utility Commands
# ============================================================================

setup-env:
	@cp .env.example .env
	@echo ".env file created. Please update with your values."

check-deps:
	@which docker > /dev/null || (echo "Docker not installed" && exit 1)
	@which docker-compose > /dev/null || (echo "Docker Compose not installed" && exit 1)
	@echo "All dependencies available"

# ============================================================================
# Help
# ============================================================================

help:
	@echo "dGameBet - Available Commands"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make up              - Start all services"
	@echo "  make down            - Stop all services"
	@echo "  make logs            - View service logs"
	@echo "  make rebuild         - Rebuild and restart services"
	@echo "  make clean           - Remove all containers and volumes"
	@echo ""
	@echo "Contract Commands:"
	@echo "  make contracts-build     - Build smart contracts"
	@echo "  make contracts-test      - Run contract tests"
	@echo "  make contracts-coverage  - Run tests with coverage"
	@echo "  make contracts-fuzz      - Run fuzz tests"
	@echo "  make contracts-deploy    - Deploy to Sepolia"
	@echo "  make contracts-abi       - Generate ABIs"
	@echo ""
	@echo "Backend Commands:"
	@echo "  make backend-build       - Build backend"
	@echo "  make backend-test        - Run backend tests"
	@echo "  make backend-coverage    - Run tests with coverage"
	@echo "  make backend-lint        - Lint backend code"
	@echo "  make backend-migrate     - Run database migrations (auto on start)"
	@echo ""
	@echo "Frontend Commands:"
	@echo "  make frontend-build      - Build frontend"
	@echo "  make frontend-test       - Run frontend tests"
	@echo "  make frontend-coverage   - Run tests with coverage"
	@echo "  make frontend-lint       - Lint frontend code"
	@echo ""
	@echo "Full Project Commands:"
	@echo "  make lint            - Lint entire project"
	@echo "  make test            - Test entire project"
	@echo "  make coverage        - Full coverage report"
	@echo "  make build           - Build entire project"
	@echo "  make test-integration - Run integration tests"
	@echo "  make test-e2e        - Run E2E tests"
	@echo ""
	@echo "Data Commands:"
	@echo "  make fetch-teams       - Fetch team data from TheSportsDB API"
