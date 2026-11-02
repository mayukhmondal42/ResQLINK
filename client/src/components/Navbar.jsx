import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { dashboardPathForRole } from "../utils/roleRouting.js";
import AlertBanner from "./AlertBanner.jsx";
import AssistantChat from "./AssistantChat.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <nav className="liquid-nav sticky top-0 z-50 flex items-center justify-between px-6 py-3">
        <Link
          to={user ? dashboardPathForRole(user.role) : "/"}
          className="flex items-center gap-2"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            Res<span className="text-brand"> Q LINK</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 text-xs text-white/70">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md sm:flex">
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-red-500"}`}
            />
            {connected ? "LIVE" : "OFFLINE"}
          </span>
          {user && (
            <>
              <span className="hidden text-white sm:inline">{user.name}</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 uppercase backdrop-blur-md">
                {user.role}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-white backdrop-blur-md transition hover:bg-white/20"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </nav>
      {user && <AlertBanner />}
      {user && <AssistantChat />}
    </>
  );
}
