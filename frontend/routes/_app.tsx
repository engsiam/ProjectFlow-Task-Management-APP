import type { AppProps } from "$fresh/server.ts";

export default function App({ Component }: AppProps) {
  return (
    <html lang="en" class="dark">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ProjectFlow</title>
        <link rel="stylesheet" href="/styles.css" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              `try{const t=localStorage.getItem("projectflow.theme")||"dark";document.documentElement.classList.toggle("dark",t==="dark")}catch(_){document.documentElement.classList.add("dark")}`
          }}
        />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
