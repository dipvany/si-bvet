package models

type TestService struct {
	ID          uint    `json:"id" gorm:"primaryKey;column:id"`
	TestName    string  `json:"test_name" gorm:"column:test_name;not null"`
	UnitLab     string  `json:"unit_lab" gorm:"column:unit_lab;not null"`
	Target      string  `json:"target" gorm:"column:target"`
	Price       float64 `json:"price" gorm:"column:price"`
	Description string  `json:"description" gorm:"column:description;type:text"`
	SampleReqmt string  `json:"sample_reqmt" gorm:"column:sample_reqmt;type:text"`
}

func (TestService) TableName() string {
	return "TestService"
}