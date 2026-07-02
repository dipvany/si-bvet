package dto

type FeedbackRequest struct {
	Fullname      string `json:"fullname" binding:"required"`
	Email         string `json:"email" binding:"required,email"`
	Gender        string `json:"gender" binding:"required"`
	LastEducation string `json:"last_education" binding:"required"`
	Occupation    string `json:"occupation" binding:"required"`
	TypeService   string `json:"type_service" binding:"required"`
	Rating1       int    `json:"rating1" binding:"required,min=1,max=5"`
	Rating2       int    `json:"rating2" binding:"required,min=1,max=5"`
	Rating3       int    `json:"rating3" binding:"required,min=1,max=5"`
	Rating4       int    `json:"rating4" binding:"required,min=1,max=5"`
	Rating5       int    `json:"rating5" binding:"required,min=1,max=5"`
	Rating6       int    `json:"rating6" binding:"required,min=1,max=5"`
	Rating7       int    `json:"rating7" binding:"required,min=1,max=5"`
	Rating8       int    `json:"rating8" binding:"required,min=1,max=5"`
	Rating9       int    `json:"rating9" binding:"required,min=1,max=5"`
}