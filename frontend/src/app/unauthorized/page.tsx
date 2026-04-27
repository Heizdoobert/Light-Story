import { redirect } from 'next/navigation';

export default function UnauthorizedAliasPage() {
  redirect('/handle-exception/401');
}
