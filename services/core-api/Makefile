# core-api — dev/CI tasks (Blueprint 14.3 CI: format → lint → test → build)

.PHONY: build test lint vet check migrate-up migrate-down run worker

build:
	go build ./...

vet:
	go vet ./...

lint:
	golangci-lint run --timeout 120s ./...

test:
	go test ./... -count=1

check: build vet lint test
	@echo "✓ all checks passed"

migrate-up:
	goose -dir migrations postgres "$(DATABASE_URL)" up

run:
	go run ./cmd/api

worker:
	go run ./cmd/worker
