import { notFound, redirect } from 'next/navigation';

export default function Page() {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_WEB_URL;
  if (!adminUrl) notFound();
  redirect(`${adminUrl.replace(/\/$/, '')}/`);
}
