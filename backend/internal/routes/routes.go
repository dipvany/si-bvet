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
			protected.PATCH("/profile", handlers.UpdateProfile)
			protected.GET("/dashboard", handlers.UserDashboard)

			// SUPERADMIN
			superAdminGroup := protected.Group("/superadmin")
			superAdminGroup.Use(middleware.RequireRole("superadmin"))
			{
				superAdminGroup.POST("/manage-account", handlers.CreateAdmin)
				superAdminGroup.PATCH("/manage-account/:id", handlers.UpdateAdminAccount)
				superAdminGroup.DELETE("/manage-account/:id", handlers.DeleteAdminAccount)
			}

			// ADMIN
			adminGroup := protected.Group("/admin")
			adminGroup.Use(middleware.RequireRole("superadmin", "admin"))	
			{

				adminGroup.GET("/manage-customer/unverified", handlers.GetUnverifiedCustomers)
				adminGroup.PATCH("/manage-customer/verify/:id", handlers.VerifyUser)
				adminGroup.PATCH("/manage-customer/reject/:id", handlers.RejectUser)

				adminGroup.GET("/submissions", handlers.GetAllSubmissions)
				adminGroup.PATCH("/submissions/:id/approve", handlers.ApproveSubmission)
				adminGroup.PATCH("/submissions/:id/reject", handlers.RejectSubmission)

				adminGroup.POST("/test-services", handlers.CreateTestService)
				adminGroup.GET("/test-services", handlers.GetAllTestServices)
				adminGroup.GET("/test-services/:id", handlers.GetTestServiceByID)
				adminGroup.PATCH("/test-services/:id", handlers.UpdateTestService)
				adminGroup.DELETE("/test-services/:id", handlers.DeleteTestService)

				adminGroup.POST("/billings/:submission_id", handlers.CreateBilling)
				adminGroup.GET("/billings/:submission_id", handlers.GetBillingBySubmissionID)
				adminGroup.PATCH("/billings/:submission_id", handlers.UpdateBilling)
				adminGroup.PATCH("/billings/verify/:submission_id", handlers.VerifyPayment)
				adminGroup.PATCH("/billings/reject/:submission_id", handlers.RejectPayment)

				adminGroup.PATCH("/lhu/upload/:submission_id", handlers.UploadLHU)
				adminGroup.GET("/lhu/:submission_id", handlers.GetLHU)

				adminGroup.GET("/feedbacks", handlers.GetAllFeedbacks)

				adminGroup.GET("/complaints", handlers.GetAllComplaints)
				adminGroup.PATCH("/complaints/respond/:id", handlers.UpdateComplaintResponse)
			}

			// CUSTOMER
			customerGroup := protected.Group("/customer")
			customerGroup.Use(middleware.RequireRole("customer"))
			{ 

				customerGroup.POST("/submissions", handlers.CreateSubmission)
				customerGroup.GET("/submissions/my", handlers.GetMySubmissions)
				customerGroup.PATCH("/submissions/:id", handlers.UpdateSubmission)
				customerGroup.GET("/submissions/:id/tracking", handlers.GetSubmissionTrackingTimeline)
				
				customerGroup.GET("/test-services", handlers.GetAllTestServices)
				customerGroup.GET("/test-services/:id", handlers.GetTestServiceByID)

				customerGroup.GET("/billings/:submission_id", handlers.GetBillingBySubmissionID)
				customerGroup.POST("/billings/upload-proof/:submission_id", handlers.UploadBillingProof)

				customerGroup.GET("/lhu/:submission_id", handlers.GetLHU)
				customerGroup.GET("/lhu/download/:submission_id", handlers.DownloadLHU)

				customerGroup.POST("/feedback", handlers.CreateFeedback)
				customerGroup.GET("/feedback", handlers.GetMyFeedbacks)

				customerGroup.GET("/complaints", handlers.GetMyComplaints)
				customerGroup.POST("/complaints", handlers.CreateComplaint)
			}

		}
	
		// api.GET("/ping", func(c *gin.Context) {
		// 	c.JSON(200, gin.H{
		// 		"message": "pong",
		// 	})
		// })
	}
}