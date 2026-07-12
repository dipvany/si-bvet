# syntax=docker/dockerfile:1

# Builder stage: compile the Go API into a single Linux binary.
FROM golang:1.25-alpine AS builder

WORKDIR /src

# Install build tools. openssh-client is needed for private repo access.
RUN apk add --no-cache ca-certificates git openssh-client

# Download dependencies first so Docker can reuse this layer when source code changes.
COPY go.mod go.sum ./

# Mount the SSH key secret to download private modules.
# This requires running `docker-compose build` or `docker build` with BuildKit.
# We add github.com to known_hosts to avoid interactive prompts.
RUN --mount=type=ssh,id=default mkdir -p -m 0700 ~/.ssh && ssh-keyscan github.com gitlab.com bitbucket.org >> ~/.ssh/known_hosts && go mod download

# Copy the full backend source and build the server entrypoint.
COPY . .
ENV CGO_ENABLED=0
ENV GOOS=linux
RUN go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# Production stage: run the static binary on a minimal image suitable for Cloud Run.
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

COPY --from=builder /out/server /app/server

# Cloud Run expects the container to listen on the provided PORT, with 8080 as the default.
EXPOSE 8080
ENV PORT=8080
ENV GIN_MODE=release

USER nonroot:nonroot
ENTRYPOINT ["/app/server"]