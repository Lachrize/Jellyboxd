"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { toggleFollowAction } from "@/server/actions/social";

export function FollowButton({
  targetUserId,
  initialFollowing,
  isAuthed,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [following, setFollowing] = useState(initialFollowing);

  function toggle() {
    if (!isAuthed) {
      router.push("/login");
      return;
    }
    const prev = following;
    setFollowing(!prev);
    startTransition(async () => {
      const res = await toggleFollowAction(targetUserId);
      if (!res.ok) {
        setFollowing(prev);
        toast({ title: "Erreur", description: res.error, variant: "error" });
      } else {
        setFollowing(res.data!.following);
        router.refresh();
      }
    });
  }

  return (
    <Button variant={following ? "outline" : "primary"} onClick={toggle} disabled={pending}>
      {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {following ? "Suivi" : "Suivre"}
    </Button>
  );
}
