// Opt-in only: does not alter links or send diagnostic data anywhere.
export const geniuslinkAuditScript = String.raw`
(() => {
  if (new URLSearchParams(window.location.search).get("geniusDebug") !== "1") return;

  const audit = () => {
    const convertedLinks = Array.from(document.querySelectorAll('a[href*="buy.geni.us"]'));
    console.clear();
    console.log("%c[Geniuslink Audit] Found " + convertedLinks.length + " converted link(s) on this page:", "color: #008000; font-weight: bold; font-size: 14px;");
    if (convertedLinks.length === 0) {
      console.warn("No buy.geni.us links found. Ensure your HTML uses direct Amazon URLs (amazon.com/dp/...) and that the Geniuslink snippet has loaded.");
      return;
    }
    const summaryData = convertedLinks.map((link, index) => {
      const img = link.querySelector('img');
      const hasImg = img !== null;
      const label = hasImg ? "[IMAGE] " + (img.alt || 'Product Image') : (link.innerText.trim() || '[No Text]');
      link.style.outline = "3px solid #28a745";
      return {
        "#": index + 1,
        "Element Type": hasImg ? "Image Link" : "Button / Text",
        "Label / Alt Text": label,
        "Converted Geniuslink URL": link.href
      };
    });
    console.table(summaryData);
  };

  // Available for manual reruns from DevTools when debugging is enabled.
  window.geniuslinkAudit = audit;
  const start = () => {
    let timer;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(audit, 500); };
    // Geniuslink may convert URLs asynchronously, after DOMContentLoaded.
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['href']});
    window.addEventListener('pagehide', () => {observer.disconnect(); clearTimeout(timer);}, {once: true});
    schedule();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
`;
