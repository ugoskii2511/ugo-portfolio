export type Service = {
  id: string;
  title: string;
  description: string;
};

export type ServiceCategory = {
  id: string;
  title: string;
  description: string;
  icon: "code" | "server" | "cart" | "layout-dashboard" | "file-text" | "gauge" | "database" | "shield";
  services: Service[];
};

export const serviceCategories: ServiceCategory[] = [
  {
    id: "frontend",
    title: "Frontend Development",
    description: "Fast, accessible, pixel-perfect interfaces built with modern frameworks.",
    icon: "code",
    services: [
      { id: "react-app", title: "React.js Web App Development", description: "Interactive single-page apps built with React and modern tooling." },
      { id: "nextjs-site", title: "Next.js Website / App Development", description: "SEO-friendly, server-rendered sites and apps on Next.js." },
      { id: "vue-app", title: "Vue.js Application Development", description: "Lightweight, reactive front ends built with Vue." },
      { id: "tailwind-ui", title: "Tailwind CSS UI Design & Implementation", description: "Custom design systems implemented with utility-first CSS." },
      { id: "responsive-design", title: "Responsive Web Design (Mobile-First)", description: "Layouts that look great on every screen size, from mobile to 4K." },
    ],
  },
  {
    id: "backend",
    title: "Backend & API Development",
    description: "Reliable servers and APIs that power your product behind the scenes.",
    icon: "server",
    services: [
      { id: "nodejs-backend", title: "Node.js Backend Development", description: "Scalable server-side applications built on Node.js." },
      { id: "express-api", title: "Express.js REST API Development", description: "Clean, well-documented REST APIs built with Express." },
      { id: "fastapi-backend", title: "Python / FastAPI Backend Development", description: "High-performance Python APIs with automatic docs and validation." },
      { id: "graphql-api", title: "GraphQL API Development", description: "Flexible, typed GraphQL APIs for complex data needs." },
      { id: "websocket-integration", title: "Real-Time WebSocket Integration", description: "Live updates, chat, and notifications powered by WebSockets." },
    ],
  },
  {
    id: "ecommerce",
    title: "Full-Stack E-Commerce Solutions",
    description: "Complete online stores from product catalog to checkout to payment.",
    icon: "cart",
    services: [
      { id: "ecommerce-paystack", title: "E-Commerce Store with Paystack Integration", description: "Full storefront with secure Paystack payment processing." },
      { id: "ecommerce-flutterwave", title: "E-Commerce Store with Flutterwave Integration", description: "Full storefront with secure Flutterwave payment processing." },
      { id: "ecommerce-stripe", title: "E-Commerce Store with Stripe Integration", description: "Full storefront with secure Stripe payment processing." },
      { id: "inventory-system", title: "Inventory Management System", description: "Track stock, variants, and orders in real time." },
      { id: "checkout-flow", title: "Shopping Cart & Checkout Flow", description: "Smooth, conversion-optimized cart and checkout experiences." },
    ],
  },
  {
    id: "saas-architecture",
    title: "Web Application Architecture & SaaS Platforms",
    description: "Custom platforms and dashboards architected to scale with your business.",
    icon: "layout-dashboard",
    services: [
      { id: "saas-dashboard", title: "Custom SaaS Dashboard Development", description: "Multi-user dashboards with billing, roles, and analytics." },
      { id: "auth-systems", title: "Authentication & User Management Systems", description: "Secure sign-up, login, roles, and permissions." },
      { id: "edtech-portal", title: "EdTech Learning Portal Development", description: "Course platforms with student progress tracking." },
      { id: "vtu-portal", title: "VTU / Airtime & Data Reseller Platform", description: "Wallet-funded platforms for airtime, data, and bill payments." },
      { id: "multi-tenant-architecture", title: "Multi-Tenant Web Application Architecture", description: "Architecture supporting multiple isolated customer accounts." },
    ],
  },
  {
    id: "cms",
    title: "CMS & Custom Blog Platforms",
    description: "Content platforms your team can update without touching code.",
    icon: "file-text",
    services: [
      { id: "headless-cms", title: "Headless CMS Integration", description: "Sanity, Strapi, or Contentful wired into a custom front end." },
      { id: "custom-blog", title: "Custom Blog Platform Development", description: "A fast, SEO-friendly blog built to your exact design." },
      { id: "wordpress-theme", title: "WordPress Custom Theme Development", description: "A bespoke WordPress theme built from your design." },
      { id: "wordpress-plugin", title: "WordPress Plugin Development", description: "Custom plugins to extend WordPress functionality." },
    ],
  },
  {
    id: "performance-seo",
    title: "Web Performance Optimization & SEO",
    description: "Faster sites that rank higher and convert better.",
    icon: "gauge",
    services: [
      { id: "lighthouse-audit", title: "Lighthouse Audit & Performance Fixes", description: "Diagnose and fix what's slowing your site down." },
      { id: "speed-optimization", title: "Website Speed Optimization", description: "Image, code, and asset optimization for faster load times." },
      { id: "technical-seo", title: "Technical SEO & Search Indexing", description: "Structured data, sitemaps, and crawlability fixes." },
      { id: "core-web-vitals", title: "Core Web Vitals Optimization", description: "Improve LCP, CLS, and INP for better rankings and UX." },
    ],
  },
  {
    id: "database",
    title: "Database Design & Management",
    description: "Well-modeled data storage that scales with your application.",
    icon: "database",
    services: [
      { id: "postgresql-design", title: "PostgreSQL Database Design", description: "Relational schema design, indexing, and optimization." },
      { id: "mongodb-design", title: "MongoDB Database Design", description: "Document data modeling for flexible, scalable apps." },
      { id: "mysql-design", title: "MySQL Database Design", description: "Reliable relational data design on MySQL." },
      { id: "firebase-integration", title: "Firebase Integration", description: "Realtime database, auth, and hosting on Firebase." },
      { id: "supabase-integration", title: "Supabase Integration", description: "Postgres, auth, storage, and realtime with Supabase." },
    ],
  },
  {
    id: "security",
    title: "Web Security & Maintenance",
    description: "Keep your site secure, patched, and running smoothly.",
    icon: "shield",
    services: [
      { id: "ssl-setup", title: "SSL Setup & HTTPS Migration", description: "Secure your site and move it fully to HTTPS." },
      { id: "vulnerability-patching", title: "Security Vulnerability Patching", description: "Find and fix security holes before they're exploited." },
      { id: "bug-fixing", title: "Bug Fixing & Ongoing Maintenance", description: "Ongoing support to keep your site running smoothly." },
      { id: "api-security", title: "API Security Hardening", description: "Rate limiting, auth hardening, and input validation for APIs." },
    ],
  },
];
