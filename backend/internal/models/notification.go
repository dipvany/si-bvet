package models

import "time"

type Notification struct {
	ID        uint       `json:"id" gorm:"primaryKey;column:id"`
	UserID    uint       `json:"user_id" gorm:"column:user_id;not null;index"`
	Title     string     `json:"title" gorm:"column:title;type:varchar(255);not null"`
	Message   string     `json:"message" gorm:"column:message;type:text;not null"`
	Type      string     `json:"type" gorm:"column:type;type:varchar(100);not null"`
	IsRead    bool       `json:"is_read" gorm:"column:is_read;default:false"`
	ReadAt    *time.Time `json:"read_at" gorm:"column:read_at"`
	CreatedAt *time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt *time.Time `json:"updated_at" gorm:"column:updated_at;autoUpdateTime"`

	User User `json:"-" gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (Notification) TableName() string {
	return "Notifications"
}
