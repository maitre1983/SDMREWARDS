# Smart Digital Solutions - PRD

## Project Overview
Site vitrine professionnel marketing pour Smart Digital Solutions by GIT NFT GHANA LTD - agence de création de sites web basée en Inde avec services internationaux.

## Original Problem Statement
Création d'un site internet avec caractéristiques marketing agressif mais corporate, vitrine SEO poussé avec possibilité de répondre aux clients par mails. Multilingue (EN/FR/AR/ZH), dashboard admin pour gestion des messages.

## User Personas
1. **Prospect Client** - Entreprises/PME cherchant à créer leur présence digitale
2. **Admin** - Gestionnaire de l'agence qui répond aux demandes clients

## Core Requirements (Static)
- [x] Site vitrine multilingue (EN/FR/AR/ZH)
- [x] Design premium bleu corporate avec animations
- [x] Sections: Hero, Why Website, Services, Pricing, Portfolio, Bonus, Contact
- [x] Formulaire de contact avec envoi en base + notification email
- [x] Dashboard admin pour gestion des messages
- [x] Bouton WhatsApp flottant
- [x] Support RTL pour l'arabe
- [x] Logo personnalisé
- [x] Système de tracking des visites (analytics)

## What's Been Implemented (Feb 2026)

### Backend (FastAPI)
- API RESTful avec MongoDB
- Routes contact: POST /api/contact
- Routes admin: login, messages CRUD, stats, analytics
- Auth JWT pour admin
- **Email Resend** - Notifications automatiques (admin + confirmation client)
- **Analytics** - Tracking des visites (device, browser, OS, IP, page, timestamp)
- Admin par défaut: admin/admin123

### Frontend (React)
- Pages: HomePage, AdminLoginPage, AdminDashboardPage
- 8 sections de landing page avec animations Framer Motion
- Sélecteur de langue (EN/FR/AR/ZH) avec support RTL
- Logo personnalisé partout (navbar, footer, admin)
- Dashboard admin avec onglet Analytics

### Design
- Thème: Corporate Tech-Luxury
- Couleurs: Primary #0056D2, Secondary #001F3F, Accent #00E0FF
- Fonts: Outfit (headings), Plus Jakarta Sans (body)
- Hero dark, sections light, glassmorphism cards

## P0 Features (Done)
- [x] Landing page complète
- [x] Formulaire de contact fonctionnel
- [x] Dashboard admin avec gestion messages
- [x] Multilingue 4 langues avec RTL
- [x] WhatsApp intégration
- [x] Logo personnalisé
- [x] Notifications email (Resend)
- [x] Analytics de visites

## P1 Features (Backlog)
- [ ] Vérifier domaine Resend pour emails en production
- [ ] SEO meta tags dynamiques par page
- [ ] Sitemap.xml automatique
- [ ] Google Analytics intégration

## P2 Features (Future)
- [ ] Blog/Articles section
- [ ] Chat en direct
- [ ] Témoignages clients dynamiques
- [ ] Notifications push admin
- [ ] Géolocalisation des visiteurs

## Tech Stack
- Frontend: React 19, Tailwind CSS, Framer Motion, Shadcn UI
- Backend: FastAPI, MongoDB, JWT Auth, Resend
- Deployment: Kubernetes/Docker

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/contact | Submit contact form + send emails |
| POST | /api/track | Track page visit |
| POST | /api/admin/login | Admin authentication |
| GET | /api/admin/messages | List all messages |
| PUT | /api/admin/messages/{id}/read | Mark as read |
| PUT | /api/admin/messages/{id}/reply | Reply + send email |
| DELETE | /api/admin/messages/{id} | Delete message |
| GET | /api/admin/stats | Dashboard statistics |
| GET | /api/admin/analytics | Visit analytics data |

## Admin Credentials
- Username: admin
- Password: admin123

## Email Configuration (Resend)
- API Key: Configured in /app/backend/.env
- Note: En mode test, emails uniquement vers email vérifié
- Pour production: Vérifier domaine sur resend.com/domains
