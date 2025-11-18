export const clankerHomePage = {
  defaultTab: "Clank",
  tabOrder: ["Clank", "Socials", "Docs"],
  tabs: {
    Clank: {
      name: "lank",
      displayName: "Clank",
      layoutID: "d99e0194-d32e-42da-94b9-d110097e7b05",
      layoutDetails: {
        layoutConfig: {
          layout: [
            {
              h: 10,
              i: "iframe:6b9e0d0a-30e4-4bf1-9d54-e96f465e63c6",
              isBounded: false,
              maxH: 36,
              maxW: 36,
              minH: 2,
              minW: 2,
              moved: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              static: false,
              w: 12,
              x: 0,
              y: 0
            }
          ]
        },
        layoutFidget: "grid"
      },
      theme: {
        id: "Default",
        name: "Default",
        properties: {
          background: "#ffffff",
          backgroundHTML: "",
          fidgetBackground: "#ffffff",
          fidgetBorderColor: "#eeeeee",
          fidgetBorderRadius: "0px",
          fidgetBorderWidth: "1px",
          fidgetShadow: "none",
          font: "Inter",
          fontColor: "#000000",
          gridSpacing: "0",
          headingsFont: "Inter",
          headingsFontColor: "#000000",
          musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804"
        }
      },
      fidgetInstanceDatums: {
        "iframe:6b9e0d0a-30e4-4bf1-9d54-e96f465e63c6": {
          config: {
            data: {},
            editable: true,
            settings: {
              background: "var(--user-theme-fidget-background)",
              cropOffsetX: 0,
              cropOffsetY: 0,
              fidgetBorderColor: "var(--user-theme-fidget-border-color)",
              fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
              fidgetShadow: "var(--user-theme-fidget-shadow)",
              isScrollable: false,
              showOnMobile: true,
              url: "https://www.clanker.world"
            }
          },
          fidgetType: "iframe",
          id: "iframe:6b9e0d0a-30e4-4bf1-9d54-e96f465e63c6"
        }
      },
      fidgetTrayContents: [],
      isEditable: false,
      timestamp: "2025-11-06T20:36:32.148Z"
    },
    Socials: {
      name: "social",
      displayName: "Social",
      layoutID: "e83d3c76-dcda-48e1-9537-8313403d38cc",
      layoutDetails: {
        layoutConfig: {
          layout: [
            {
              w: 6,
              h: 10,
              x: 0,
              y: 0,
              i: "feed:d637f537-e22d-4f1d-88d8-4a62592571c3",
              minW: 4,
              maxW: 36,
              minH: 2,
              maxH: 36,
              moved: false,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false
            },
            {
              w: 6,
              h: 6,
              x: 6,
              y: 0,
              i: "feed:9c39372e-8c76-4c1e-9e15-6a5c6a609e24",
              minW: 4,
              maxW: 36,
              minH: 2,
              maxH: 36,
              moved: false,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false
            },
            {
              w: 2,
              h: 4,
              x: 10,
              y: 6,
              i: "links:c37310f3-d1af-45b6-8d30-9febd8cb9df1",
              minW: 2,
              maxW: 36,
              minH: 2,
              maxH: 36,
              moved: false,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false
            },
            {
              w: 4,
              h: 4,
              x: 6,
              y: 6,
              i: "feed:8343cda3-6319-4337-ba43-b053ebd5bb72",
              minW: 4,
              maxW: 36,
              minH: 2,
              maxH: 36,
              moved: false,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false
            }
          ]
        },
        layoutFidget: "grid"
      },
      theme: {
        id: "Clanker",
        name: "Clanker",
        properties: {
          background: "rgba(135, 100, 210, 1)",
          backgroundHTML: "",
          fidgetBackground: "#ffffff",
          fidgetBorderColor: "rgb(103, 41, 179)",
          fidgetBorderRadius: "12px",
          fidgetBorderWidth: "4px",
          fidgetShadow: "0 4px 8px rgba(0,0,0,0.25)",
          font: "Roboto Mono",
          fontColor: "#000000",
          gridSpacing: "23",
          headingsFont: "Roboto",
          headingsFontColor: "#000000",
          musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804"
        }
      },
      fidgetInstanceDatums: {
        "feed:8343cda3-6319-4337-ba43-b053ebd5bb72": {
          config: {
            data: {},
            editable: true,
            settings: {
              Xhandle: "thenounspace",
              background: "var(--user-theme-fidget-background)",
              channel: "",
              feedType: "filter",
              fidgetBorderColor: "var(--user-theme-fidget-border-color)",
              fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
              fidgetShadow: "var(--user-theme-fidget-shadow)",
              filterType: "fids",
              fontColor: "var(--user-theme-font-color)",
              fontFamily: "var(--user-theme-font)",
              keyword: "clanker",
              selectPlatform: {
                icon: "/images/farcaster.jpeg",
                name: "Farcaster"
              },
              showOnMobile: true,
              style: "light",
              username: "clanker",
              users: ""
            }
          },
          fidgetType: "feed",
          id: "feed:8343cda3-6319-4337-ba43-b053ebd5bb72"
        },
        "feed:9c39372e-8c76-4c1e-9e15-6a5c6a609e24": {
          config: {
            data: {},
            editable: true,
            settings: {
              Xhandle: "thenounspace",
              background: "var(--user-theme-fidget-background)",
              channel: "clanker",
              feedType: "filter",
              fidgetBorderColor: "var(--user-theme-fidget-border-color)",
              fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
              fidgetShadow: "var(--user-theme-fidget-shadow)",
              filterType: "channel_id",
              fontColor: "var(--user-theme-font-color)",
              fontFamily: "var(--user-theme-font)",
              keyword: "",
              selectPlatform: {
                icon: "/images/farcaster.jpeg",
                name: "Farcaster"
              },
              showOnMobile: true,
              style: "light",
              username: "",
              users: ""
            }
          },
          fidgetType: "feed",
          id: "feed:9c39372e-8c76-4c1e-9e15-6a5c6a609e24"
        },
        "feed:d637f537-e22d-4f1d-88d8-4a62592571c3": {
          config: {
            data: {},
            editable: true,
            settings: {
              Xhandle: "thenounspace",
              background: "var(--user-theme-fidget-background)",
              channel: "clankers",
              feedType: "filter",
              fidgetBorderColor: "var(--user-theme-fidget-border-color)",
              fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
              fidgetShadow: "var(--user-theme-fidget-shadow)",
              filterType: "channel_id",
              fontColor: "var(--user-theme-font-color)",
              fontFamily: "var(--user-theme-font)",
              keyword: "",
              selectPlatform: {
                icon: "/images/farcaster.jpeg",
                name: "Farcaster"
              },
              showOnMobile: true,
              style: "light",
              username: "",
              users: ""
            }
          },
          fidgetType: "feed",
          id: "feed:d637f537-e22d-4f1d-88d8-4a62592571c3"
        },
        "links:c37310f3-d1af-45b6-8d30-9febd8cb9df1": {
          config: {
            data: {},
            editable: true,
            settings: {
              DescriptionColor: "var(--user-theme-font-color)",
              HeaderColor: "var(--user-theme-headings-font-color)",
              background: "var(--user-theme-fidget-background)",
              css: "",
              fidgetBorderColor: "var(--user-theme-fidget-border-color)",
              fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
              fidgetShadow: "var(--user-theme-fidget-shadow)",
              fontFamily: "Theme Font",
              headingsFontFamily: "var(--user-theme-headings-font)",
              itemBackground: "var(--user-theme-fidget-background)",
              links: [
                {
                  avatar:
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAAAAABXZoBIAAAA/0lEQVR4AbXPIazCMACE4d+L2qoZFEGSIGcRc/gJJB5XMzGJmK9EN0HMi+qaibkKVF1txdQe4g0YzPK5yyWXHL9TaPNQ89LojH87N1rbJcXkMF4Fk31UMrf34hm14KUeoQxGArALHTMuQD2cAWQfJXOpgTbksGr9ng8qluShJTPhyCdx63POg7rEim95ZyR68I1ggQpnCEGwyPicw6hZtPEGmnhkycqOio1zm6XuFtyw5XDXfGvuau0dXHzJp8pfBPuhIXO9ZK5ILUCdSvLYMpc6ASBtl3EaC97I4KaFaOCaBE9Zn5jUsVqR2vcTJZO1DdbGoZryVp94Ka/mQfE7f2T3df0WBhLDAAAAAElFTkSuQmCC",
                  description: "",
                  text: "@clankeronbase",
                  url: "https://x.com/clankeronbase"
                },
                {
                  avatar: "/images/farcaster.jpeg",
                  description: "",
                  text: "@clanker",
                  url: "https://farcaster.xyz/clanker"
                },
                {
                  avatar: "/images/farcaster.jpeg",
                  description: "",
                  text: "/clanker",
                  url: "https://farcaster.xyz/~/channel/clanker"
                },
                {
                  avatar: "/images/farcaster.jpeg",
                  description: "",
                  text: "/clankers",
                  url: "https://farcaster.xyz/~/channel/clankers"
                }
              ],
              showOnMobile: true,
              title: "",
              viewMode: "list"
            }
          },
          fidgetType: "links",
          id: "links:c37310f3-d1af-45b6-8d30-9febd8cb9df1"
        }
      },
      fidgetTrayContents: [],
      isEditable: false,
      timestamp: "2025-11-06T20:36:45.381Z"
    },
    Docs: {
      name: "docs",
      displayName: "Docs",
      layoutID: "60a345e4-6c97-4ce8-8bd8-daa3965a576a",
      layoutDetails: {
        layoutConfig: {
          layout: [
            {
              w: 12,
              h: 10,
              x: 0,
              y: 0,
              i: "iframe:1c3fcd3d-7c7d-4c3f-920c-8ab48460eb4e",
              minW: 2,
              maxW: 36,
              minH: 2,
              maxH: 36,
              moved: false,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false
            }
          ]
        },
        layoutFidget: "grid"
      },
      theme: {
        id: "Default",
        name: "Default",
        properties: {
          background: "#ffffff",
          backgroundHTML: "",
          fidgetBackground: "#ffffff",
          fidgetBorderColor: "#eeeeee",
          fidgetBorderRadius: "0px",
          fidgetBorderWidth: "1px",
          fidgetShadow: "none",
          font: "Inter",
          fontColor: "#000000",
          gridSpacing: "0",
          headingsFont: "Inter",
          headingsFontColor: "#000000",
          musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804"
        }
      },
      fidgetInstanceDatums: {
        "iframe:1c3fcd3d-7c7d-4c3f-920c-8ab48460eb4e": {
          config: {
            data: {},
            editable: true,
            settings: {
              background: "var(--user-theme-fidget-background)",
              cropOffsetX: 0,
              cropOffsetY: 0,
              embedScript: `<iframe src="https://clanker.gitbook.io/clanker-documentation"
        width="100%"
        height="100%"
        allowfullscreen>
</iframe>`,
              fidgetBorderColor: "var(--user-theme-fidget-border-color)",
              fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
              fidgetShadow: "var(--user-theme-fidget-shadow)",
              isScrollable: false,
              showOnMobile: true,
              url: ""
            }
          },
          fidgetType: "iframe",
          id: "iframe:1c3fcd3d-7c7d-4c3f-920c-8ab48460eb4e"
        }
      },
      fidgetTrayContents: [],
      isEditable: false,
      timestamp: "2025-11-06T20:37:03.565Z"
    }
  }
};
