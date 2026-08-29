"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Map, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

interface UserMenuProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export function UserMenu({ mobile, onNavigate }: UserMenuProps) {
  const auth = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
      // Clear any per-user banner dismiss keys
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key?.startsWith("safar_verify_banner_dismissed:")) {
            sessionStorage.removeItem(key);
          }
        }
      } catch { /* sessionStorage may be unavailable */ }
      await auth.refresh();
      if (onNavigate) onNavigate();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  // While loading or when not logged in, render nothing in the navbar
  if (auth.loading || !auth.user) {
    return null;
  }

  const userInitials = auth.user.name ? auth.user.name.charAt(0).toUpperCase() : "U";

  if (mobile) {
    return (
      <div className="flex flex-col gap-1">
        <div className="px-3 py-3 border-b border-white/10 mb-1">
          <div className="text-sm font-semibold text-sandstone-mist">{auth.user.name}</div>
          <div className="text-xs text-sandstone-mist/60">{auth.user.email}</div>
        </div>
        {!auth.user.emailVerified && (
          <Link
            href="/verify-email"
            onClick={onNavigate}
            className="rounded-lg flex items-center gap-2 px-3 py-3 text-amber-400 hover:bg-white/10"
          >
            <ShieldAlert size={16} />
            Verify email
          </Link>
        )}
        <Link
          href="/trips"
          onClick={onNavigate}
          className="rounded-lg flex items-center gap-2 px-3 py-3 text-sandstone-mist hover:bg-white/10"
        >
          <Map size={16} />
          My trips
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-lg flex w-full items-center gap-2 px-3 py-3 text-alert-red hover:bg-white/10 text-left"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="size-9 rounded-full bg-attabad-turquoise text-white text-sm font-semibold flex items-center justify-center cursor-pointer hover:bg-[#176f83] transition"
        aria-label="User menu"
        aria-expanded={dropdownOpen}
      >
        {userInitials}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-karakoram-ink/10 bg-white py-2 shadow-lg z-50">
          <div className="px-4 py-3 border-b border-karakoram-ink/10">
            <div className="text-sm font-semibold text-karakoram-ink truncate">
              {auth.user.name}
            </div>
            <div className="text-xs text-karakoram-ink/60 truncate">
              {auth.user.email}
            </div>
          </div>
          
          <div className="py-1">
            <Link
              href="/trips"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-karakoram-ink hover:bg-sandstone-mist transition"
            >
              <Map size={16} />
              My trips
            </Link>
          </div>
          
          <div className="my-1 border-t border-karakoram-ink/10" />
          
          <div className="py-1">
            <button
              onClick={() => {
                setDropdownOpen(false);
                handleLogout();
              }}
              className="flex w-full items-center gap-2 text-left px-4 py-2.5 text-sm text-alert-red hover:bg-red-50 transition"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
