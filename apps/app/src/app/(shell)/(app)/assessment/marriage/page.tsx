import { redirect } from 'next/navigation';

// Historical invitation-list URL; all current requests are visible in the main page.
export default function Page() {
  redirect('/assessment/couples?history=1');
}
