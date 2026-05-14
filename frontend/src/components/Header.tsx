"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Avatar } from "./Avatar";
import {
  useUser,
  useUnreadCount,
  useNotifications,
  useMarkNotificationsRead,
  useAcceptFriendRequest,
  useRejectFriendRequest,
} from "@/lib/hooks";
import { useToast } from "./Toast";
import { getInitials, timeAgo } from "@/lib/utils";

export function Header() {
  const { data: user } = useUser();
  const { data: unread } = useUnreadCount();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const acceptReq = useAcceptFriendRequest();
  const rejectReq = useRejectFriendRequest();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = getInitials(user?.displayName ?? null);
  const count = unread?.count ?? 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && count > 0) markRead.mutate();
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 border-b border-oria bg-[rgba(7,7,11,0.78)] backdrop-blur-xl">
      <Link href="/dashboard" className="flex items-center gap-2.5 cursor-pointer">
        <Image src="/Design sans titre.png" alt="Oria" width={36} height={36} className="rounded-md" />
        <span className="text-[17px] font-extrabold text-text-primary tracking-tight">
          Oria
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <div ref={ref} className="relative">
          <button
            onClick={handleOpen}
            aria-label="Notifications"
            className="relative cursor-pointer w-11 h-11 flex items-center justify-center bg-oria-section border border-oria rounded-full text-text-secondary hover:text-accent-purple-bright transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-accent-sport text-[10px] font-bold text-white border-2 border-oria-bg tabular-nums">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-14 w-[340px] max-h-[460px] overflow-hidden rounded-2xl bg-[#13131A] border border-oria-strong shadow-2xl z-[60] animate-fadeIn flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-oria">
                <p className="text-[14px] font-bold text-text-primary">Notifications</p>
                {count > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple-bright">
                    {count} new
                  </span>
                )}
              </div>
              {notifications && notifications.length > 0 ? (
                <div className="flex flex-col overflow-y-auto">
                  {notifications.slice(0, 20).map((n) => {
                    const p = n.payload as { fromDisplayName?: string; friendshipId?: string; message?: string };
                    const isFriendReq = n.type === "friend_request";
                    const isAccepted = n.type === "friend_accepted";
                    const isRunReminder = n.type === "run_reminder";
                    const isPoke = n.type === "poke";
                    const isSocial = isFriendReq || isAccepted || isPoke;
                    const fromName = p.fromDisplayName ?? "Someone";

                    return (
                      <div
                        key={n.id}
                        className={`relative px-4 py-3 border-b border-oria/60 last:border-b-0 ${!n.read ? "bg-accent-purple/8" : ""}`}
                      >
                        {!n.read && (
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent-purple-bright" />
                        )}
                        <div className="flex gap-3 items-start">
                          {/* Icon / Avatar */}
                          {isSocial ? (
                            <div className="flex-shrink-0">
                              <Avatar initials={getInitials(fromName)} size={36} />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-accent-purple/15 border border-accent-purple/25 flex items-center justify-center text-accent-purple-bright">
                              {isRunReminder ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="17" cy="4" r="2" />
                                  <path d="M15.59 13.51l2.66-2.66a1 1 0 00-1.42-1.42l-3.07 3.07a2 2 0 01-1.41.59H10.5L8 15.5" />
                                  <path d="M5.11 18.39A2 2 0 107.94 15.56L10.5 13H8l-4.5 4.5" />
                                  <path d="M17 14v6" />
                                </svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                                  <path d="M12 8v4M12 16h.01" />
                                </svg>
                              )}
                            </div>
                          )}
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-text-primary leading-snug">
                              {isRunReminder ? (
                                <>{p.message ?? "Time to run — your scheduled session is today."}</>
                              ) : isPoke ? (
                                <><span className="font-semibold">{fromName}</span> poked you 👋</>
                              ) : isFriendReq ? (
                                <><span className="font-semibold">{fromName}</span> sent you a friend request</>
                              ) : isAccepted ? (
                                <><span className="font-semibold">{fromName}</span> accepted your friend request</>
                              ) : (
                                <>{p.message ?? "New notification"}</>
                              )}
                            </p>
                            <p className="text-[11px] text-text-muted mt-1">{timeAgo(n.createdAt)}</p>
                            {isFriendReq && !n.read && p.friendshipId && (
                              <div className="flex gap-2 mt-2.5">
                                <button
                                  onClick={() =>
                                    acceptReq.mutate(p.friendshipId!, {
                                      onSuccess: () => toast("Friend request accepted!"),
                                    })
                                  }
                                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full gradient-brand text-white shadow-button cursor-pointer"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() =>
                                    rejectReq.mutate(p.friendshipId!, {
                                      onSuccess: () => toast("Request declined"),
                                    })
                                  }
                                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-oria-chip border border-oria text-text-secondary cursor-pointer"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <div className="w-14 h-14 rounded-full bg-oria-chip border border-oria flex items-center justify-center mb-3">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                  </div>
                  <p className="text-[13px] font-semibold text-text-secondary">You&apos;re all caught up</p>
                  <p className="text-[12px] text-text-muted mt-1">Notifications will appear here</p>
                </div>
              )}
            </div>
          )}
        </div>
        <Link href="/profile" aria-label="Profile" className="ml-1">
          <Avatar initials={initials} size={36} highlight />
        </Link>
      </div>
    </header>
  );
}
