import { redirect } from 'next/navigation';

export default function ForbiddenAliasPage() {
  redirect('/handle-exception/403');
}
