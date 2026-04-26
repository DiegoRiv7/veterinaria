import { readSession } from "@/lib/auth";
import { getVetUnreadCount } from "@/lib/chat";
import { VetTabBarClient } from "./VetTabBarClient";

export async function VetTabBar() {
  const session = await readSession();
  let unread = 0;
  if (session && (session.role === "VET" || session.role === "ADMIN")) {
    try {
      unread = await getVetUnreadCount(session.userId);
    } catch {
      unread = 0;
    }
  }
  return <VetTabBarClient unreadChat={unread} />;
}
