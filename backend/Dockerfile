# syntax=docker/dockerfile:1

# Builder stage: compile the Go API into a single Linux binary.
FROM golang:1.22-alpine AS builder

WORKDIR /src

# Install build tools. openssh-client is needed for private repo access.
RUN apk add --no-cache ca-certificates git openssh-client

# Salin file modul dan unduh dependensi terlebih dahulu untuk caching layer Docker
COPY go.mod go.sum ./
RUN go mod download

# Salin sisa source code dan build aplikasi
COPY . .
ENV CGO_ENABLED=0
ENV GOOS=linux
RUN go build -trimpath -ldflags="-s -w" -o /app/main ./cmd/server

# --- Production Stage ---
# Menggunakan alpine sebagai base image karena ringan dan memiliki shell
# untuk menjalankan entrypoint script.
FROM alpine:latest

WORKDIR /app

# Tambahkan user dan grup non-root untuk keamanan
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Salin binary aplikasi, templates, dan file lain yang dibutuhkan dari builder stage
COPY --from=builder /app/main .
COPY --from=builder /src/templates ./templates
COPY --from=builder /src/sample_template.xlsx .

# Salin entrypoint script dan pastikan executable
COPY entrypoint.sh .
RUN chmod +x ./entrypoint.sh

# Pastikan direktori aplikasi dimiliki oleh user non-root
RUN chown -R appuser:appgroup /app

# Ganti ke user non-root
USER appuser

EXPOSE 8080
ENV GIN_MODE=release

ENTRYPOINT ["./entrypoint.sh"]
CMD ["./main"]
