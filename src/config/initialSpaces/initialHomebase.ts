import { SpaceConfig } from "@/app/(spaces)/Space";
import DEFAULT_THEME from "@/common/lib/theme/defaultTheme";

const tutorialText = `
### Click the button above to open Customization Mode

### Add Fidgets or Mini Apps
1. Click an empty spot on your grid
2. Select a fidget or mini app

### Customize Fidgets
1. From customization mode, click any Fidget on the grid to open its settings.
2. Click 'Style' to customize a fidget's look. Any Fidget styles set to "Theme" inherit their look from the Tab's theme.  

![EditFidget](https://space.mypinata.cloud/ipfs/bafybeihcjkbcljxr4ttgt6xcxmsc4m4qvw62hkolifmd3t5pdc7kvj5nji)

### Arrange Fidgets
- **Move:** Drag from the center
![move fidget](https://space.mypinata.cloud/ipfs/QmYWvdpdiyKwjVAqjhcFTBkiTUnc8rF4p2EGg3C4sTRsr6)
- **Resize:** Drag from an edge or corner
![Resize Fidget](https://space.mypinata.cloud/ipfs/bafybeifmssfizx5xjmmqyc6wwqxgs2xdhhbdtnvldtj276mfdul3eacmwu)
- **Stash in Fidget Tray:** Click a fidget then click ⇱ to save it for later.
![image](https://space.mypinata.cloud/ipfs/bafkreigy7ymnuwertvr6bn4bmwfe3vu3vvw4r6ekkzv6prs4zwlibsjtya)
- **Delete:** Click a fidget then click X it to delete it forever.
![image](https://space.mypinata.cloud/ipfs/bafkreieucvjlovm7wq5ftcvvvcv52sujnqqjwji5epoigb2ycumhmgrtfy)

### Customize Theme
- **Templates:** Select a pre-made Theme. Then, customize it further to make it your own.
- **Style:** Set a background color for the Tab, or set the default styles for all Fidgets on the Tab.
- **Fonts:** Set the default header and body fonts for Fidgets on the Tab.
- **Code:** Add HTML/CSS to fully customize the Tab's background, or generate a custom background with a prompt. 

![Edit Theme2](https://space.mypinata.cloud/ipfs/bafybeietizt4vgyaiv62ytn25ztanusjmbcw6iwm3v2gedcpipr6koxh3e)

### Customize Music
Add a soundtrack to each Tab. Search for or paste the link to any song or playlist on YouTube, or select a music NFT.

![customize music](https://space.mypinata.cloud/ipfs/bafkreigtslrp3kjj42gp25bxd5nubs47qx22ivj3pkm3tc7j3fbqt3b5hy)

### Homebase vs. Space
**Your Space** is your public profile that everyone can see.
**Your Homebase** is a private dashboard that only you can see.

You can use the same tricks and Fidgets to customize them both. Use your **Homebase** to access the content, communities, and functionality you love, and use your **Space** to share the content and functionality you love with your friends.

### Questions or feedback?

Tag [@nounspacetom](https://nounspace.com/s/nounspacetom) in a cast or join our [Discord](https://discord.gg/H8EYnEmj6q).

### Happy customizing!
`;
const onboardingFidgetID = "text:onboarding";
const onboardingFidgetConfig = {
  config: {
    editable: true,
    settings: {
      title: "",
      text: tutorialText,
      urlColor: "blue",
      fontFamily: "Londrina Solid",
      fontColor: "#073b4c",
      headingsFontFamily: "Londrina Solid",
      headingsFontColor: "#2563ea",
      backgroundColor: "#06d6a0",
      borderColor: "#ffd166",
    },
    data: {},
  },
  fidgetType: "text",
  id: onboardingFidgetID,
};

const layoutID = "";
const INITIAL_HOMEBASE_CONFIG: SpaceConfig = {
  layoutID,
  layoutDetails: {
    layoutConfig: {
      layout: [
        // Existing layouts can go here, e.g., feed, profile, etc.
        {
          w: 6,
          h: 7,
          x: 0,
          y: 0,
          i: onboardingFidgetID,
          moved: false,
          static: false,
        },
      ],
    },
    layoutFidget: "grid",
  },
  theme: DEFAULT_THEME,
  fidgetInstanceDatums: {
    [onboardingFidgetID]: onboardingFidgetConfig,
  },
  isEditable: false,
  fidgetTrayContents: [],
};

export default INITIAL_HOMEBASE_CONFIG;
