# 🧙‍♂️ Nikito's Ledger

**Automated D&D 5.5 Character Sheet Generator** — powered by AI, built for storytellers.

A minimalist web tool that lets players and DMs generate complete character sheets from natural language prompts. No complex forms, no micro-management — just describe your character and play.

> *"Foque na história, não na burocracia."*

## ✨ Features

- **Prompt-to-Sheet** — Describe a character in plain text, get a full 5.5e sheet instantly via Gemini AI
- **NPC Generator** — DMs can generate memorable NPCs with roleplaying notes, secret motivations, and plot hooks
- **Markdown Import** — Paste structured Markdown from other AI tools to import characters directly
- **Image Support** — Attach character art in the prompt; it becomes the portrait on the sheet and PDF
- **Unique Visual Identity** — Each character gets a personalized color scheme, symbol, and ornamental details
- **PDF Export** — Generate styled PDFs with embedded portraits using the official D&D template
- **Dual Mode** — Sidebar with separate PC and NPC categories for organized campaign management

## 🖼️ Aesthetic

Dark UI inspired by Baldur's Gate 3, with parchment-textured character sheets reminiscent of classic Forgotten Realms sourcebooks. Cinzel + Crimson Text typography.

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/pablodias/nikitos-ledger.git
cd nikitos-ledger

# Install
npm install

# Configure
cp .env.example .env
# Add your Gemini API key to .env

# Run
npm run dev
```

### Requirements

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier works)
- A D&D 5.5 editable PDF template in `public/templates/dnd_5.5_official.pdf`

## 🏗️ Architecture

```
src/
├── App.vue                     # Layout: sidebar + centered main
├── components/
│   ├── Sidebar.vue             # PC/NPC tabs, character list
│   ├── PromptInput.vue         # AI prompt + MD import + image attach
│   └── CharacterSheet.vue      # Themed character display + PDF export
├── composables/
│   └── usePdf.js               # pdf-lib: fill template + embed portrait
├── services/
│   ├── LlmService.js           # Gemini Flash 2.5 API (PC + NPC prompts)
│   ├── CharacterParser.js      # Normalize LLM JSON → internal format
│   └── MarkdownParser.js       # Parse structured MD → character data
└── stores/
    └── character.js            # Pinia: multi-character state (PCs + NPCs)
```

## 🛠️ Stack

| Layer | Tech |
|-------|------|
| Frontend | Vue 3 (Vite), Pinia |
| Styling | Tailwind CSS 4 |
| AI | Google Gemini Flash 2.5 |
| PDF | pdf-lib |
| Fonts | Cinzel, Crimson Text |

## 📜 How It Works

1. **Player mode** — Type a character concept → AI generates full 5.5e stats, abilities, spells, backstory
2. **DM mode** — Describe an NPC → AI adds roleplaying cues, DM-only notes, and plot hooks
3. **Import mode** — Paste Markdown from ChatGPT/Claude/etc → parsed locally without API calls
4. **Attach art** — Upload an image → AI uses it as visual reference, embeds it in the PDF

## 🤝 Contributing

PRs welcome. This is an open tool by the community, for the community.

## 📄 License

MIT

---

*Crafted with ☕ and 🎲 by **El Brujo Tapuya***
