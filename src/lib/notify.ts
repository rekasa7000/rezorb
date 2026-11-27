/** Browser notifications for arrivals. They name the Space and the device, never the content. */

export const notificationsSupported = () => typeof window !== "undefined" && "Notification" in window;

export function showArrival(spaceName: string, deviceLabel: string): void {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(`Something arrived in ${spaceName}`, { body: `From ${deviceLabel}`, silent: true, tag: `rezorb:${spaceName}` });
  } catch {
    /* some mobile browsers only allow notifications from a service worker */
  }
}

/** Asks for permission, which must follow a user gesture. Returns whether it was granted. */
export async function enableNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}
