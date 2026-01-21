import { SpaceConfig } from "@/app/(spaces)/Space";
import { INITIAL_SPACE_CONFIG_EMPTY } from "../../initialSpaceConfig";
import { getNetworkWithId } from "@/common/lib/utils/networks";
import { EtherScanChainName } from "../../../constants/etherscanChainIds";
import { getGeckoUrl } from "@/common/lib/utils/links";
import { Address } from "viem";
import { getLayoutConfig } from "@/common/utils/layoutFormatUtils";
import { deepClone } from "@/common/lib/utils/deepClone";

export const createInitialTokenSpaceConfigForAddress = (
  address: string,
  castHash: string | null,
  casterFid: string | null,
  symbol: string,
  isClankerToken: boolean,
  network: EtherScanChainName = "base",
  ownerAddress?: Address,
): Omit<SpaceConfig, "isEditable"> => {
  const config = deepClone(INITIAL_SPACE_CONFIG_EMPTY);

  config.fidgetInstanceDatums = {
    "Swap:f9e0259a-4524-4b37-a261-9f3be26d4af1": {
      config: {
        data: {},
        editable: true,
        settings: {
          defaultBuyToken: address,
          defaultSellToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          fromChain: getNetworkWithId(network),
          toChain: getNetworkWithId(network),
          size: 0.8,
        },
      },
      fidgetType: "Swap",
      id: "Swap:f9e0259a-4524-4b37-a261-9f3be26d4af1",
    },
    ...(isClankerToken &&
      castHash &&
      casterFid &&
      castHash !== "clank.fun deployment" && {
        "cast:9c63b80e-bd46-4c8e-9e4e-c6facc41bf71": {
          config: {
            data: {},
            editable: true,
            settings: {
              background: "var(--user-theme-fidget-background)",
              castHash: castHash,
              casterFid: casterFid,
              fidgetBorderColor: "var(--user-theme-fidget-border-color)",
              fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
              fidgetShadow: "var(--user-theme-fidget-shadow)",
            },
          },
          fidgetType: "cast",
          id: "cast:9c63b80e-bd46-4c8e-9e4e-c6facc41bf71",
        },
      }),
    "feed:3de67742-56f2-402c-b751-7e769cdcfc56": {
      config: {
        data: {},
        editable: true,
        settings: {
          Xhandle: "thenounspace",
          background: "var(--user-theme-fidget-background)",
          feedType: "filter",
          keyword: `$${symbol}`,
          fidgetBorderColor: "var(--user-theme-fidget-border-color)",
          fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
          fidgetShadow: "var(--user-theme-fidget-shadow)",
          filterType: "keyword",
          fontColor: "var(--user-theme-font-color)",
          fontFamily: "var(--user-theme-font)",
        },
      },
      fidgetType: "feed",
      id: "feed:3de67742-56f2-402c-b751-7e769cdcfc56",
    },
    "Market:733222fa-38f8-4343-9fa2-6646bb47dde0": {
      config: {
        data: {},
        editable: true,
        settings: {
          background: "var(--user-theme-fidget-background)",
          fidgetBorderColor: "var(--user-theme-fidget-border-color)",
          fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
          fidgetShadow: "var(--user-theme-fidget-shadow)",
          chain: getNetworkWithId(network),
          token: address,
          dataSource: "geckoterminal",
          theme: "light",
          size: 1,
        },
      },

      fidgetType: "Market",
      id: "Market:733222fa-38f8-4343-9fa2-6646bb47dde0",
    },
    "links:5b4c8b73-416d-4842-9dc5-12fc186d8f57": {
      config: {
        data: {},
        editable: true,
        settings: {
          DescriptionColor: "black",
          HeaderColor: "black",
          background: "rgba(255, 255, 255, 0.5)",
          css: "",
          fidgetBorderColor: "var(--user-theme-fidget-border-color)",
          fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
          fidgetShadow: "var(--user-theme-fidget-shadow)",
          headingsFontFamily: "'__Inter_d65c78', '__Inter_Fallback_d65c78'",
          itemBackground: "#e0eeff",
          links: [
            ...(isClankerToken
              ? [
                  {
                    avatar:
                      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAM1BMVEX////q5PfUxe7o4fbMu+uPadTGs+jKueqJYNHEseiJYtKOZ9PJt+rUx+7MuuvPwOvm3vVnLuiEAAAAXUlEQVR4Ac3QAxaAQAAE0LXR/S+bXdNDWuOvSSGBMsYhCikVRG2MxejcFZoHcXoDQCF9gBiMURC1cfYzpDFSiEnKAHF6w4TuiMscs0bt+69JQyW8VyvkOVeH6p/QAF54BSckEkJ8AAAAAElFTkSuQmCC",
                    description: "",
                    text: "Clanker.world",
                    url: `https://www.clanker.world/clanker/${address}`,
                  },
                ]
              : []),
            {
              avatar:
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Ljc3Nzc3Nzg3Nzc3NzctKzc3Nzc3Nzc3Kzc3Nzc3Nzc3ODc3Nzc3Nys3N//AABEIABwAHAMBIgACEQEDEQH/xAAaAAABBQEAAAAAAAAAAAAAAAAHAgQFBggD/8QAKRAAAgEDAgQFBQAAAAAAAAAAAQIDAAURBDEGEiFREyJBccEHFKHR8P/EABgBAAIDAAAAAAAAAAAAAAAAAAIDAQQF/8QAHhEAAQQDAAMAAAAAAAAAAAAAAgABAxEEEiETQVH/2gAMAwEAAhEDEQA/ABZGperdZOBdRcYQ87SpI4ykMcfM2O5HxTbgPQQ6ozayXDNAwCIdgd8n4o4/TZJ5LNNrdVpmgaedhEHGHMa4AJ925j7YrekIYofI7WnuVMs/3zhi4WdpDPEJIY3MbTRMHVG6eV8E8jdR5WwagmBBxR6v3FMV5F5suj0/2ulaR4JplQBpzjDMD+O+3WgHqX8Od05geViMjY0stmBiNqtRfOrvYb3PaNWJYTlT0dDs47H9+lGvhLjKRLa7W9hNC4OI5D1gf+9NjvWeSxpxBrJ4VYRyFQRg4O4qvDliw6SNYoNr46vfGHE6xNJpdFJmRifFlXv6gfJoftJzMSaS7s5yxyaTScnLKcr9Ib+L/9k=",
              description: "",
              text: "GeckoTerminal",
              url: getGeckoUrl(address as Address, network),
            },
            {
              avatar:
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAEGElEQVR4AbWWA5AcXRSFX2ytbe/+DNccx6vYtm3bTjm2jUGyVg/CRmzb6dwXdO12LaYHt+oMu/s797zbQMYWy7JVMzIyYkaPHjstOTlln1SmKBCJpDfFYukNqUxe2D459cCwESOmnz17Nh62rY4sVXfu3LGZOHHiJIlUdsfG1v577Tr12PLUyMaOFUuk9ydPnjqNJEl7k8HQRZWVK1f2a9Y8/GmduvU5gLHC+zRr3uL50uXLB+P0BMFfvnzZqHvPXkegY8Fgvho2smW79ehx8vXr17bGRu4qkyl05oL5kkikV+7fv+9RYecyOQe3uKRyBTZhV+aa9+7d95CloXx179HrRKkzsWLF6t4wwd/NBSQmibW7d+9OP3DgSFuscRMmbIY5KDETK1asGFQCjgckPDzysSU63LNnT2f+9SMqKuZ98W2aNw9//ubNGwduo6lTp46rW6+BRSI+efJkMuJVTEzca/4pOmHSpKnc2sNwMEIgdvaObOs2bTPaJaccxFK0bFXQoKGN0QawRCLJPWBXQ3B5Dbe1cxC09smpaSdh50rFYq4sb9kqV4gB3ARUMBo9evQkoTF36dJ1Ix+SnJy6V4iB6OjYV2CgAUpLS99dTtTf/fwDPvv5B3729PT+CmtnEQNOzq7fVq9e3QnhgqteXmlwX1//L0eOHGkFLp2x4CLlDXfBU+YawMs9d+78idyfIrGk1AFMSEy6iXi1YMGigeYYcHRy+Y6n/8/8qAiyK0qCe3qpBhJENxCvli1b1s9UAz4+fp8XLFo0/A9cSVxvqSq6rkVSqVxnbQPDho2gt27dKvvzPeMyFaYirj9TEuRF1LZd8hFrG4Cunf58Vhbd8FIR1E2InwUTO9CAQYPmW9kAVxcIOgDAzC84SEtORAcOH5bBZdgiBmDC2UKtNrE0uJKgoyDyhxwcS8tE43jqRsfEPjfXwPLly6fjO2op8VeCqIcC/GNxOHy/m5+fXw3hGjhw8HIhBrp3774GGVFKLekGsMMYyJdaS07nNtTr9b4BgcEfStzXE0UM4tWuXbu6QNRnzp8/H1oe2GBgq8P6DgTQ89Lg0P3Ls3rGkXeRWTA8MCjko5u757d//v3//dix45aUFmd54N1wZwVwK1UReYkH5WtUWY9ljiAvUH0koHYbDNXVBNlLWXSdqAAM3V+/cPw4WQOZWziN8zqqsVpLLeFNdzmibmYS11xNhp7SauvAQeJVWnoexHzZOCh3zt/O0FJhRsM2wimiKSRDNFo6WU1Qs2FqVXCgN4KgHJzKO1fIeCIhhc9RiHYCOH8rHMrpA+w/L/POnVrI1FLnUu5woGWg1wLA7yC1DcpLlB+yVGWTZH2NlkmBjtbCwTNg6h/BHHwF2FeY/qdwtcuB/zapdXSnzEt3bJCR9QPwKOxl9MLyXAAAAABJRU5ErkJggg==",
              description: "",
              text: "BaseScan",
              url: `https://basescan.org/address/${address}`,
            },
          ],
          title: `$${symbol} Links`,
          viewMode: "list",
        },
      },
      fidgetType: "links",
      id: "links:5b4c8b73-416d-4842-9dc5-12fc186d8f57",
    },
    "Chat:09528872-6659-460e-bb25-0c200cccb0ec": {
      config: {
        data: {},
        editable: true,
        settings: {
          background: "var(--user-theme-fidget-background)",
          fidgetBorderColor: "var(--user-theme-fidget-border-color)",
          fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
          fidgetShadow: "var(--user-theme-fidget-shadow)",
          roomName: address,
          roomOwnerAddress: ownerAddress ?? "",
        },
      },
      fidgetType: "Chat",
      id: "Chat:09528872-6659-460e-bb25-0c200cccb0ec",
    },
  };

  const newLayout = isClankerToken &&
    castHash &&
    casterFid &&
    castHash !== "clank.fun deployment"
      ? [
          {
            h: 6,
            i: "Chat:09528872-6659-460e-bb25-0c200cccb0ec",
            maxH: 36,
            maxW: 36,
            minH: 2,
            minW: 2,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 4,
            y: 4,
          },
          {
            h: 8,
            i: "feed:3de67742-56f2-402c-b751-7e769cdcfc56",
            maxH: 36,
            maxW: 36,
            minH: 2,
            minW: 4,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 8,
            y: 0,
          },
          {
            h: 5,
            i: "Swap:f9e0259a-4524-4b37-a261-9f3be26d4af1",
            maxH: 36,
            maxW: 36,
            minH: 3,
            minW: 2,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 0,
            y: 5,
          },
          {
            h: 5,
            i: "Market:733222fa-38f8-4343-9fa2-6646bb47dde0",
            maxH: 36,
            maxW: 36,
            minH: 2,
            minW: 2,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 0,
            y: 0,
          },
          {
            h: 2,
            i: "links:5b4c8b73-416d-4842-9dc5-12fc186d8f57",
            maxH: 36,
            maxW: 36,
            minH: 2,
            minW: 2,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 8,
            y: 8,
          },
          {
            h: 4,
            i: "cast:9c63b80e-bd46-4c8e-9e4e-c6facc41bf71",
            maxH: 4,
            maxW: 12,
            minH: 1,
            minW: 3,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 4,
            y: 0,
          },
        ]
      : [
          {
            h: 8,
            i: "Chat:09528872-6659-460e-bb25-0c200cccb0ec",
            maxH: 36,
            maxW: 36,
            minH: 2,
            minW: 2,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 4,
            y: 0,
          },
          {
            h: 2,
            i: "links:5b4c8b73-416d-4842-9dc5-12fc186d8f57",
            maxH: 36,
            maxW: 36,
            minH: 2,
            minW: 2,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 4,
            y: 8,
          },
          {
            h: 10,
            i: "feed:3de67742-56f2-402c-b751-7e769cdcfc56",
            maxH: 36,
            maxW: 36,
            minH: 2,
            minW: 4,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 8,
            y: 0,
          },
          {
            h: 5,
            i: "Market:733222fa-38f8-4343-9fa2-6646bb47dde0",
            maxH: 36,
            maxW: 36,
            minH: 2,
            minW: 2,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 0,
            y: 0,
          },
          {
            h: 5,
            i: "Swap:f9e0259a-4524-4b37-a261-9f3be26d4af1",
            maxH: 36,
            maxW: 36,
            minH: 3,
            minW: 2,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 0,
            y: 5,
          },
        ];

  // Set the layout configuration
  const layoutConfig = getLayoutConfig(config.layoutDetails);
  layoutConfig.layout = newLayout;

  config.theme = {
    id: "default",
    name: "Default",
    properties: {
      background: "#ffffff",
      backgroundHTML: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Aurora Borealis (Light Theme)</title>
          <style>
            /* 1. Page Reset & Lighter Background */
            body {
              margin: 0;
              height: 100vh;
              /* A subtle sky-like gradient */
              background: linear-gradient(180deg, #eef9ff, #dbeffd);
              overflow: hidden;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: Arial, sans-serif;
              color: #333; /* darker text for contrast */
              position: relative;
            }

            /* 2. Aurora Gradient (Pastel & Blurred) */
            .aurora {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: linear-gradient(
                120deg,
                rgba(102, 178, 255, 0.4),
                rgba(102, 255, 178, 0.4),
                rgba(255, 153, 255, 0.4),
                rgba(153, 204, 255, 0.4)
              );
              background-size: 200% 200%;
              animation: aurora 10s infinite ease-in-out;
              /* A gentle blur to enhance the glow effect */
              filter: blur(40px);
            }

            @keyframes aurora {
              0% {
                background-position: 0% 50%;
              }
              50% {
                background-position: 100% 50%;
              }
              100% {
                background-position: 0% 50%;
              }
            }

            /* 3. Optional Content Layer (above the aurora) */
            .content {
              /* z-index: 1; */
              text-align: center;
              position: relative;
            }

            .content h1 {
              font-size: 3rem;
              margin: 0;
              color: #006070; /* teal-ish for a calmer look */
            }

            .content p {
              font-size: 1.5rem;
              margin: 10px 0 0;
              color: #009688;
            }

            /* 4. Light, Subtle Overlay */
            /* Using white in the radial gradient for a more diffused look */
            .overlay {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: radial-gradient(circle, rgba(255, 255, 255, 0) 35%, rgba(255, 255, 255, 0.3) 100%);
              pointer-events: none;
              /* z-index: 0;*/
            }
          </style>
        </head>
        <body>
          <div class="aurora"></div>
          <div class="overlay"></div>
        </body>
        </html>
      `,
      fidgetBackground: "#ffffffb0", // equivalent to rgba(255, 255, 255, 0.69)
      fidgetBorderColor: "#eeeeee", // equivalent to rgba(238, 238, 238, 1)
      fidgetBorderWidth: "0",
      fidgetShadow: "none",
      font: "Inter",
      fontColor: "#000000",
      headingsFont: "Inter",
      headingsFontColor: "#000000",
      musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804",
      fidgetBorderRadius: "12px",
      gridSpacing: "16",
    },
  };

  return config;
};

export default createInitialTokenSpaceConfigForAddress;
