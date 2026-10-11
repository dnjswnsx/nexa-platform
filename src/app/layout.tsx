import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'NEXA — Turn Every Inquiry Into Opportunity',description:'A bilingual AI front desk for education and service businesses.' };
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
