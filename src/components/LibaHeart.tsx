import { useId } from "react";

/**
 * הלב של ליבה.
 * ברירת מחדל: גרדיאנט ורוד. עם solid: לב במילוי currentColor (למשל לבן על גרדיאנט).
 */
const LibaHeart = ({
  className = "h-5 w-5",
  solid = false,
}: {
  className?: string;
  solid?: boolean;
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const d =
    "m86.72,67.67c12.07-17.24,19.33-37.11,11.21-55.2-1.89-4.21-4.79-8.1-8.83-10.34-5.24-2.9-11.8-2.63-17.4-.48-8.98,3.44-15.75,11.22-19.99,19.85-4.24,8.63-6.26,18.15-8.23,27.56-3.07-11.77-9.21-22.73-17.64-31.5-3.96-4.12-9.24-8.01-14.87-7.02C3.67,11.81.19,20.45.01,27.86c-.25,10.21,3.3,20.47,9.8,28.35,13.59,16.45,30.65,28.29,43.18,46.26,10.57-8.17,23.78-20.59,33.73-34.8Z";

  if (solid) {
    return (
      <svg viewBox="0 0 101.37 102.47" className={className} aria-hidden="true">
        <path fill="currentColor" d={d} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 101.37 102.47" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`liba-heart-${id}`} x1="0" y1="51.23" x2="101.37" y2="51.23" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff8f84" />
          <stop offset="1" stopColor="#fa6fba" />
        </linearGradient>
      </defs>
      <path fill={`url(#liba-heart-${id})`} d={d} />
    </svg>
  );
};

export default LibaHeart;
