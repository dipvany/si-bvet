package models

import "time"

type Feedback struct {
	ID 	 uint      `json:"id" gorm:"primaryKey"`
	Fullname string	 `json:"fullname" gorm:"column:fullname;not null"`
	Email    string	 `json:"email" gorm:"column:email;not null"`
	Gender   string	 `json:"gender" gorm:"column:gender"`
	LastEducation string	 `json:"last_education" gorm:"column:last_education"`
	Occupation string	 `json:"occupation" gorm:"column:occupation"`
	TypeService string `json:"type_service" gorm:"column:type_service;not null"`
	CreatedAt time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`

	Answers       []FeedbackAnswer `gorm:"foreignKey:FeedbackID"`
}

type FeedbackQuestion struct {
    ID           uint   `gorm:"primaryKey"`
    QuestionText string `gorm:"type:text;not null"`
    IsActive     bool   `gorm:"default:true"`
}

type FeedbackAnswer struct {
    ID         uint `gorm:"primaryKey"`
    FeedbackID uint `gorm:"not null;index"` 
    QuestionID uint `gorm:"not null;index"` 
    Rating     int  `gorm:"not null"`       
}

func (Feedback) TableName() string {
	return "Feedback"
}

func (FeedbackQuestion) TableName() string {
	return "FeedbackQuestions"
}

func (FeedbackAnswer) TableName() string {
	return "FeedbackAnswers"
}