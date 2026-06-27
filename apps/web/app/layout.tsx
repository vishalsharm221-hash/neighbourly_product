export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: "#FBFBF9" }}>{children}</body>
    </html>
  );
}

export const metadata = { title: "Localy — Your Hood, Your Vibe", description: "Delhi NCR hyperlocal community" };
