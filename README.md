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
- **In-App Character Sheet** — Multi-page tabbed view (Stats, Profile, Spells) with parchment styling — no PDF needed to read your sheet
- **PDF Export** — Generate styled PDFs using the official D&D Beyond 2024 character sheet template, with portrait embedded in the Appearance area (page 2)
- **Markdown Export** — Export Obsidian-compatible `.md` files with YAML frontmatter for Dataview queries
- **Inline Editing** — Click to edit character name, species, level, background, and alignment directly on the sheet
- **Dual Mode** — Sidebar with separate PC and NPC categories for organized campaign management

## 🖼️ Aesthetic

Dark UI inspired by Baldur's Gate 3, with parchment-textured character sheets reminiscent of classic Forgotten Realms sourcebooks. Cinzel + Crimson Text typography. The in-app sheet uses a three-tab layout:

1. **Ficha** — Ability scores, combat stats, saves, skills, attacks, equipment, features
2. **Perfil** — Large portrait, personality traits, backstory, NPC roleplaying notes
3. **Magias** — Spellcasting stats, spell slot tracker, spells grouped by level

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
- The D&D Beyond 2024 character sheet PDF is included in `public/templates/` (downloaded from [D&D Beyond](https://www.dndbeyond.com))

## 🏗️ Architecture

```
src/
├── App.vue                     # Layout: sidebar + centered main
├── components/
│   ├── Sidebar.vue             # PC/NPC tabs, character list
│   ├── PromptInput.vue         # AI prompt + MD import + image attach
│   └── CharacterSheet.vue      # Multi-page in-app sheet + PDF/MD export
├── composables/
│   └── usePdf.js               # pdf-lib: coordinate-based drawing on D&D Beyond 2024 template
├── services/
│   ├── LlmService.js           # Gemini Flash 2.5 API (PC + NPC prompts)
│   ├── DndEngine.js            # D&D 5.5 rules engine (derived stats, spell slots, weapons)
│   ├── CharacterParser.js      # Normalize LLM JSON → internal format
│   ├── MarkdownParser.js       # Parse structured MD → character data
│   └── MarkdownExporter.js     # Export to Obsidian-compatible MD + YAML
└── stores/
    └── character.js            # Pinia: multi-character state (PCs + NPCs)
```

### PDF Export

The PDF export uses the official **D&D Beyond 2024** character sheet — a flat (non-fillable) 2-page PDF at 603×774pt. Since there are no form fields, `pdf-lib` draws text at mapped coordinates using Helvetica/Helvetica-Bold. The character portrait is embedded in the **Appearance area on page 2** (top-right).

> **Note:** PDF coordinate positions may need fine-tuning depending on your template version. Adjust the coordinate maps in `src/composables/usePdf.js` if fields appear misaligned.

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
4. **Attach art** — Upload an image → AI uses it as visual reference, embeds it in the PDF and in-app sheet
5. **View in-app** — Browse your character across three tabs without exporting anything
6. **Export** — Generate a D&D Beyond-style PDF or an Obsidian-compatible Markdown file

## 🤝 Contributing

PRs welcome. This is an open tool by the community, for the community.

## 📄 License

MIT

---

*Crafted with ☕ and 🎲 by **El Brujo Tapuya***
