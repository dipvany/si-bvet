package models

type Complaint struct {
	ID          uint `gorm:"primaryKey"`
	UserID      uint
	Subjects    string
	Description string `gorm:"type:text"`
	Status      string
}

func (Complaint) TableName() string {
	return "Complaint"
}