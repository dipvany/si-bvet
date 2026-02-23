package models

type TestService struct {
	ID          uint   `gorm:"primaryKey"`
	TestName    string `gorm:"column:test_name;not null"`
	UnitLab     string
	Price       float64
	Description string `gorm:"type:text"`
}

func (TestService) TableName() string {
	return "TestService"
}