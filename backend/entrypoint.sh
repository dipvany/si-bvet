#!/bin/sh
# entrypoint.sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Direktori dasar untuk unggahan, harus cocok dengan docker-compose.yml
UPLOAD_DIR="/app/uploads"

# Buat sub-direktori yang diperlukan oleh aplikasi jika belum ada
# 'chown -R appuser:appuser' mungkin diperlukan jika Dockerfile Anda menggunakan user non-root
mkdir -p "$UPLOAD_DIR/registration-docs"
mkdir -p "$UPLOAD_DIR/submission-attachments"
mkdir -p "$UPLOAD_DIR/billing-proofs"
mkdir -p "$UPLOAD_DIR/complaints"
mkdir -p "$UPLOAD_DIR/lhu"
mkdir -p "$UPLOAD_DIR/submission-sample-templates"

# Jalankan perintah utama dari Dockerfile (misalnya, CMD ["./main"])
exec "$@"