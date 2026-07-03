package dto

type FeedbackQuestionRequest struct {
	QuestionText string `json:"question_text" binding:"required"`
	IsActive     *bool  `json:"is_active"`
}