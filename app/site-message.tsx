export default function SiteMessage({message}:{message:string}){
  if(!message.trim())return null;
  return <aside className="site-message" aria-label="Message from WorthPickora">
    <div className="site-message-content">
      <div className="site-message-kicker"><span className="site-message-seal" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 8h14l1 12H4L5 8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2m-7 5 2 2 4-4"/></svg></span><span className="site-message-label">A little note, just for you</span><span className="site-message-kicker-line" aria-hidden="true"/></div>
      <p>{message}</p>
      <div className="site-message-signature"><span aria-hidden="true">✦</span><span>With care, <strong>WorthPickora</strong></span></div>
    </div>
    <div className="site-message-art" aria-hidden="true"><span className="site-message-orbit"/><span className="site-message-orbit second"/><span className="site-message-star">✦</span><span className="site-message-star small">✧</span></div>
  </aside>;
}
