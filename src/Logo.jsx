export default function Logo({ className }) {
  return (
    <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Your incredible SVG Icon */}
      <svg className={className} width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill="#eff6ff" />
        <path d="M8 24h8l4-12 8 24 5-12h7" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="28" cy="36" r="3.5" fill="#ef4444" />
        <circle cx="28" cy="36" r="7" fill="#ef4444" fillOpacity="0.2" />
      </svg>

      {/* The Brand Text */}
      
    </div>
  );
}