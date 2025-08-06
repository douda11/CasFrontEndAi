export interface AcheelTarificationRequest {
  product: string;
  splitting: string;
  wish_effective_date: string;
  postal_code: string;
  city_id: string;
  subscriber_year_of_birth: string;
  subscriber_social_system: string;
  partner_year_of_birth?: string;
  partner_social_system?: string;
  additional_member?: AdditionalMember[];
}

export interface AdditionalMember {
  year_of_birth: string;
  social_system: string;
  status: string;
}

export interface AcheelTarificationResponse {
  idGlobalTarif: string;
  formulas: { [key: string]: Formula };
}

export interface Formula {
  responseAttributes: ResponseAttribute[];
}

export interface ResponseAttribute {
  responseAttributeName: string;
  responseAttributeValue: any;
}
