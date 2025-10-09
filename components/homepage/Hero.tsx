'use client';

export default function Hero() {
  return (
    <h1 
      className="font-reenie font-medium text-foreground text-center leading-none"
      style={{
        fontSize: '102px',
        letterSpacing: '-2px',
        marginBottom: '12px',
        background: 'linear-gradient(135deg, var(--color-text) 0%, var(--color-text-secondary) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      Qurse
    </h1>
  );
}
