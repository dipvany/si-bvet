package models

import "time"

type Feedback struct {
	// ID        uint       `json:"id" gorm:"primaryKey;column:id"`
	// UserID    uint       `json:"user_id" gorm:"column:user_id;not null;index:idx_feedback_user_id"`
	// Rating    int        `json:"rating" gorm:"column:rating;not null;check:rating >= 1 AND rating <= 5"`
	// Comments  string     `json:"comments" gorm:"column:comments;type:text"`
	// CreatedAt *time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`

	// User User `json:"-" gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	Fullname string	 `json:"fullname" gorm:"column:fullname;not null"`
	Email    string	 `json:"email" gorm:"column:email;not null"`
	Gender   string	 `json:"gender" gorm:"column:gender;not null"`
	LastEducation string	 `json:"last_education" gorm:"column:last_education;not null"`
	Occupation string	 `json:"occupation" gorm:"column:occupation;not null"`
	TypeService string `json:"type_service" gorm:"column:type_service;not null"`
	Rating1 int	 `json:"rating1" gorm:"column:rating1;not null;check:rating1 >= 1 AND rating1 <= 5"`
	Rating2 int	 `json:"rating2" gorm:"column:rating2;not null;check:rating2 >= 1 AND rating2 <= 5"`
	Rating3 int	 `json:"rating3" gorm:"column:rating3;not null;check:rating3 >= 1 AND rating3 <= 5"`
	Rating4 int	 `json:"rating4" gorm:"column:rating4;not null;check:rating4 >= 1 AND rating4 <= 5"`
	Rating5 int	 `json:"rating5" gorm:"column:rating5;not null;check:rating5 >= 1 AND rating5 <= 5"`
	Rating6 int	 `json:"rating6" gorm:"column:rating6;not null;check:rating6 >= 1 AND rating6 <= 5"`
	Rating7 int	 `json:"rating7" gorm:"column:rating7;not null;check:rating7 >= 1 AND rating7 <= 5"`
	Rating8 int	 `json:"rating8" gorm:"column:rating8;not null;check:rating8 >= 1 AND rating8 <= 5"`
	Rating9 int	 `json:"rating9" gorm:"column:rating9;not null;check:rating9 >= 1 AND rating9 <= 5"`
	CreatedAt time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`
}

func (Feedback) TableName() string {
	return "Feedback"
}