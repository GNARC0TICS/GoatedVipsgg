import { useLocation } from "wouter";
import { useEffect } from "react";

export function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);

  return null;
}
