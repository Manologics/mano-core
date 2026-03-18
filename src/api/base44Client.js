import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId: "69b9620de5303495dd309130",
  token,
  functionsVersion,
  requiresAuth: false,
  appBaseUrl
});
