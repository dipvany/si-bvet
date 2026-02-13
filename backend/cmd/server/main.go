package main

import (
	"log"

	"si-bvet/internal/db"
	"si-bvet/internal/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found")
	}

	// Initialize Database
	if err := db.InitDB(); err != nil {
		log.Fatalf("Could not connect to the database: %v", err)
	}

	// Initialize Gin
	r := gin.Default()

	// Setup Routes
	routes.RegisterRoutes(r)

	log.Println("Starting server on :8080")
	r.Run(":8080")

}
