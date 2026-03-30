package dto

type FeedbackRequest struct {
	Rating   int    `json:"rating" binding:"required"`
	Comments string `json:"comments"`
}