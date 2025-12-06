# nounspace

**Highly customizable [Farcaster](https://farcaster.xyz/) client, initially funded by a grant from [Nouns DAO](https://nouns.wtf/).** Customize the look, sound, content, and functionality of your public profile space and personal feed/homebase with **Themes**, **Tabs**, and a growing library of mini-apps called **Fidgets**.


Forked from [herocast](https://github.com/hellno/herocast/) in April 2024.

# Docs
https://docs.nounspace.com/nounspace-alpha/

## What is Farcaster?
a protocol for decentralized social apps: https://www.farcaster.xyz

## 🏗️ Dev Setup

1. **Clone the repo**  
   ```bash
   git clone https://github.com/Nounspace/nounspace.ts.git
   cd nounspace.ts
2. **Install Supabase CLI**
   On Mac OS, for example:
   ```bash
   brew install supabase/tap/supabase
   
   On Linux:
   install docker
   install supabase
   npx supabase init
4. Install dependencies
   ```bash
   yarn install
6. Create a file `.env.development.local`
7. Get the environment variables you need for the file <br>
  a. get a Neynar API key https://docs.neynar.com/docs -> `NEYNAR_API_KEY` <br>
  b. get an Alchemy API key https://www.alchemy.com -> `NEXT_PUBLIC_ALCHEMY_API_KEY` <br>
  c. get an Etherscan API key https://docs.etherscan.io/getting-started/ -> 'ETHERSCAN_API_KEY' <br>
  d. get a CoinGecko API key https://www.coingecko.com/en/api -> 'COINGECKO_API_KEY' <br>
  e. get a Clanker API key https://github.com/clanker-devco/DOCS -> 'CLANKER_API_KEY' (dev portal coming soon; request a key from the nounspace or Clanker team for now) <br>
  f. get a Youtube API key https://developers.google.com/youtube/v3 -> 'YOUTUBE_API_KEY' <br>
  g. get your Farcaster account FID and mnemonic -> `NEXT_PUBLIC_APP_FID` + `APP_MNEMONIC`<br>
  h. launch local copy of Supabase with `supabase start` (in the root directory of this repo), use the info provided -> <br>
`API URL`:`NEXT_PUBLIC_SUPABASE_URL` + `anon key`:`NEXT_PUBLIC_SUPABASE_ANON_KEY`

8. Run the setup script
```bash
./setup.sh
```
The script will attempt to start Supabase automatically if Docker is running; otherwise it will skip this step.

9. **Seed the local database**
   After Supabase is running and migrations are applied, seed the database:
   ```bash
   # Run migrations and seed SQL (if not already done)
   supabase db reset
   
   # Seed community configs and navPage spaces
   yarn seed
   ```
   
   This will:
   - Upload Nouns assets to ImgBB (if `NEXT_PUBLIC_IMGBB_API_KEY` is set)
   - Create navPage space registrations
   - Seed community configs (nouns, example, clanker)
   - Upload navPage space configs to Supabase Storage

10. Run the test suite
   ```bash
   yarn test
   ```

11. cp .env.development.local .env.local
12. yarn build

## Contributing and making Fidgets

See the [contributing docs](docs/CONTRIBUTING.MD) for how to add to the code base. Register on [Scout Game](https://scoutgame.xyz/) to earn points for contributions to repos in the [nounspace org](https://github.com/Nounspace/).

## Code Design

The Nounspace App follows the Atomic Design Pattern
![atomic_design](https://github.com/Nounspace/nounspace.ts/assets/7180740/2c892612-c730-4e74-bd32-3e7a8a6babbb)

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
nounspace is released under the GPL-3.0 License. Feel free to fork and modify the project—just be sure any version you release uses the GPL-3.0 License too.

**Made with ❤️ by the Nounspace team & community.**
Questions or feedback? Create a [Github issue](https://github.com/Nounspace/nounspace.ts/issues) or contact us in [Discord](https://discord.gg/eYQeXU2WuH)
