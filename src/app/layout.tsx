import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GPM v2 - Facebook Group Post Manager',
  description: 'Facebook Group Post Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-6QG880FELE"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-6QG880FELE');
            `,
          }}
        />
        {/* Google Sign-In Platform Library */}
        <script src="https://apis.google.com/js/platform.js" async defer></script>
        <meta name="google-signin-client_id" content="403836712272-23j7evtiacnv09amsa519b37lib9v652.apps.googleusercontent.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}