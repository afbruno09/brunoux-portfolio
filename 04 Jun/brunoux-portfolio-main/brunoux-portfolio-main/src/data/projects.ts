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
    slug: "world-bank-ministry-of-labor",
    title: "World Bank / Ministry of Labor (Brazil)",
    category: "Labor Market Intelligence Platform",
    summary:
      "Integrated prototype connecting occupations, courses and labor data.",
    image: "/images/projects/world-bank/cover.jpg",
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
      "Product design and digital execution in a fast-moving Web3 context.",
    image: "/images/projects/dux/cover.jpg",
    featured: false,
  },
  {
    slug: "pet-mimo",
    title: "Pet Mimo",
    category: "E-commerce / UX/UI Design",
    summary:
      "E-commerce design and branding work focused on a clearer and more consistent shopping experience.",
    image: "/images/projects/pet-mimo/cover.jpg",
    featured: false,
  },
  {
    slug: "doutor-ja",
    title: "Doutor Já",
    category: "Healthcare Platform",
    summary:
      "Scheduling experience for accessible healthcare services.",
    image: "/images/projects/doutor-ja/cover.jpg",
    featured: false,
  },
  {
    slug: "blam",
    title: "Blam",
    category: "Jewelry Brand",
    summary:
      "WordPress execution for a jewelry brand, balancing visual presentation and product showcase.",
    image: "/images/projects/blam/cover.jpg",
    featured: false,
  },
  {
    slug: "simplify",
    title: "Simplify",
    category: "Branding / Digital Product",
    summary:
      "Visual identity and interface work for a digital quiz-based Wi-Fi login experience.",
    image: "/images/projects/simplify/cover.jpg",
    featured: false,
  },
];
