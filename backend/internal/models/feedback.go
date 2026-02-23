package models

type Feedback struct {
	ID       uint `gorm:"primaryKey"`
	UserID   uint
	Rating   int
	Comments string `gorm:"type:text"`
}

func (Feedback) TableName() string {
	return "Feedback"
}