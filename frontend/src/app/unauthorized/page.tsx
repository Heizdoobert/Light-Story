import { redirect } from 'next/navigation';

export default function UnauthorizedAliasPage() {
  redirect('/401');
}
