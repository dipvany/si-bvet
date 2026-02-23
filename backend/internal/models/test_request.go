package models

type TestRequest struct {
	ID            uint `gorm:"primaryKey"`
	SamplesID     uint `gorm:"column:samples_id;not null"`
	TestServiceID uint `gorm:"column:test_service_id;not null"`
	Discount      float64
	PriceAtMoment float64 `gorm:"column:price_at_moment;not null"`

	Sample      Sample
	TestService TestService
}

func (TestRequest) TableName() string {
	return "TestRequest"
}