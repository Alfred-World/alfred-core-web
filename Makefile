# Alfred Core Web - Next.js Frontend Makefile

.PHONY: help install dev build start generate lint format clean clear

help:
	@echo "======================================"
	@echo "Alfred Core Web - Next.js Frontend"
	@echo "======================================"
	@echo ""
	@echo "📦 Dependencies:"
	@echo "  make install     Install dependencies"
	@echo ""
	@echo "🏗️  Development:"
	@echo "  make dev         Start dev server (Turbopack)"
	@echo "  make build       Build for production"
	@echo "  make start       Start production server"
	@echo ""
	@echo "🔄 API Generation:"
	@echo "  make generate    Generate API hooks from OpenAPI (Orval)"
	@echo ""
	@echo "🧹 Code Quality:"
	@echo "  make lint        Run ESLint"
	@echo "  make lint-fix    Run ESLint with auto-fix"
	@echo "  make format      Run Prettier"
	@echo ""
	@echo "🗑️  Clean:"
	@echo "  make clean       Remove .next build cache"
	@echo "  make clear       Remove node_modules and .next"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	pnpm install
	@echo "✅ Dependencies installed!"

# Start development server with Turbopack
dev:
	@echo "🚀 Starting development server..."
	pnpm dev

# Build for production
build:
	@echo "🔨 Building for production..."
	pnpm build
	@echo "✅ Build complete!"

# Start production server
start:
	@echo "▶️  Starting production server..."
	pnpm start

# Generate API hooks from OpenAPI spec (requires backend running)
generate:
	@echo "🔄 Generating API hooks from OpenAPI spec..."
	@echo "⚠️  Make sure alfred-core backend is running!"
	pnpm generate
	@echo "✅ API hooks generated in src/generated/"

# Run ESLint
lint:
	@echo "🔍 Running ESLint..."
	pnpm lint

# Run ESLint with auto-fix
lint-fix:
	@echo "🔧 Running ESLint with auto-fix..."
	pnpm lint:fix

# Run Prettier
format:
	@echo "✨ Formatting code..."
	pnpm format

# Remove .next cache
clean:
	@echo "🧹 Removing .next cache..."
	pnpm clean
	@echo "✅ Clean complete!"

# Remove node_modules and .next
clear:
	@echo "🗑️  Removing node_modules and .next..."
	pnpm clear
	@echo "✅ Clear complete!"
