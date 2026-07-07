import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "B's Club Event Registration",
  description: "Register for the upcoming Badminton event at B's Club.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
