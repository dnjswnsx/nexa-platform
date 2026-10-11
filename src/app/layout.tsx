import type { Metadata } from 'next';
import './globals.css';
import './workspace.css';
export const metadata: Metadata = { title:'NEXA — Your Academy, Intelligently Managed',description:'A bilingual academy workspace for inquiries, enrollment, finances and thoughtful growth.' };
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
