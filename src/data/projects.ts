export type Project = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  image: string;
  featured: boolean;
};

export const projects: Project[] = [
  {
    slug: "world-bank",
    title: "World Bank / Ministry of Labor (Brazil)",
    category: "Labor Market Intelligence Platform",
    summary:
      "Integrated prototype connecting occupations, courses and labor data.",
    image: "/images/projects/world-bank/cover.png",
    featured: true,
  },
  {
    slug: "comgas",
    title: "Comgás",
    category: "Field Operations / Safety Platform",
    summary:
      "Product design for field operation and risk analysis workflows across mobile and web.",
    image: "/images/projects/comgas/cover.jpg",
    featured: true,
  },
  {
    slug: "canguru",
    title: "Canguru",
    category: "Mobile App / Health",
    summary:
      "Mobile experience designed to support pregnancy care with clear and accessible interactions.",
    image: "/images/projects/canguru/cover.jpg",
    featured: true,
  },
  {
    slug: "dux",
    title: "DUX",
    category: "Web3 / Product Design",
    summary:
      "Leading design at a Web3 startup: product map, research with players and brands, site and wallet.",
    image: "/images/projects/dux/cover-real.jpg",
    featured: false,
  },
  {
    slug: "pet-mimo",
    title: "Pet Mimo",
    category: "E-commerce / UX/UI Design",
    summary:
      "Taking my sister's pet store online, solo: brand, a Figma component library and a WooCommerce store.",
    image: "/images/projects/pet-mimo/cover-real.jpg",
    featured: false,
  },
  {
    slug: "doutor-ja",
    title: "Doutor Já",
    category: "Healthcare Platform",
    summary:
      "Field research and a redesigned booking flow that reframed an appointment app toward an employer-sponsored health benefit.",
    image: "/images/projects/doutor-ja/hero-real-opt.jpg",
    featured: true,
  },
  {
    slug: "blam",
    title: "Blam",
    category: "Jewelry Brand",
    summary:
      "A WooCommerce store for a high-end 18k gold jewelry brand, built solo in three to four months and still live.",
    image: "/images/projects/blam/cover-real.jpg",
    featured: false,
  },
  {
    slug: "gerador-de-simulados",
    title: "Gerador de Simulados",
    category: "AI Product / Independent",
    summary:
      "An AI practice-exam generator for medical residency, designed and built solo to learn APIs, databases, Google login and payments.",
    image: "/images/projects/gerador-de-simulados/cover-real.jpg",
    featured: false,
  },
  {
    slug: "simplify",
    title: "Simplify",
    category: "Branding / Digital Product",
    summary:
      "A Wi-Fi login that swaps the password for a quiz. Third place at Startup Weekend, as the team's only designer.",
    image: "/images/projects/simplify/cover-real.jpg",
    featured: false,
  },
];
