# Kissan AI - Frontend

Next.js 14 frontend for Kissan AI - A mobile-first, multilingual chat interface for Indian farmers.

## Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript for type safety
- ✅ TailwindCSS for styling
- ✅ PWA support (installable app)
- ✅ WhatsApp-style chat UI
- ✅ Real-time streaming responses
- ✅ 10 Indian languages
- ✅ Geolocation integration
- ✅ Mobile-first responsive design
- ✅ Low bandwidth optimization

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
copy .env.local.example .env.local
```

## Configuration

Edit `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production:
```bash
NEXT_PUBLIC_API_URL=https://kissan.ai
```

## Running

### Development
```bash
npm run dev
```

Visit http://localhost:3000

### Production Build
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t kissan-ai-frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://backend:8000 kissan-ai-frontend
```

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/
│   ├── ChatWindow.tsx     # Main chat container
│   ├── MessageBubble.tsx  # Individual message
│   ├── InputBar.tsx       # User input field
│   ├── LanguageSelector.tsx  # Language picker modal
│   └── LoadingStream.tsx  # Typing indicator
├── utils/
│   ├── api.ts            # API client
│   ├── languages.ts      # Language definitions
│   └── location.ts       # Geolocation utilities
├── public/
│   └── manifest.json     # PWA manifest
└── next.config.js        # Next.js configuration
```

## Components

### ChatWindow
Main chat interface that manages:
- Message history
- Sending messages to backend
- Location context
- Welcome message in selected language

### MessageBubble
Displays individual messages with:
- WhatsApp-style bubbles
- Streaming text effect for agent responses
- Timestamps
- User/agent differentiation

### InputBar
User input component with:
- Auto-growing textarea
- Send button
- Language-specific placeholders
- Enter to send, Shift+Enter for new line

### LanguageSelector
Modal for language selection:
- All 10 supported languages
- Native script display
- Current selection indicator
- Persistent storage

### LoadingStream
Animated typing indicator (three dots)

## Utilities

### api.ts
Axios-based API client with:
- Chat message sending
- Language fetching
- Health checks
- Error handling

### languages.ts
Language definitions:
- Supported language list (10 languages)
- Language metadata (code, name, native name)
- Type definitions

### location.ts
Geolocation utilities:
- Browser geolocation API wrapper
- Permission handling
- Error handling
- 5-minute caching

## Styling

Uses TailwindCSS with:
- Custom green color palette (`primary-*`)
- Mobile-first responsive design
- Custom scrollbar styling
- Typing animation keyframes
- Smooth transitions

## PWA Configuration

The app is installable as a Progressive Web App:

**manifest.json**
- App name, description
- Display mode: standalone
- Icons: 192x192, 512x512
- Theme color: #16a34a (green)

**next-pwa**
- Service worker auto-generation
- Offline support (future)
- Disabled in development

## State Management

Uses React hooks:
- `useState` for local state
- `useEffect` for side effects
- `useRef` for scroll management
- `localStorage` for language persistence

## Performance Optimizations

1. **Lazy Loading**: Components load on demand
2. **Image Optimization**: Next.js automatic optimization
3. **Code Splitting**: Automatic route-based splitting
4. **Streaming**: Progressive text rendering
5. **Caching**: Location data cached for 5 minutes

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Safari 14+
- ✅ Firefox 88+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## Accessibility

- Semantic HTML
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly

## Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build check
npm run build
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

## Deployment

### Vercel (Recommended)
```bash
vercel deploy --prod
```

### Docker
```bash
docker build -t kissan-ai-frontend .
docker run -p 3000:3000 kissan-ai-frontend
```

### Static Export (Not Recommended)
This app uses API routes and dynamic features, so static export is not suitable.

## Troubleshooting

### API Connection Issues
- Check `NEXT_PUBLIC_API_URL` is correct
- Verify backend is running
- Check CORS configuration on backend

### PWA Not Installing
- Ensure HTTPS in production
- Check manifest.json is accessible
- Verify service worker is registered

### Location Not Working
- Check browser permissions
- Ensure HTTPS (geolocation requires secure context)
- Handle permission denial gracefully

## License

Proprietary
