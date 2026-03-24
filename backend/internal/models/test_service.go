package models

type TestService struct {
	ID          uint    `gorm:"primaryKey"`
	TestName    string  `gorm:"column:test_name;not null"`
	UnitLab     string  `gorm:"column:unit_lab;not null"`
	Target      string  `gorm:"column:target"`
	Price       float64 `gorm:"column:price"`
	Description string  `gorm:"column:description;type:text"`
	SampleReqmt string  `gorm:"column:sample_reqmt;type:text"`
}

func (TestService) TableName() string {
	return "TestService"
}