package models

type TestRequest struct {
	ID            uint `json:"id" gorm:"primaryKey;column:id"`
	SampleID      uint `json:"sample_id" gorm:"column:samples_id;not null;index:idx_testrequest_sample_id"`
	TestServiceID uint `json:"test_service_id" gorm:"column:test_service_id;not null;index:idx_testrequest_test_service_id"`
	// Discount      float64 `json:"discount" gorm:"column:discount;type:numeric(14,2);default:0"`
	PriceAtMoment float64 `json:"price_at_moment" gorm:"column:price_at_moment;type:numeric(14,2);not null"`

	Sample      Sample      `json:"sample" gorm:"foreignKey:SampleID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	TestService TestService `json:"test_service" gorm:"foreignKey:TestServiceID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
}

func (TestRequest) TableName() string {
	return "TestRequest"
}