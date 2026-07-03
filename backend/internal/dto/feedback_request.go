package dto

type FeedbackAnswerRequest struct {
	FeedbackID uint `json:"feedback_id,omitempty"`
	QuestionID uint `json:"question_id,omitempty"`

	Rating int `json:"rating" binding:"required,min=1,max=5"`
}

type FeedbackRequest struct {
	Fullname      string                  `json:"fullname" binding:"required"`
	Email         string                  `json:"email" binding:"required,email"`
	Gender        string                  `json:"gender" binding:"required"`
	LastEducation string                  `json:"last_education" binding:"required"`
	Occupation    string                  `json:"occupation" binding:"required"`
	TypeService   string                  `json:"type_service" binding:"required"`
	Answers       []FeedbackAnswerRequest `json:"answers" binding:"required,min=1"`
}