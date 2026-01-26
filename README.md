# blankspace

**Highly customizable [Farcaster](https://farcaster.xyz/) client, initially funded by a grant from [Nouns DAO](https://nouns.wtf/).** Customize the look, sound, content, and functionality of your public profile space and personal feed/homebase with **Themes**, **Tabs**, and a growing library of mini-apps called **Fidgets**.


Forked from [herocast](https://github.com/hellno/herocast/) in April 2024.

# Docs

📚 **[View Documentation](https://blankdotspace.github.io/space-system/)** - Full documentation site

Quick links:
- [Getting Started](https://blankdotspace.github.io/space-system/docs/getting-started) - Local development setup
- [Architecture](https://blankdotspace.github.io/space-system/docs/architecture/overview) - System design
- [Contributing](https://blankdotspace.github.io/space-system/docs/contributing) - How to contribute

> Source files are in [`docs/`](docs/) and [`docs-site/`](docs-site/)

## What is Farcaster?
a protocol for decentralized social apps: https://www.farcaster.xyz

## 🏗️ Dev Setup

1. **Clone the repo**  
   ```bash
   git clone https://github.com/blankdotspace/space-system.git
   cd space-system
2. **Install Supabase CLI**
   On Mac OS, for example:
   ```bash
   brew install supabase/tap/supabase
   ```

   Install Docker Desktop on macOS:
   ```bash
   brew install --cask docker
   open /Applications/Docker.app
   ```
   Wait for Docker Desktop to finish initializing before continuing.
   
   On Linux:

   First, install Homebrew (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   Follow the instructions in your terminal to add Homebrew to your PATH.
   Generally, you'll need to run these commands (replace `.bashrc` with your shell configuration file if different):

   ```bash
   (echo; echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"') >> ~/.bashrc
   eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
   ```
   
   You may also need to install some dependencies first (Debian/Ubuntu):
   ```bash
   sudo apt-get install build-essential procps curl file git
   ```

   Then install Supabase:
   ```bash
   brew install supabase/tap/supabase
   ```

   Install Docker (Debian/Ubuntu):
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose-plugin
   sudo systemctl enable --now docker
   sudo usermod -aG docker "$USER"
   ```
   Log out/in (or restart your shell) so the new group membership takes effect.
   For other distros, follow the [official Docker Engine docs](https://docs.docker.com/engine/install/).

   Make sure Docker is installed and running before continuing.
4. Install dependencies
   ```bash
   yarn install
6. Create a file `.env.development.local`
7. Get the environment variables you need for the file <br>
  a. get a Neynar API key https://docs.neynar.com/docs -> `NEYNAR_API_KEY` <br>
  b. get an Alchemy API key https://www.alchemy.com -> `NEXT_PUBLIC_ALCHEMY_API_KEY` <br>
  c. get an Etherscan API key https://docs.etherscan.io/getting-started/ -> 'ETHERSCAN_API_KEY' <br>
  d. get a CoinGecko API key https://www.coingecko.com/en/api -> 'COINGECKO_API_KEY' <br>
  e. get a Clanker API key https://github.com/clanker-devco/DOCS -> 'CLANKER_API_KEY' (dev portal coming soon; request a key from the blankspace or Clanker team for now) <br>
  f. get a Youtube API key https://developers.google.com/youtube/v3 -> 'YOUTUBE_API_KEY' <br>
  g. get your Farcaster account FID and mnemonic -> `NEXT_PUBLIC_APP_FID` + `APP_MNEMONIC`<br>
  h. launch local copy of Supabase with `supabase start` (in the root directory of this repo), use the info provided -> <br>
`API URL`:`NEXT_PUBLIC_SUPABASE_URL` + `anon key`:`NEXT_PUBLIC_SUPABASE_ANON_KEY`

8. **Start Supabase and run migrations**
   ```bash
   supabase start
   supabase db reset
   ```

9. **Seed the local database**
   ```bash
   yarn seed
   ```
   
   This creates everything needed for local development:
   - Storage buckets (spaces, private, explore)
   - Community configs (nounspace.com, clanker.space, example)
   - Domain mappings for local testing
   - NavPage space registrations and configs
   - Optionally uploads assets to ImgBB (if `NEXT_PUBLIC_IMGBB_API_KEY` is set)
   
   **Verify seeding worked:**
   ```bash
   yarn seed --check
   ```

10. **Run the test suite**
    ```bash
    yarn test
    ```

11. **Build and run**
    ```bash
    cp .env.development.local .env.local
    yarn build
    yarn dev
    ```

## Contributing and making Fidgets

See the [contributing docs](docs/CONTRIBUTING.MD) for how to add to the code base. Register on [Scout Game](https://scoutgame.xyz/) to earn points for contributions to repos in the [blankdotspace org](https://github.com/blankdotspace/).

## Code Design

The Blankspace App follows the Atomic Design Pattern
![atomic_design](https://github.com/blankdotspace/space-system/assets/7180740/2c892612-c730-4e74-bd32-3e7a8a6babbb)

`src/pages` holds the Page elements of the atomic design. These are separated from `src/common` due to how Next.js handles routing.

`src/common/ui` contains all of the display components for all other layers of the atomic design. `src/common/ui/components` are a mixture of Molecules and Organisms that were imported from `herocast`, they still need to be split into their appropriate folders (`src/common/ui/molecules` & `src/common/ui/organisms`).

`src/common/data` contains access to datastreams, in the form of database connections and API's

`src/common/lib` contains useful functions for accessing formatted data, along with helpers functions inside the `utils` directory.

`src/styles` contains information for managing website styling

`src/constants` contains all static information that is needed to run the app. This includes actual constants, along with some global types

### Refactoring

This file structure is adapted from `herocast`, and not all files have been cleaned up properly. If you find files or data that are placed in the wrong location, please refactor them to correct file or folder. For example, there are some constants that are not placed in the `src/constants` directory, and instead are in the other files.

### DB scheme: accounts
reminder: key is an edcsa key not a 'normal' EVM address

### License
blankspace is released under the GPL-3.0 License. Feel free to fork and modify the project—just be sure any version you release uses the GPL-3.0 License too.

**Made with ❤️ by the Blankspace team & community.**
Questions or feedback? Create a [Github issue](https://github.com/blankdotspace/space-system/issues) or contact us in [Discord](https://discord.gg/eYQeXU2WuH)
