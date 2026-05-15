package models

type TestService struct {
	ID            uint          `json:"id" gorm:"primaryKey;column:id"`
	TestName      string        `json:"test_name" gorm:"column:test_name;type:varchar(255);not null"`
	UnitLab       string        `json:"unit_lab" gorm:"column:unit_lab;type:varchar(255);not null"`
	Target        string        `json:"target" gorm:"column:target"`
	Method        string        `json:"method" gorm:"column:method"`
	ResultType    string        `json:"result_type" gorm:"column:result_type"`
	TestReference string        `json:"test_reference" gorm:"column:test_reference"`
	Price         float64       `json:"price" gorm:"column:price;type:numeric(14,2);not null;default:0"`
	Duration      string        `json:"duration" gorm:"column:duration;type:varchar(255)"`
	Description   string        `json:"description" gorm:"column:description;type:text"`
	TestRequests  []TestRequest `json:"-" gorm:"foreignKey:TestServiceID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
}

func (TestService) TableName() string {
	return "TestService"
}