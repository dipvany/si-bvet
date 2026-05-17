package routes

import (
	"github.com/gin-gonic/gin"

	"si-bvet/internal/handlers"
	"si-bvet/internal/middleware"
	"si-bvet/internal/services"
)

func RegisterRoutes(r *gin.Engine) {
	// Initialize services with repositories
	userRepo := &services.DefaultUserRepository{}
	authService := services.NewAuthService(userRepo)
	authHandler := handlers.NewAuthHandler(authService)
	
	submissionHandler := handlers.NewSubmissionHandler(services.NewSubmissionService())

	api := r.Group("/api")
	{

		// PUBLIC
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.RegisterCustomer)
			auth.POST("/login", authHandler.Login)
			auth.GET("/verify-email/:id/:token", authHandler.VerifyEmailLogin)
		}

		// PROTECTED
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/profile", handlers.Profile)
			protected.PATCH("/profile", handlers.UpdateProfile)
			protected.GET("/dashboard", handlers.UserDashboard)

			// SUPERADMIN
			superAdminGroup := protected.Group("/superadmin")
			superAdminGroup.Use(middleware.RequireRole("superadmin"))
			{
				superAdminGroup.POST("/admin-accounts", handlers.CreateAdmin)
				superAdminGroup.GET("/admin-accounts", handlers.GetAllAdminAccounts)
				superAdminGroup.PATCH("/admin-accounts/:id", handlers.UpdateAdminAccount)
				superAdminGroup.DELETE("/admin-accounts/:id", handlers.DeleteAdminAccount)
			}

			// ADMIN
			adminGroup := protected.Group("/admin")
			adminGroup.Use(middleware.RequireRole("superadmin", "admin"))
			{

				adminGroup.GET("/customers/unverified", handlers.GetUnverifiedCustomers)
				adminGroup.PATCH("/customers/:id/verify", handlers.VerifyUser)
				adminGroup.PATCH("/customers/:id/reject", handlers.RejectUser)

				adminGroup.GET("/submissions", submissionHandler.GetAllSubmissions)
				adminGroup.PATCH("/submissions/:id/approve", submissionHandler.ApproveSubmission)
				adminGroup.PATCH("/submissions/:id/reject", submissionHandler.RejectSubmission)
				adminGroup.POST("/submissions/export", submissionHandler.ExportSubmissionsExcel)

				adminGroup.POST("/test-services", handlers.CreateTestService)
				adminGroup.POST("/test-services/import", handlers.ImportTestServicesExcel)
				adminGroup.GET("/test-services", handlers.GetAllTestServices)
				adminGroup.GET("/test-services/:id", handlers.GetTestServiceByID)
				adminGroup.PATCH("/test-services/:id", handlers.UpdateTestService)
				adminGroup.DELETE("/test-services/:id", handlers.DeleteTestService)

				adminGroup.POST("/billings/:submission_id", handlers.CreateBilling)
				adminGroup.GET("/billings/:submission_id", handlers.GetBillingBySubmissionID)
				adminGroup.PATCH("/billings/:submission_id", handlers.UpdateBilling)
				adminGroup.PATCH("/billings/:submission_id/verify", handlers.VerifyPayment)
				adminGroup.PATCH("/billings/:submission_id/reject", handlers.RejectPayment)

				adminGroup.GET("/submissions/:id/lhu", handlers.GetLHU)
				adminGroup.POST("/submissions/:id/lhu", handlers.UploadLHU)

				adminGroup.GET("/feedbacks", handlers.GetAllFeedbacks)

				adminGroup.GET("/complaints", handlers.GetAllComplaints)
				adminGroup.PATCH("/complaints/:id/respond", handlers.UpdateComplaintResponse)
			}

			// CUSTOMER
			customerGroup := protected.Group("/customer")
			customerGroup.Use(middleware.RequireRole("customer"))
			{
				customerGroup.GET("/notifications", handlers.GetMyNotifications)
				customerGroup.PATCH("/notifications/:id/read", handlers.MarkNotificationAsRead)
				customerGroup.PATCH("/notifications/read-all", handlers.MarkAllNotificationsAsRead)

				customerGroup.POST("/submissions", submissionHandler.CreateSubmission)
				customerGroup.GET("/submissions/my", submissionHandler.GetMySubmissions)
				customerGroup.PATCH("/submissions/:id", submissionHandler.UpdateSubmission)
				customerGroup.GET("/submissions/:id/tracking", submissionHandler.GetSubmissionTrackingTimeline)

				customerGroup.GET("/test-services", handlers.GetAllTestServices)
				customerGroup.GET("/test-services/:id", handlers.GetTestServiceByID)

				customerGroup.GET("/billings/:submission_id", handlers.GetBillingBySubmissionID)
				customerGroup.POST("/billings/:submission_id/proof", handlers.UploadBillingProof)

				customerGroup.GET("/submissions/:id/lhu", handlers.GetLHU)
				customerGroup.GET("/submissions/:id/lhu/download", handlers.DownloadLHU)

				customerGroup.POST("/feedbacks", handlers.CreateFeedback)
				customerGroup.GET("/feedbacks", handlers.GetMyFeedbacks)

				customerGroup.GET("/complaints", handlers.GetMyComplaints)
				customerGroup.POST("/complaints", handlers.CreateComplaint)
			}

		}

		api.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "pong",
			})
		})
	}
}
