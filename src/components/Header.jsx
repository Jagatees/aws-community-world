export default function Header() {
  return (
    <header className="w-full bg-aws-surface border-b border-aws-border px-6 py-3 flex items-center gap-3">
      {/* AWS wordmark */}
      <span className="text-aws-orange font-bold text-xl tracking-tight">
        AWS
      </span>
      <span className="text-aws-border text-xl select-none">|</span>
      {/* App title */}
      <span className="text-aws-text font-semibold text-lg">
        Community Globe
      </span>
    </header>
  );
}
