package models

type TestRequest struct {
	ID            uint    `json:"id" gorm:"primaryKey;column:id"`
	SamplesID     uint    `json:"samples_id" gorm:"column:samples_id;not null"`
	TestServiceID uint    `json:"test_service_id" gorm:"column:test_service_id;not null"`
	Discount      float64 `json:"discount"`
	PriceAtMoment float64 `json:"price_at_moment" gorm:"column:price_at_moment;not null"`

	Sample      Sample      `json:"sample" gorm:"foreignKey:SamplesID"`
	TestService TestService `json:"test_service" gorm:"foreignKey:TestServiceID"`
}

func (TestRequest) TableName() string {
	return "TestRequest"
}