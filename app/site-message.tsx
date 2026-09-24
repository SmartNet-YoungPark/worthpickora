export default function SiteMessage({message}:{message:string}){
  if(!message.trim())return null;
  return <aside className="site-message" aria-label="Message from WorthPickora"><span className="site-message-spark" aria-hidden="true">✦</span><div><span className="site-message-label">A NOTE FROM WORTHPICKORA</span><p>{message}</p></div><span className="site-message-decoration" aria-hidden="true">✧</span></aside>;
}
