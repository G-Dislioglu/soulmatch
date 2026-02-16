export interface UserProfile {
  id: string;
  name: string;
  birthDate: string;
  birthTime?: string;
  birthPlace?: string;
  birthLocation?: {
    label: string;
    lat: number;
    lon: number;
    countryCode: string;
    timezone?: string;
  };
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}
