# syntax=docker/dockerfile:1

# --- Tahap 1: Builder ---
# Menggunakan Node.js versi LTS (Long-Term Support) untuk membangun aplikasi.
FROM node:20-alpine AS builder

# Set direktori kerja di dalam container
WORKDIR /app

# Salin package.json dan package-lock.json (atau yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Salin sisa source code aplikasi
COPY . .

# Terima argument dari docker-compose
ARG VITE_API_URL

# Jadikan environment variable di dalam container saat build
ENV VITE_API_URL=$VITE_API_URL

# Build aplikasi untuk production
RUN npm run build

# --- Tahap 2: Production ---
# Menggunakan Nginx untuk menyajikan file statis hasil build.
FROM nginx:1.27-alpine

# Salin hasil build dari tahap 'builder' ke direktori default Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Salin file konfigurasi Nginx kustom
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 yang digunakan oleh Nginx
EXPOSE 80

# Perintah default untuk menjalankan Nginx saat container dimulai
CMD ["nginx", "-g", "daemon off;"]
