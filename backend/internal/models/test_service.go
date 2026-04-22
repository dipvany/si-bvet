package models

type TestService struct {
	ID           uint          `json:"id" gorm:"primaryKey;column:id"`
	TestName     string        `json:"test_name" gorm:"column:test_name;type:varchar(255);not null"`
	UnitLab      string        `json:"unit_lab" gorm:"column:unit_lab;type:varchar(255);not null"`
	Target       string        `json:"target" gorm:"column:target"`
	Price        float64       `json:"price" gorm:"column:price;type:numeric(14,2);not null;default:0"`
	Description  string        `json:"description" gorm:"column:description;type:text"`
	SampleReqmt  string        `json:"sample_reqmt" gorm:"column:sample_reqmt;type:text"`
	TestRequests []TestRequest `json:"-" gorm:"foreignKey:TestServiceID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
}

func (TestService) TableName() string {
	return "TestService"
}