import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Google Index Checker Pro - site: Bulk URL Index Verifier',
  description:
    'Check if your URLs are indexed on Google in real-time using automated site: search queries. Supports bulk checks, CSV export, and Vercel serverless deployment.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔍</text></svg>" />
      </head>
      <body className="antialiased min-h-screen text-slate-900 bg-slate-50">
        {children}
      </body>
    </html>
  );
}
