# AI Science Helper

Xây dựng ứng dụng trợ lý AI phân tích video thí nghiệm Khoa học Tự nhiên 8 (chủ đề Khối lượng riêng và Áp suất) theo tài liệu đặc tả đính kèm.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b104ee25-ac45-44ea-966d-bddb44c0614a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deploy to Vercel

The build is preconfigured for Vercel (`nitro: { preset: "vercel" }` in `vite.config.ts`). Import the GitHub repo into Vercel and set one of these environment variables (Settings → Environment Variables, then Redeploy):

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | one of the three | OpenAI key (`sk-...`) from platform.openai.com |
| `XAI_API_KEY` | one of the three | xAI (Grok) key from console.x.ai, or any OpenAI-compatible service |
| `GEMINI_API_KEY` | one of the three | Google Gemini key from aistudio.google.com (free tier available) |
| `XAI247_API_KEY` + `XAI247_BASE_URL` + `XAI247_MODEL` | optional | xai247 provider (all three required together); priority OpenAI → xai247 → xAI → Gemini |
| `XAI_BASE_URL` | optional | Custom OpenAI-compatible base URL for the xAI key (e.g. `https://xai247.xyz/v1`); defaults to `https://api.x.ai/v1` |
| `AI_MODEL` | optional | Override the default model (`gpt-5-mini` for OpenAI, `grok-4.7` for xAI, `gemini-2.5-flash` for Gemini) |

If several keys are set, the priority is OpenAI → xAI → Gemini. On Lovable hosting none of these are needed — the built-in AI gateway is used automatically.
