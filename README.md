# Blankspace

**A platform where communities build their home on Farcaster.**

Blankspace gives token communities, DAOs, and Farcaster channels a customizable homebase with community tools (fidgets) for governance, token management, feeds, and more. Each community gets their own branded experience with custom themes, navigation, and pages.

Initially funded by a grant from [Nouns DAO](https://nouns.wtf/). Forked from [herocast](https://github.com/hellno/herocast/) in April 2024.

## Docs

📚 **[View Full Documentation](https://blankdotspace.github.io/space-system/docs/)**

Quick links:
- [Getting Started](docs/GETTING_STARTED.md) - Local development setup
- [Architecture](docs/ARCHITECTURE/OVERVIEW.md) - System design
- [Contributing](docs/CONTRIBUTING.md) - How to contribute

> Documentation source: [`docs/`](docs/) • Docusaurus site: [`docs-site/`](docs-site/)

## What is Farcaster?

A protocol for decentralized social apps: https://www.farcaster.xyz

## 🏗️ Dev Setup

1. **Clone the repo**  
   ```bash
   git clone https://github.com/blankdotspace/space-system.git
   cd space-system
   ```

2. **Install Supabase CLI**

   On macOS:
   ```bash
   brew install supabase/tap/supabase
   brew install --cask docker
   open /Applications/Docker.app
   ```
   Wait for Docker Desktop to finish initializing before continuing.
   
   On Linux (Debian/Ubuntu):
   ```bash
   # Install Homebrew if needed
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Install Supabase
   brew install supabase/tap/supabase
   
   # Install Docker
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose-plugin
   sudo systemctl enable --now docker
   sudo usermod -aG docker "$USER"
   ```
   Log out/in for Docker group membership to take effect.

3. **Install dependencies**
   ```bash
   yarn install
   ```

4. **Set up environment variables**

   Create `.env.development.local` with:
   - `NEYNAR_API_KEY` - [Neynar API](https://docs.neynar.com/docs)
   - `NEXT_PUBLIC_ALCHEMY_API_KEY` - [Alchemy](https://www.alchemy.com)
   - `ETHERSCAN_API_KEY` - [Etherscan](https://docs.etherscan.io/getting-started/)
   - `COINGECKO_API_KEY` - [CoinGecko](https://www.coingecko.com/en/api)
   - `CLANKER_API_KEY` - Request from the Blankspace or Clanker team
   - `YOUTUBE_API_KEY` - [YouTube API](https://developers.google.com/youtube/v3)
   - `NEXT_PUBLIC_APP_FID` + `APP_MNEMONIC` - Your Farcaster account
   - Supabase keys (from step 5)

5. **Start Supabase and run migrations**
   ```bash
   supabase start
   supabase db reset
   ```
   Use the `API URL` for `NEXT_PUBLIC_SUPABASE_URL` and `anon key` for `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

6. **Seed the local database**
   ```bash
   yarn seed
   ```
   
   This creates storage buckets, community configs, domain mappings, and NavPage registrations.
   
   Verify seeding worked:
   ```bash
   yarn seed --check
   ```

7. **Run the test suite**
   ```bash
   yarn test
   ```

8. **Build and run**
   ```bash
   cp .env.development.local .env.local
   yarn build
   yarn dev
   ```

## Contributing

See the [contributing docs](docs/CONTRIBUTING.md) for how to add to the codebase. Register on [Scout Game](https://scoutgame.xyz/) to earn points for contributions to repos in the [blankdotspace org](https://github.com/blankdotspace/).

## License

Blankspace is released under the GPL-3.0 License. Feel free to fork and modify—just be sure any version you release uses the GPL-3.0 License too.

**Made with ❤️ by the Blankspace team & community.**

Questions or feedback? Create a [GitHub issue](https://github.com/blankdotspace/space-system/issues) or contact us in [Discord](https://discord.gg/eYQeXU2WuH)
