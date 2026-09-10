# core-api — dev/CI tasks (Blueprint 14.3 CI: format → lint → test → build)
# ملاحظة: golangci-lint/goose في GOPATH/bin — Make يمرر PATH.

LINT := $(shell command -v golangci-lint 2>/dev/null || echo "$(HOME)/go/bin/golangci-lint")
GOOSE := $(shell command -v goose 2>/dev/null || echo "$(HOME)/go/bin/goose")

.PHONY: build test lint vet check migrate-up run worker

build:
	go build ./...

vet:
	go vet ./...

lint:
	$(LINT) run --timeout 120s ./...

test:
	go test ./... -count=1

check: build vet lint test
	@echo "✓ all checks passed"

migrate-up:
	$(GOOSE) -dir migrations postgres "$(DATABASE_URL)" up

run:
	go run ./cmd/api

worker:
	go run ./cmd/worker
