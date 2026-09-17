export type AdminIconName = "trash" | "grid" | "box" | "layers" | "tag" | "store" | "chart" | "heart" | "users" | "settings" | "search" | "upload" | "download" | "plus" | "close" | "edit" | "more" | "filter" | "arrow" | "chevron" | "folder" | "send" | "archive" | "eye" | "image" | "check" | "external";
export default function AdminIcon({ name, size = 20 }: { name: AdminIconName; size?: number }) {
  const paths: Record<AdminIconName, React.ReactNode> = {
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    box: <><path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10 9-5M3 7l9 5v10M7 4.7l9 5"/></>,
    layers: <path d="m12 2 10 6-10 6L2 8Zm-10 10 10 6 10-6M2 16l10 6 10-6"/>,
    tag: <><path d="M3 3h9l10 10-9 9L3 12Z"/><circle cx="8" cy="8" r="1"/></>,
    store: <><path d="M4 10v11h16V10M2 10l3-7h14l3 7M2 10c0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0M9 21v-7h6v7"/></>,
    chart: <path d="M4 21V11h4v10m2 0V6h4v15m2 0V2h4v19"/>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    users: <><circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3ZM17 3a4 4 0 0 1 0 8m1 3c4 0 4 4 4 7"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m9 3 1-2h4l1 2 3 2 2 0 2 4-1 2v2l1 2-2 4h-2l-3 2-1 2h-4l-1-2-3-2H4l-2-4 1-2v-2L2 9l2-4h2Z"/></>,
    search: <><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></>,
    upload: <path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6"/>, download: <path d="M12 3v13m-5-5 5 5 5-5M3 17v4h18v-4"/>,
    plus: <path d="M12 4v16M4 12h16"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
    edit: <><path d="m15 4 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 16Z"/></>,
    more: <><circle cx="12" cy="4" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="20" r="1"/></>,
    filter: <path d="M3 3h18l-7 8v8l-4 2V11Z"/>, arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>, chevron: <path d="m9 5 7 7-7 7"/>,
    folder: <path d="M3 5h7l2 3h9v13H3Z"/>, send: <path d="m22 2-7 20-4-9-9-4Zm0 0L11 13"/>, archive: <><path d="M4 8v13h16V8M2 3h20v5H2Z M9 12h6"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m3 18 6-6 4 4 3-5 5 6"/></>, check: <path d="m4 12 5 5L20 6"/>,
    external: <><path d="M14 3h7v7m0-7L10 14M10 4H4v16h16v-6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
