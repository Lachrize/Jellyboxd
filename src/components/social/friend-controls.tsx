"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, UserCheck, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { profileHref } from "@/lib/links";
import type { FriendshipState } from "@/lib/services/friends";
import {
  cancelFriendRequestAction,
  removeFriendAction,
  respondFriendRequestAction,
  sendFriendRequestAction,
} from "@/server/actions/friends";
import type { ActionResult } from "@/server/actions/tracking";

export function FriendButton({
  targetUserId,
  initialState,
  isAuthed,
}: {
  targetUserId: string;
  initialState: FriendshipState;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [state, setState] = useState<FriendshipState>(initialState);

  function run(fn: () => Promise<ActionResult>, next: FriendshipState, msg?: string) {
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast({ title: "Erreur", description: res.error, variant: "error" });
      } else {
        setState(next);
        if (msg) toast({ title: msg, variant: "success" });
        router.refresh();
      }
    });
  }

  if (!isAuthed) {
    return (
      <Button asChild>
        <a href="/login">
          <UserPlus className="h-4 w-4" /> Ajouter en ami
        </a>
      </Button>
    );
  }
  if (state === "self") return null;

  if (state === "friends") {
    return (
      <Button variant="outline" disabled={pending} onClick={() => run(() => removeFriendAction(targetUserId), "none", "Ami retiré")}>
        <UserCheck className="h-4 w-4 text-accent" /> Amis
      </Button>
    );
  }
  if (state === "outgoing") {
    return (
      <Button variant="outline" disabled={pending} onClick={() => run(() => cancelFriendRequestAction(targetUserId), "none")}>
        <Clock className="h-4 w-4" /> Demande envoyée
      </Button>
    );
  }
  if (state === "incoming") {
    return (
      <div className="flex gap-2">
        <Button disabled={pending} onClick={() => run(() => respondFriendRequestAction(targetUserId, true), "friends", "Vous êtes amis !")}>
          <Check className="h-4 w-4" /> Accepter
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => run(() => respondFriendRequestAction(targetUserId, false), "none")}>
          Refuser
        </Button>
      </div>
    );
  }
  return (
    <Button disabled={pending} onClick={() => run(() => sendFriendRequestAction(targetUserId), "outgoing", "Demande envoyée")}>
      <UserPlus className="h-4 w-4" /> Ajouter en ami
    </Button>
  );
}

interface RequestItem {
  id: string;
  requester: { id: string; username: string; name: string | null; avatarUrl: string | null };
}

export function FriendRequestsList({ requests }: { requests: RequestItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [items, setItems] = useState(requests);

  function respond(requesterId: string, accept: boolean) {
    start(async () => {
      const res = await respondFriendRequestAction(requesterId, accept);
      if (res.ok) {
        setItems((prev) => prev.filter((r) => r.requester.id !== requesterId));
        toast({ title: accept ? "Demande acceptée" : "Demande refusée", variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Erreur", description: res.error, variant: "error" });
      }
    });
  }

  if (!items.length) return null;

  return (
    <div className="space-y-2">
      {items.map((r) => (
        <div key={r.id} className="surface-card flex items-center justify-between gap-3 p-3">
          <Link href={profileHref(r.requester.username)} className="flex min-w-0 items-center gap-2.5">
            <Avatar name={r.requester.name ?? r.requester.username} src={r.requester.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{r.requester.name ?? `@${r.requester.username}`}</p>
              <p className="truncate text-xs text-muted">@{r.requester.username}</p>
            </div>
          </Link>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" disabled={pending} onClick={() => respond(r.requester.id, true)}>
              Accepter
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => respond(r.requester.id, false)}>
              Refuser
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
