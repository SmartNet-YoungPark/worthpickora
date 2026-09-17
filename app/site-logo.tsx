import Image from "next/image";

export default function SiteLogo() {
  return <Image className="site-logo" src="/worthpickora-logo.png" alt="" width={72} height={72} sizes="(max-width: 760px) 44px, 72px" />;
}
