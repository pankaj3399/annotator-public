import { useEffect } from "react";
import { useRouter } from "next/router";

const useSmoothScroll = () => {
  const router = useRouter();

  const scrollToId = (id: string, offset: number) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - offset,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    // Check for `scrollTo` query parameter
    if (router.query.scrollTo) {
      const { scrollTo } = router.query;
      const [id, offset] = (scrollTo as string).split(",");
      setTimeout(() => scrollToId(id, Number(offset)), 0);
    }
  }, [router.query]);

  const handleScroll = (id: string, offset: number) => {
    if (router.pathname !== "/") {
      // Navigate to the home page with query parameters for smooth scrolling
      router.push({
        pathname: "/",
        query: { scrollTo: `${id},${offset}` },
      });
    } else {
      scrollToId(id, offset);
    }
  };

  return handleScroll;
};

export default useSmoothScroll;
