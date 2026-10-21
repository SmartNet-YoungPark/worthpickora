import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorthPickora — Find more of what’s worth it",
  description: "Good products. Thoughtfully picked. Discover everyday favorites in tech, home, beauty, and more with WorthPickora.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <script type="text/javascript" src="https://geniuslinkcdn.com/snippet.min.js" defer />
        <script id="geniuslink-amazon-init" type="text/javascript" dangerouslySetInnerHTML={{__html: `
document.addEventListener("DOMContentLoaded", function() {
  var tsid = 447940;
  Genius.amazon.convertLinks(tsid, true, "http://buy.geni.us");
});
`}} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
