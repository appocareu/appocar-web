"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";
import Link from "next/link";
import { getBackendMe, isAdminUser, type BackendUser } from "@/lib/backend";

export function UserMenu() {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [favoritesCount, setFavoritesCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    getBackendMe()
      .then((res) => {
        if (!mounted) return;
        setBackendUser(res.user);
      })
      .catch(() => {
        if (!mounted) return;
        setBackendUser(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("appocar_favorites_count");
      if (stored) {
        const value = Number(stored);
        if (!Number.isNaN(value)) setFavoritesCount(value);
      }
    } catch {
      setFavoritesCount(0);
    }
  }, []);

  if (!ready) {
    return <div className="badge">{t("auth.loading")}</div>;
  }

  const emailVerified = backendUser?.emailVerified ?? (user as any)?.emailVerified;

  if (backendUser) {
    return (
      <div className="user-menu">
        <Link href="/favorites" className="icon-button" aria-label="Favorites">
          <IconHeart />
          {favoritesCount > 0 && <span className="icon-badge">{favoritesCount}</span>}
        </Link>
        <Link href="/notifications" className="icon-button" aria-label={t("header.notifications")}>
          <IconBell />
        </Link>
        <Link href="/profile" className="user-pill">
          <IconUser />
          <span>{isAdminUser(backendUser) ? "Host" : backendUser.email}</span>
          {emailVerified === true && (
            <span className="user-pill__badge user-pill__badge--verified">
              <IconCheck />
            </span>
          )}
          {emailVerified === false && <span className="user-pill__badge user-pill__badge--pending">{t("auth.badgeUnverified")}</span>}
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-menu">
        <Link href="/favorites" className="icon-button" aria-label="Favorites">
          <IconHeart />
          {favoritesCount > 0 && <span className="icon-badge">{favoritesCount}</span>}
        </Link>
        <Link href="/notifications" className="icon-button" aria-label={t("header.notifications")}>
          <IconBell />
        </Link>
        <Link href="/profile" className="user-pill user-pill--cta">
          <IconUser />
          <span>{t("auth.signInAction")}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="user-menu">
      <Link href="/favorites" className="icon-button" aria-label="Favorites">
        <IconHeart />
        {favoritesCount > 0 && <span className="icon-badge">{favoritesCount}</span>}
      </Link>
      <Link href="/notifications" className="icon-button" aria-label={t("header.notifications")}>
        <IconBell />
      </Link>
      <Link href="/profile" className="user-pill">
        <IconUser />
        <span>{user.email}</span>
        {emailVerified === true && (
          <span className="user-pill__badge user-pill__badge--verified">
            <IconCheck />
          </span>
        )}
        {emailVerified === false && <span className="user-pill__badge user-pill__badge--pending">{t("auth.badgeUnverified")}</span>}
      </Link>
    </div>
  );
}

function IconHeart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20s-7-4.7-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.3-7 10-7 10Z" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c2-4 14-4 16 0" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M13.5 21a2 2 0 0 1-3 0" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
