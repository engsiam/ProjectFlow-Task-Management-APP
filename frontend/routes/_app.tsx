import type { AppProps } from "$fresh/server.ts";

const SITE_NAME = "ProjectFlow";
const SITE_DESCRIPTION =
  "Plan less. Ship more. Together. The smart project & task collaboration platform for modern teams — real-time kanban boards, granular RBAC, OAuth, and analytics.";
const SITE_URL = "https://projectflow-frontend.engsiam.deno.net";
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const TWITTER_HANDLE = "@projectflow";

export default function App({ Component }: AppProps) {
  return (
    <html lang="en" class="dark">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />

        {/* Primary SEO */}
        <title>{SITE_NAME} — Smart Project & Task Collaboration</title>
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta
          name="keywords"
          content="project management, task management, kanban, collaboration, team productivity, RBAC, projectflow, deno, fresh, hono, prisma, mongodb"
        />
        <meta name="author" content="ProjectFlow Team" />
        <meta name="application-name" content={SITE_NAME} />
        <meta name="generator" content="Fresh + Deno" />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta name="googlebot" content="index, follow" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="color-scheme" content="dark light" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="canonical" href={SITE_URL} />

        {/* Favicons — modern SVG first, ICO fallback, Apple touch icon */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="/favicon.svg"
          sizes="any"
        />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="mask-icon" href="/favicon.svg" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />

        {/* Open Graph (Facebook, LinkedIn, Discord, Slack) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta
          property="og:title"
          content={`${SITE_NAME} — Smart Project & Task Collaboration`}
        />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`${SITE_NAME} preview`} />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content={TWITTER_HANDLE} />
        <meta name="twitter:creator" content={TWITTER_HANDLE} />
        <meta
          name="twitter:title"
          content={`${SITE_NAME} — Smart Project & Task Collaboration`}
        />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <meta name="twitter:image:alt" content={`${SITE_NAME} preview`} />

        {/* Structured data — SoftwareApplication schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: SITE_NAME,
              description: SITE_DESCRIPTION,
              url: SITE_URL,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Organization",
                name: "ProjectFlow Team",
              },
            }),
          }}
        />

        {/* Stylesheet */}
        <link rel="stylesheet" href="/styles.css" />

        {/* Service worker registration — non-blocking */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
