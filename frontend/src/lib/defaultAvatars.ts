export const DEFAULT_AVATARS = [
  "/avatars/avatar-1.svg",
  "/avatars/avatar-2.svg",
  "/avatars/avatar-3.svg",
  "/avatars/avatar-4.svg",
  "/avatars/avatar-5.svg",
  "/avatars/avatar-6.svg",
  "/avatars/avatar-7.svg",
  "/avatars/avatar-8.svg",
];

export function randomDefaultAvatar(): string {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
}
