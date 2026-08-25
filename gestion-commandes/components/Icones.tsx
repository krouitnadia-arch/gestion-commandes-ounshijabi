"use client";

type Props = { taille?: number };

function Svg({ taille = 22, children }: { taille?: number; children: React.ReactNode }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function IconeAccueil({ taille }: Props) {
  return (
    <Svg taille={taille}>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
      <path d="M9 21v-7h6v7" />
    </Svg>
  );
}

export function IconeCommandes({ taille }: Props) {
  return (
    <Svg taille={taille}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </Svg>
  );
}

export function IconeExpedition({ taille }: Props) {
  return (
    <Svg taille={taille}>
      <path d="M10 17h4V5H2v12h3" />
      <path d="M20 17h2v-3.3a4 4 0 0 0-1.2-2.9L19 9h-5v8h1" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </Svg>
  );
}

export function IconeRetours({ taille }: Props) {
  return (
    <Svg taille={taille}>
      <path d="M3 12a9 9 0 1 0 2.6-6.4" />
      <path d="M3 3v5h5" />
      <path d="M12 8v4l3 2" />
    </Svg>
  );
}

export function IconeMagasin({ taille }: Props) {
  return (
    <Svg taille={taille}>
      <path d="M3 9 4.5 4.5A2 2 0 0 1 6.4 3h11.2a2 2 0 0 1 1.9 1.5L21 9" />
      <path d="M3 9h18v1.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" />
      <path d="M5 13v8h14v-8" />
      <path d="M10 21v-4h4v4" />
    </Svg>
  );
}

export function IconeStock({ taille }: Props) {
  return (
    <Svg taille={taille}>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </Svg>
  );
}

export function IconeUtilisateurs({ taille }: Props) {
  return (
    <Svg taille={taille}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1A4 4 0 0 1 16 11" />
    </Svg>
  );
}

export function IconeChiffres({ taille }: Props) {
  return (
    <Svg taille={taille}>
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M14 7h7v7" />
    </Svg>
  );
}
