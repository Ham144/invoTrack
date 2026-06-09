import { SubscriptionPlan } from 'src/common/shared-enum';

export interface Subscription {
  id: string;
  username: string;
  start: Date;
  plan: keyof typeof SubscriptionPlan;
  organizationId: string;
  organizations: Object;
}
