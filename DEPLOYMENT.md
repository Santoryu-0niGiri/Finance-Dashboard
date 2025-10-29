# Firebase Deployment Guide

## Prerequisites
- Node.js and npm installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase account with project created

## Setup

1. **Login to Firebase**
   ```bash
   firebase login
   ```

2. **Initialize Firebase (if needed)**
   ```bash
   firebase init
   ```
   - Select Hosting
   - Choose existing project: finance-dashboard-d73f7
   - Public directory: dist/finance-dashboard/browser
   - Single-page app: Yes
   - Overwrite index.html: No

## Build and Deploy

### Quick Deploy
```bash
npm run deploy
```

### Manual Steps
```bash
# Build for production
npm run build:prod

# Deploy to Firebase
firebase deploy
```

## View Your App
```bash
firebase open hosting:site
```

Your app will be live at: https://finance-dashboard-d73f7.web.app

## Firestore Security Rules

Security rules are defined in `firestore.rules` and deployed automatically with:
```bash
firebase deploy --only firestore:rules
```

## Environment Configuration

Firebase configuration is in:
- `src/firebase/environment.ts` - Main config
- `src/environments/environment.ts` - Development
- `src/environments/environment.prod.ts` - Production

## Troubleshooting

### Build Errors
```bash
# Clear cache
rm -rf .angular/cache
npm run build:prod
```

### Deployment Issues
```bash
# Check Firebase project
firebase projects:list

# Use specific project
firebase use finance-dashboard-d73f7
```

## CI/CD (Optional)

Add GitHub Actions workflow in `.github/workflows/firebase-deploy.yml` for automatic deployment on push to main branch.
