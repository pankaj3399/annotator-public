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
    return lastMessageB - lastMessageA;
  });
}

// These are the actual values used in the database
const validPermissions = ['noPermission', 'canReview'];

export const checkPermissions = (permissions: string[]): string[] | false => {
  // If permissions array is empty or null
  if (!permissions || permissions.length === 0) {
    return ['noPermission'];
  }

  // Check if all permissions are valid backend values
  const areAllPermissionsValid = permissions.every(perm => validPermissions.includes(perm));

  if (!areAllPermissionsValid) {
    return false;
  }

  // Check for invalid combinations (noPermission should be alone)
  if (permissions.includes('noPermission') && permissions.length > 1) {
    return false;
  }

  return permissions;
};

export interface Star {
  position: string;
  size: string;
  blur: string;
  color: string;
}

export const createStars = (count: number, color: string): Star[] => {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const vw = Math.random() * 100 - 50; // -50vw ile 50vw arasında
    const vh = Math.random() * 100 - 50; // -50vh ile 50vh arasında
    const size = Math.random() * 2; // 0px ile 2px arasında
    const blur = Math.random() * 2; // 0px ile 2px arasında
    stars.push({
      position: `${vw}vw ${vh}vh`,
      size: `${size}px`,
      blur: `${blur}px`,
      color,
    });
  }
  return stars;
};