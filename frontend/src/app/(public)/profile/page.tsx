import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants/routes';

export default function ProfileRedirectPage() {
  redirect(ROUTES.USER.PROFILE);
}