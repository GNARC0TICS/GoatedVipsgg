# Project Directory Structure

This document provides a hierarchical visualization of the project's file structure.

```
.
├── affiliate_stats.json
├── client/
│   ├── index.html
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── Routes.tsx
│   │   ├── components/
│   │   │   ├── AffiliateStats.tsx
│   │   │   ├── AnimateOnScroll.tsx
│   │   │   ├── AuthButton.tsx
│   │   │   ├── AuthModal.tsx
│   │   │   ├── BonusCodeHeroCard.tsx
│   │   │   ├── CountdownTimer.tsx
│   │   │   ├── FeatureCarousel.tsx
│   │   │   ├── FirebaseAuth.tsx
│   │   │   ├── FloatingSupport.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── LeaderboardTable.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── MVPCards.tsx
│   │   │   ├── MobileAdminBadge.tsx
│   │   │   ├── PageTransition.tsx
│   │   │   ├── PreLoader.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── QuickProfile.tsx
│   │   │   ├── RaceTimer.tsx
│   │   │   ├── ScrollToTop.tsx
│   │   │   ├── SlotFix.tsx
│   │   │   ├── SocialShare.tsx
│   │   │   ├── chat/
│   │   │   ├── check-routes.ts
│   │   │   ├── kokonutui/
│   │   │   ├── mvp-card.tsx
│   │   │   ├── theme-toggle.tsx
│   │   │   └── ui/
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── frontend/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── use-intersection-observer.tsx
│   │   │   ├── use-leaderboard.ts
│   │   │   ├── use-mobile.tsx
│   │   │   ├── use-toast.ts
│   │   │   ├── use-toast.tsx
│   │   │   ├── use-user.ts
│   │   │   └── use-user.tsx
│   │   ├── index.css
│   │   ├── lib/
│   │   │   ├── auth.tsx
│   │   │   ├── firebase.ts
│   │   │   ├── navigation.ts
│   │   │   ├── queryClient.ts
│   │   │   ├── tier-utils.ts
│   │   │   ├── toast-context.tsx
│   │   │   ├── types.d.ts
│   │   │   └── utils.ts
│   │   ├── main.tsx
│   │   ├── pages/
│   │   │   ├── BonusCodes.tsx
│   │   │   ├── Challenges.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── GoatedToken.tsx
│   │   │   ├── Help.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── PrivacyPage.tsx
│   │   │   ├── Promotions.tsx
│   │   │   ├── ProvablyFair.tsx
│   │   │   ├── Telegram.tsx
│   │   │   ├── TermsPage.tsx
│   │   │   ├── UserProfile.tsx
│   │   │   ├── VipProgram.tsx
│   │   │   ├── VipTransfer.tsx
│   │   │   ├── WagerRaces.tsx
│   │   │   ├── admin/
│   │   │   ├── admin-login.tsx
│   │   │   ├── admin.tsx
│   │   │   ├── auth-page.tsx
│   │   │   ├── bonus-codes.tsx
│   │   │   ├── faq.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── notification-preferences.tsx
│   │   │   ├── support.tsx
│   │   │   └── tips-and-strategies.tsx
│   │   ├── styles/
│   │   │   ├── fonts.css
│   │   │   └── theme.css
│   │   └── vite-env.d.ts
│   └── tailwind.config.ts
├── components.json
├── databaseoverview.md
├── db/
│   ├── index.ts
│   ├── schema/
│   │   ├── telegram.ts
│   │   └── users.ts
│   ├── schema.ts
│   └── types.d.ts
├── drizzle.config.ts
├── fonts/
│   ├── GeistMono-Black.woff2
│   ├── GeistMono-Regular.woff2
│   ├── MonaSansCondensed-ExtraBold.woff2
│   ├── MonaSansExpanded-ExtraBold.woff2
│   └── MonaSansExpanded-SemiBold.woff2
├── lib/
│   └── utils.ts
├── package-lock.json
├── package.json
├── postcss.config.js
├── server/
│   ├── auth.ts
│   ├── basic-verification-routes.ts
│   ├── config/
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── db-reset.ts
│   ├── index.ts
│   ├── middleware/
│   │   ├── admin.ts
│   │   ├── auth.ts
│   │   └── rate-limiter.ts
│   ├── routes.ts
│   ├── telegram/
│   │   ├── BOTWELCOME.png
│   │   ├── README.md
│   │   └── bot.ts
│   ├── test-api.ts
│   ├── verification-routes.ts
│   └── vite.ts
├── tailwind.config.ts
├── theme.json
├── tsconfig.json
└── vite.config.ts
```

Note: This structure shows the main files and directories. Some directories containing numerous files (like node_modules, attached_assets) are simplified or omitted for clarity.