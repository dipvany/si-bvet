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
			auth.POST("/register", handlers.RegisterCustomer)
			auth.POST("/login", handlers.Login)
		}

		// PROTECTED
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/profile", handlers.Profile)

			// SUPERADMIN
			superAdminGroup := protected.Group("/superadmin")
			superAdminGroup.Use(middleware.RequireRole("superadmin"))
			{
				superAdminGroup.POST("/create-admin", handlers.CreateAdmin)
			}

			// ADMIN
			adminGroup := protected.Group("/admin")
			adminGroup.Use(middleware.RequireRole("superadmin", "admin"))	
			{
				adminGroup.GET("/dashboard", handlers.AdminDashboard)
				adminGroup.PUT("/verify/:id", handlers.VerifyUser)
				adminGroup.GET("/submissions", handlers.GetAllSubmissions)
				adminGroup.PUT("/submissions/:id/approve", handlers.ApproveSubmission)
				adminGroup.PUT("/submissions/:id/reject", handlers.RejectSubmission)
			}

			// CUSTOMER
			customerGroup := protected.Group("/customer")
			customerGroup.Use(middleware.RequireRole("customer"))
			{ 
				customerGroup.GET("/dashboard", handlers.CustomerDashboard)
				customerGroup.POST("/submissions", handlers.CreateSubmission)
				customerGroup.GET("/submissions/my", handlers.GetMySubmissions)
			}

		}

		
	
		// api.GET("/ping", func(c *gin.Context) {
		// 	c.JSON(200, gin.H{
		// 		"message": "pong",
		// 	})
		// })
	}
}