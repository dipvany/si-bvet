package routes

import (
	"github.com/gin-gonic/gin"

	"si-bvet/internal/handlers"
	"si-bvet/internal/middleware"
)

func RegisterRoutes(r *gin.Engine)  {

	api := r.Group("/api")
	{

		// PUBLIC
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
		}

		// PROTECTED
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/profile", handlers.Profile)

			// ADMIN
			adminGroup := protected.Group("/admin")
			adminGroup.Use(middleware.RequireRole("admin"))	
			{
				adminGroup.GET("/dashboard", handlers.AdminDashboard)
				adminGroup.PUT("/verify/:id", handlers.VerifyUser)
			}

			// CUSTOMER
			customerGroup := protected.Group("/customer")
			customerGroup.Use(middleware.RequireRole("customer"))
			{ 
				customerGroup.GET("/dashboard", handlers.CustomerDashboard)
			}
		}
	
		// api.GET("/ping", func(c *gin.Context) {
		// 	c.JSON(200, gin.H{
		// 		"message": "pong",
		// 	})
		// })
	}
}