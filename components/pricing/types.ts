export interface UserState {
  isGuest: boolean;
  isFree: boolean;
  isPro: boolean;
  userId: string | null;
}

export interface PricingFeature {
  title: string;
  description: string;
  icon: string;
}

