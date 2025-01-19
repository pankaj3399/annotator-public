import Image from "next/image";
import bookIcon from "@/public/static/book.png";

export const BookIcon = () => {
  return <Image src={bookIcon} alt="Book" width={18} height={18} />;
};
