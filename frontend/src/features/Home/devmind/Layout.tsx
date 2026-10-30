import { Outlet } from "react-router-dom";
import { DevMindProvider } from "./store";

/* Wraps /home, /new and /chat/:id so GitHub status, repos and chats are
   loaded once and shared, and are NOT loaded on the landing or login pages. */
export default function DevMindLayout() {
  return (
    <DevMindProvider>
      <Outlet />
    </DevMindProvider>
  );
}