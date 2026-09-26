interface ExpandableTextProps {
  children: React.ReactNode;
  /** Kept for backward compatibility - no longer clamps */
  mobileLines?: number;
  className?: string;
  moreLabel?: string;
  lessLabel?: string;
}

/**
 * Previously clamped text on mobile with a "read more" toggle.
 * Now always renders children fully on all viewports.
 */
const ExpandableText = ({ children, className = "" }: ExpandableTextProps) => {
  return <div className={className}>{children}</div>;
};

export default ExpandableText;
