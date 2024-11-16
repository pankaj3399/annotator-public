import { UserGroups } from "@/app/(maneger)/chat/page"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatTime = (timeInSeconds: number) => {
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = timeInSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function sortUserGroupsByLastMessage(userGroups: UserGroups[]): UserGroups[] {
  return userGroups.sort((a, b) => {
    const lastMessageA = a.group.lastMessage ? new Date(a.group.lastMessage.sent_at).getTime() : 0;
    const lastMessageB = b.group.lastMessage ? new Date(b.group.lastMessage.sent_at).getTime() : 0;

    // Sort in descending order (latest messages first)
    return lastMessageB - lastMessageA;
  });
}