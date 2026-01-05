export const metadata = {
  title: "Bevgo 3DS",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
      <meta
  httpEquiv="Content-Security-Policy"
  content="
    default-src 'self' https: http: data: blob:;
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    frame-src 'self' https: http: data:;
    form-action 'self' https: http:;
    base-uri 'self';
  "
/>

      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          background: "#f7f7f5",
          color: "#101010",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
