package main

import (
	"fmt"
	"log"
	"os"

	"si-bvet/internal/bootstrap"
	"si-bvet/internal/db"
	"si-bvet/internal/services"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	// Initialize Database
	if err := db.InitDB(); err != nil {
		log.Fatalf("Could not connect to the database: %v", err)
	}

	if err := services.BootstrapInitialSuperAdmin(); err != nil {
		log.Fatalf("Could not bootstrap initial superadmin: %v", err)
	}

	r := bootstrap.NewRouter()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := fmt.Sprintf(":%s", port)
	log.Printf("Starting server on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Could not start server: %v", err)
	}

}
