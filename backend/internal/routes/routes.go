package routes

import (
	"github.com/gin-gonic/gin"

	"si-bvet/internal/handlers"
	"si-bvet/internal/middleware"
)

type Dependencies struct {
	AuthHandler         *handlers.AuthHandler
	SubmissionHandler   *handlers.SubmissionHandler
	AdminHandler        *handlers.AdminHandler
	ComplaintHandler    *handlers.ComplaintHandler
	FeedbackHandler     *handlers.FeedbackHandler
	NotificationHandler *handlers.NotificationHandler
	UserHandler         *handlers.UserHandler
	LHUHandler          *handlers.LHUHandler
	TestServiceHandler  *handlers.TestServiceHandler
	BillingHandler      *handlers.BillingHandler
}

func mustDependency[T any](name string, dep T) T {
	if any(dep) == nil {
		panic(name + " dependency is required")
	}
	return dep
}

func RegisterRoutes(r *gin.Engine, deps Dependencies) {
	authHandler := mustDependency("auth handler", deps.AuthHandler)
	submissionHandler := mustDependency("submission handler", deps.SubmissionHandler)
	adminHandler := mustDependency("admin handler", deps.AdminHandler)
	complaintHandler := mustDependency("complaint handler", deps.ComplaintHandler)
	feedbackHandler := mustDependency("feedback handler", deps.FeedbackHandler)
	notificationHandler := mustDependency("notification handler", deps.NotificationHandler)
	userHandler := mustDependency("user handler", deps.UserHandler)
	lhuHandler := mustDependency("lhu handler", deps.LHUHandler)
	testServiceHandler := mustDependency("test service handler", deps.TestServiceHandler)
	billingHandler := mustDependency("billing handler", deps.BillingHandler)
	
	// serve uploaded files from internal/uploads for both direct and /api-prefixed URLs
	r.Static("/uploads", "internal/uploads")
	r.Static("/api/uploads", "internal/uploads")

	api := r.Group("/api")
	{

		// PUBLIC
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.RegisterCustomer)
			auth.POST("/login", authHandler.Login)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password/:id/:token", authHandler.ResetPassword)
			auth.GET("/verify-email/:id/:token", authHandler.VerifyEmailLogin)
		}

		// PROTECTED
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/profile", userHandler.Profile)
			protected.PATCH("/profile", userHandler.UpdateProfile)
			protected.GET("/dashboard", userHandler.UserDashboard)

			protectedAuth := protected.Group("/auth")
			{
				protectedAuth.PATCH("/change-password", authHandler.ChangePassword)
			}

			// SUPERADMIN
			superAdminGroup := protected.Group("/superadmin")
			superAdminGroup.Use(middleware.RequireRole("superadmin"))
			{
				superAdminGroup.POST("/admin-accounts", adminHandler.CreateAdmin)
				superAdminGroup.GET("/admin-accounts", adminHandler.GetAllAdminAccounts)
				superAdminGroup.PATCH("/admin-accounts/:id", adminHandler.UpdateAdminAccount)
				superAdminGroup.DELETE("/admin-accounts/:id", adminHandler.DeleteAdminAccount)
				superAdminGroup.PATCH("/admin-accounts/:id/verify", adminHandler.VerifyUser)

				superAdminGroup.POST("/test-services", testServiceHandler.CreateTestService)
				superAdminGroup.POST("/test-services/import", testServiceHandler.ImportTestServicesExcel)

				superAdminGroup.POST("/submissions/samples/template", submissionHandler.UploadSampleTemplate)

				superAdminGroup.GET("/activity-logs", handlers.GetActivityLogsHandler)
			}

			// ADMIN
			adminGroup := protected.Group("/admin")
			adminGroup.Use(middleware.RequireRole("superadmin", "admin"))
			{

				adminGroup.GET("/customers", adminHandler.GetAllCustomers)
				adminGroup.PATCH("/customers/:id/verify", adminHandler.VerifyUser)
				adminGroup.PATCH("/customers/:id/reject", adminHandler.RejectUser)

				adminGroup.GET("/submissions", submissionHandler.GetAllSubmissions)
				adminGroup.PATCH("/submissions/:id/approve", submissionHandler.ApproveSubmission)
				adminGroup.PATCH("/submissions/:id/reject", submissionHandler.RejectSubmission)
				adminGroup.POST("/submissions/export", submissionHandler.ExportSubmissionsExcel)

				adminGroup.GET("/test-services", testServiceHandler.GetAllTestServices)
				adminGroup.GET("/test-services/:id", testServiceHandler.GetTestServiceByID)
				adminGroup.PATCH("/test-services/:id", testServiceHandler.UpdateTestService)
				adminGroup.DELETE("/test-services/:id", testServiceHandler.DeleteTestService)

				adminGroup.POST("/billings/:submission_id", billingHandler.CreateBilling)
				adminGroup.GET("/billings/:submission_id", billingHandler.GetBillingBySubmissionID)
				adminGroup.PATCH("/billings/:submission_id", billingHandler.UpdateBilling)
				adminGroup.PATCH("/billings/:submission_id/verify", billingHandler.VerifyPayment)
				adminGroup.PATCH("/billings/:submission_id/reject", billingHandler.RejectPayment)

				adminGroup.GET("/submissions/:id/lhu", lhuHandler.GetLHU)
				adminGroup.POST("/submissions/:id/lhu", lhuHandler.UploadLHU)

				adminGroup.GET("/feedbacks", feedbackHandler.GetAllFeedbacks)

				adminGroup.GET("/complaints", complaintHandler.GetAllComplaints)
				adminGroup.PATCH("/complaints/:id/respond", complaintHandler.UpdateComplaintResponse)
			}

			// CUSTOMER
			customerGroup := protected.Group("/customer")
			customerGroup.Use(middleware.RequireRole("customer"))
			{
				customerGroup.GET("/notifications", notificationHandler.GetMyNotifications)
				customerGroup.PATCH("/notifications/:id/read", notificationHandler.MarkNotificationAsRead)
				customerGroup.PATCH("/notifications/read-all", notificationHandler.MarkAllNotificationsAsRead)

				customerGroup.POST("/submissions", submissionHandler.CreateSubmission)
				customerGroup.GET("/submissions/samples/template", submissionHandler.DownloadSampleTemplate)
				customerGroup.POST("/submissions/:submission_id/samples/import", submissionHandler.ImportSampleTemplate)
				customerGroup.GET("/submissions/my", submissionHandler.GetMySubmissions)
				customerGroup.PATCH("/submissions/:id", submissionHandler.UpdateSubmission)
				customerGroup.GET("/submissions/:id/tracking", submissionHandler.GetSubmissionTrackingTimeline)

				customerGroup.GET("/test-services", testServiceHandler.GetAllTestServices)
				customerGroup.GET("/test-services/:id", testServiceHandler.GetTestServiceByID)

				customerGroup.GET("/billings/:submission_id", billingHandler.GetBillingBySubmissionID)
				customerGroup.POST("/billings/:submission_id/proof", billingHandler.UploadBillingProof)

				customerGroup.GET("/submissions/:id/lhu", lhuHandler.GetLHU)
				customerGroup.GET("/submissions/:id/lhu/download", lhuHandler.DownloadLHU)

				customerGroup.POST("/feedbacks", feedbackHandler.CreateFeedback)
				customerGroup.GET("/feedbacks", feedbackHandler.GetMyFeedbacks)

				customerGroup.GET("/complaints", complaintHandler.GetMyComplaints)
				customerGroup.POST("/complaints", complaintHandler.CreateComplaint)
			}

		}

		api.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "pong",
			})
		})
	}
}
