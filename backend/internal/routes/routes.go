package routes

import (
	"github.com/gin-gonic/gin"

	"si-bvet/internal/handlers"
)

func RegisterRoutes(r *gin.Engine)  {

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
		}

		api.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "pong",
			})
		})
	}
}