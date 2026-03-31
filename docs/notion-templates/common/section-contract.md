# Notion Template Section Contract

Every template in every mode must include these required section markers:

- `<!-- REQUIRED:Purpose -->`
- `<!-- REQUIRED:When to use -->`
- `<!-- REQUIRED:How to use -->`
- `<!-- REQUIRED:Inputs/Outputs -->`
- `<!-- REQUIRED:Health Signals -->`
- `<!-- REQUIRED:Limitations -->`
- `<!-- REQUIRED:Examples -->`
- `<!-- REQUIRED:Related Links -->`

Validation (`npm run notion:templates:validate`) renders each template and checks marker presence.

## Contract intent

- Keep behavior parity across `en-only`, `th-en-split`, and `bilingual`.
- Make mode switches safe without manual page rewrites.
- Ensure operational docs always include usage, health, and limitations guidance.

