package models

import "time"

type Feedback struct {
	ID        uint       `json:"id" gorm:"primaryKey;column:id"`
	UserID    uint       `json:"user_id" gorm:"column:user_id;not null;index:idx_feedback_user_id"`
	Rating    int        `json:"rating" gorm:"column:rating;not null;check:rating >= 1 AND rating <= 5"`
	Comments  string     `json:"comments" gorm:"column:comments;type:text"`
	CreatedAt *time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`

	User User `json:"-" gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (Feedback) TableName() string {
	return "Feedback"
}