<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- AI provider: OPENAI_API_KEY (+AI_MODEL, default gpt-5-mini) when set, else Lovable AI Gateway — lets the app run on Vercel.
- Nitro preset "vercel" for builds outside Lovable — user deploys to Vercel.
