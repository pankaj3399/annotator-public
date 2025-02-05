import { createHash } from "crypto";

export default function saltAndHashPassword(password) {
  const salt = "fixed-salt";
  const hash = createHash("sha512")
    .update(password + salt)
    .digest("hex");

  return `${hash}`;
}
