package bootstrap

import (
	"si-bvet/internal/handlers"
	"si-bvet/internal/routes"
	"si-bvet/internal/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func NewRouter() *gin.Engine {
	authService := services.NewAuthService(&services.DefaultUserRepository{})
	authHandler := handlers.NewAuthHandler(authService)
	submissionHandler := handlers.NewSubmissionHandler(services.NewSubmissionService())

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:3000",
			"http://127.0.0.1:3000",
		},
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	routes.RegisterRoutes(r, routes.Dependencies{
		AuthHandler:         authHandler,
		SubmissionHandler:   submissionHandler,
		AdminHandler:        handlers.NewAdminHandlerWithDefault(),
		ComplaintHandler:    handlers.NewComplaintHandlerWithDefault(),
		FeedbackHandler:     handlers.NewFeedbackHandlerWithDefault(),
		NotificationHandler: handlers.NewNotificationHandlerWithDefault(),
		UserHandler:         handlers.NewUserHandlerWithDefault(),
		LHUHandler:          handlers.NewLHUHandlerWithDefault(),
		TestServiceHandler:  handlers.NewTestServiceHandlerWithDefault(),
		BillingHandler:      handlers.NewBillingHandlerWithDefault(),
	})

	return r
}
