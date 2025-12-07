export const nounsHomePage = {
  defaultTab: "Nouns",
  tabOrder: ["Nouns", "Social", "Governance", "Resources", "Funded Works", "Places"],
  tabs: {
    "Nouns": {
      name: "Nouns",
      displayName: "Nouns",
      layoutID: "88b78f73-37fb-4921-9410-bc298311c0bb",
      layoutDetails: {
        layoutConfig: {
          layout: [
            {
              w: 12, h: 10, x: 0, y: 0,
              i: "nounsHome:3a8d7f19-3e77-4c2b-9c7f-1a6f5f5a6f01",
              minW: 2, maxW: 36, minH: 2, maxH: 36,
              moved: false, static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false
            }
          ]
        },
        layoutFidget: "grid"
      },
      theme: {
        id: "Homebase-Tab 4 - 1-Theme",
        name: "Homebase-Tab 4 - 1-Theme",
        properties: {
          background: "#ffffff",
          backgroundHTML: "",
          fidgetBackground: "#ffffff",
          fidgetBorderColor: "#eeeeee",
          fidgetBorderRadius: "0px",
          fidgetBorderWidth: "0px",
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
        "nounsHome:3a8d7f19-3e77-4c2b-9c7f-1a6f5f5a6f01": {
          config: {
            data: {},
            editable: true,
            settings: {
              background: "var(--user-theme-fidget-background)",
              fidgetBorderColor: "var(--user-theme-fidget-border-color)",
              fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
              fidgetShadow: "var(--user-theme-fidget-shadow)",
              showOnMobile: true,
              isScrollable: true,
              headingsFontFamily: "Londrina Solid",
              fontFamily: "Poppins"
            }
          },
          fidgetType: "nounsHome",
          id: "nounsHome:3a8d7f19-3e77-4c2b-9c7f-1a6f5f5a6f01"
        }
      },
      fidgetTrayContents: [],
      isEditable: false,
      timestamp: "2025-06-20T05:58:44.080Z"
    },
    "Social": {
      name: "Social",
      displayName: "Social",
      layoutID: "48073f43-70dd-459c-be6d-e31ac89f267f",
      layoutDetails: {
        layoutConfig: {
          layout: [
            {
              w: 8,
              h: 10,
              x: 0,
              y: 0,
              i: "feed:9f8f8e69-6323-4e7d-8f9a-210f522827f7",
              minW: 4,
              maxW: 36,
              minH: 2,
              maxH: 36,
              moved: false,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false,
            },
            {
              w: 4,
              h: 4,
              x: 8,
              y: 6,
              i: "links:c96c96c9-c19d-47c7-b24d-b11985671470",
              minW: 2,
              maxW: 36,
              minH: 2,
              maxH: 36,
              moved: false,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false,
            },
            {
              w: 4,
              h: 6,
              x: 8,
              y: 0,
              i: "feed:Ns29YIhpl9SWpf5O36d2",
              minW: 2,
              maxW: 36,
              minH: 2,
              maxH: 36,
              moved: false,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false,
            },
          ],
        },
        layoutFidget: "grid",
      },
      theme: {
        id: "Homebase-Tab 3-Theme",
        name: "Homebase-Tab 3-Theme",
        properties: {
          background: "#ffffff",
          backgroundHTML: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Nouns DAO Animated Background</title>
  <style>
    html,body{height:100%;margin:0;overflow:hidden;}
    body{
      position:relative;
      background:linear-gradient(160deg,#FCCD04 0%,#E80173 20%,#45AAF2 40%,#23D160 60%,#FDB900 80%,#C8A2C8 100%);
      background-size:400% 400%;
      animation:gradientFlow 30s ease-in-out infinite;
    }
    body::before,
    body::after{
      content:"";
      position:absolute;
      left:0;
      right:0;
      bottom:-15%;
      height:200%;
      background-image:url("https://nouns.wtf/brand-assets/color_noggles.png");
      background-repeat:repeat-x;
      background-size:60px 60px;
      opacity:0.6;
      animation:floatUp 20s linear infinite;
    }
    body::after{
      bottom:-30%;
      background-size:40px 40px;
      opacity:0.4;
      animation-duration:25s;
      animation-direction:reverse;
    }
    @keyframes gradientFlow{
      0%{background-position:0% 50%;}
      50%{background-position:100% 50%;}
      100%{background-position:0% 50%;}
    }
    @keyframes floatUp{
      from{transform:translateY(0);}
      to{transform:translateY(-50%);}
    }
  </style>
</head>
<body></body>
</html>`,
          fidgetBackground: "#ffffff",
          fidgetBorderColor: "#eeeeee",
          fidgetBorderRadius: "12px",
          fidgetBorderWidth: "1px",
          fidgetShadow: "none",
          font: "Inter",
          fontColor: "#000000",
          gridSpacing: "16",
          headingsFont: "Inter",
          headingsFontColor: "#000000",
          musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804",
        },
      },
      fidgetInstanceDatums: {
        "feed:9f8f8e69-6323-4e7d-8f9a-210f522827f7": {
          config: {
            data: {},
            editable: true,
            settings: {
              Xhandle: "thenounspace",
              background: "var(--user-theme-fidget-background)",
              channel: "nouns",
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
                name: "Farcaster",
              },
              showOnMobile: true,
              style: "light",
              username: "",
              users: "",
            },
          },
          fidgetType: "feed",
          id: "feed:9f8f8e69-6323-4e7d-8f9a-210f522827f7",
        },
        "links:c96c96c9-c19d-47c7-b24d-b11985671470": {
          id: "links:c96c96c9-c19d-47c7-b24d-b11985671470",
          fidgetType: "links",
          config: {
            data: {},
            editable: true,
            settings: {
              showOnMobile: true,
              title: "Socials",
              links: [
                {
                  avatar:
                    "data:image/webp;base64,UklGRjwDAABXRUJQVlA4IDADAAAwEwCdASozADMAPjEOjEYiEREJgCADBLSACvAP4B1T+gX7tewH7b7oB5Bfpx86/Hf8rtYJ/gv8+/KjJh/5b8t+FX/gPUh/Mf7zxg0d3nBfyH9O/Lv2R/PP+t9wD+Nf0P/O/2f94P8T8kHrM/aL2Lv1OTvFCx/7T977b/Lxb0GppIsSCShxNPS4ejN2Tn2Gpsha3mMHbq7Qs5OMbf/HXssqIPwA/v+r8lxFe+i8+zEOmpnbq/gZJ9n/r/gyvizFRxlqP83vEb2tMrQvF7HQPwRbHqDnQ7/waPUr+H6qkSp88nrrBnY8Rn9a+VTSJyR1ZeqwigXOSIguFtM78A3xJRz9VXOw2YgJtm7V9YTW92mv3Hg9mhimC3F0bEih9tQcZsbkJWOORQ4YejsAENCRdVcV7VrALnmzdwMSsfLfadMuf9Bp+S0KsKfCmCJvqWNTwGn2Vs8L7szaXFxMe+qLL708+z6/vx3Hyz23wF0LZhLVT3R2hB9KnLAmnxiFfh9KIr3hgLPEapK7qAtT5Q+GQTbPXo34M7SDx8tXrJ7PNF89N4ITkuMKvE8RWoyL3g6ep/5j1Y+wiIteNZe/D6f5UUyE5q/6GJevQ+AqIrO7abTGIO5Td2xsjIRuV/jV5A36uRO/3PH6v/8cOlr8ZE4uzHNak98aet9a+7iP/6p3u6HvENLHt1y13LZ34IE+ImLfFf+zFJsAiafcSOUgc2GtRpxJP+vJK+3pr/VEnNk4qMaL3hSyYZTJ6ND++XiV5vMrdm72LcJzYaNIZZpsF5vxR2/lPW/R57fvlJszqeK4gmQ/lqM6WX22ypXI7OPAMihJygPEvWbI/5CW0uMO8Ah2hiPwM/i0fiB/R+HLGoDa19/vOlnbedr+0U79UhB9VKvoCB3FVr4lpU8t8fE+8LOWWg8KN4IA4jRDOHBm59LX1IzhYZWeRSBrp8UHanycHuqqFa8JUSbJp6pYuD9KsfQR+en+P+kjg7eYFwQ8X6055LrJLTr4Metf8JGluIXMfgg0zBLor1XQwO73rj3+7164syNPA0zWJycUZ0jX2DSoE1os8KWbqlVdC4Y6sFWKEoEAAAA=",
                  description: "",
                  text: "X",
                  url: "https://x.com/nounsdao?lang=en",
                },
                {
                  text: "Discord",
                  url: "https://discord.gg/TMDzKuf5",
                  avatar:
                    "https://play-lh.googleusercontent.com/0oO5sAneb9lJP6l8c6DH4aj6f85qNpplQVHmPmbbBxAukDnlO7DarDW0b-kEIHa8SQ=w240-h480-rw",
                  description: "",
                },
                {
                  text: "Instagram",
                  url: "https://www.instagram.com/nounish/?hl=en",
                  avatar: "https://upload.wikimedia.org/wikipedia/commons/9/95/Instagram_logo_2022.svg",
                  description: "",
                },
              ],
              viewMode: "list",
              headingsFontFamily: "'Londrina Solid', 'Londrina Solid Fallback'",
              fontFamily: "Theme Font",
              HeaderColor: "var(--user-theme-headings-font-color)",
              DescriptionColor: "var(--user-theme-font-color)",
              itemBackground: "var(--user-theme-fidget-background)",
              background: "var(--user-theme-fidget-background)",
              fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
              fidgetBorderColor: "var(--user-theme-fidget-border-color)",
              fidgetShadow: "var(--user-theme-fidget-shadow)",
              css: "",
            },
          },
        },
        "feed:Ns29YIhpl9SWpf5O36d2": {
          config: {
            data: {},
            editable: true,
            settings: {
              Xhandle: "",
              background: "var(--user-theme-fidget-background)",
              channel: "",
              feedType: "filter",
              fidgetBorderColor: "var(--user-theme-fidget-border-color)",
              fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
              fidgetShadow: "var(--user-theme-fidget-shadow)",
              filterType: "keyword",
              fontColor: "var(--user-theme-font-color)",
              fontFamily: "var(--user-theme-font)",
              keyword: "nounish",
              selectPlatform: {
                icon: "/images/farcaster.jpeg",
                name: "Farcaster",
              },
              showOnMobile: true,
              style: "light",
              username: "",
              users: "",
            },
          },
          fidgetType: "feed",
          id: "feed:Ns29YIhpl9SWpf5O36d2",
        },
      },
      fidgetTrayContents: [],
      isEditable: false,
      timestamp: "2025-06-20T09:51:46.060Z",
    },
    "Governance": {
      name: "Governance",
      displayName: "Governance",
      layoutID: "28dcce75-17c5-4c12-b5e2-8524ffc268cf",
      layoutDetails: {
        layoutConfig: {
          layout: [
            {
              w: 12,
              h: 10,
              x: 0,
              y: 0,
              i: "iframe:87e54ba3-9894-4ca6-9b75-3a67d9477af9",
              minW: 2,
              maxW: 36,
              minH: 2,
              maxH: 36,
              moved: false,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false,
            },
          ],
        },
        layoutFidget: "grid",
      },
      theme: {
        id: "Homebase-Tab 2 - 1-Theme",
        name: "Homebase-Tab 2 - 1-Theme",
        properties: {
          background: "#ffffff",
          backgroundHTML: "",
          fidgetBackground: "#ffffff",
          fidgetBorderColor: "#eeeeee",
          fidgetBorderRadius: "0px",
          fidgetBorderWidth: "0px",
          fidgetShadow: "none",
          font: "Inter",
          fontColor: "#000000",
          gridSpacing: "0",
          headingsFont: "Inter",
          headingsFontColor: "#000000",
          musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804",
        },
      },
      fidgetInstanceDatums: {
        "iframe:87e54ba3-9894-4ca6-9b75-3a67d9477af9": {
          id: "iframe:87e54ba3-9894-4ca6-9b75-3a67d9477af9",
          fidgetType: "iframe",
          config: {
            data: {},
            editable: true,
            settings: {
              url: "https://www.nouns.camp/?tab=proposals",
              cropOffsetX: 0,
              cropOffsetY: -3,
              isScrollable: false,
              showOnMobile: true,
              background: "var(--user-theme-fidget-background)",
              fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
              fidgetBorderColor: "var(--user-theme-fidget-border-color)",
              fidgetShadow: "var(--user-theme-fidget-shadow)",
            },
          },
        },
      },
      fidgetTrayContents: [],
      isEditable: false,
      timestamp: "2025-06-20T06:51:01.474Z",
    },
    "Resources": {
      name: "Resources",
      displayName: "Resources",
      layoutID: "0bbe52be-5c9e-4d87-ad76-bd4b114c790a",
      layoutDetails: {
        layoutConfig: {
          layout: [
            {
              w: 12,
              h: 10,
              x: 0,
              y: 0,
              i: "iframe:d06b525b-54ff-4074-bfa3-a39807e42738",
              minW: 2,
              maxW: 36,
              minH: 2,
              maxH: 36,
              moved: false,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false,
            },
          ],
        },
        layoutFidget: "grid",
      },
      theme: {
        id: "Homebase-Tab 3-Theme",
        name: "Homebase-Tab 3-Theme",
        properties: {
          font: "Londrina Solid",
          fontColor: "#333333",
          headingsFont: "Work Sans",
          headingsFontColor: "#000000",
          background: "#ffffff",
          backgroundHTML: "",
          musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804",
          fidgetBackground: "#ffffff",
          fidgetBorderWidth: "0px",
          fidgetBorderColor: "#eeeeee",
          fidgetShadow: "none",
          fidgetBorderRadius: "12px",
          gridSpacing: "0",
        },
      },
      fidgetInstanceDatums: {
        "iframe:d06b525b-54ff-4074-bfa3-a39807e42738": {
          id: "iframe:d06b525b-54ff-4074-bfa3-a39807e42738",
          fidgetType: "iframe",
          config: {
            editable: true,
            data: {},
            settings: {
              url: "https://nouns.center/assets",
              size: 1.2,
              cropOffsetX: 0,
              cropOffsetY: -5,
              isScrollable: false,
              showOnMobile: true,
              background: "var(--user-theme-fidget-background)",
              fidgetBorderWidth: "0",
              fidgetBorderColor: "rgba(238, 238, 238, 0)",
              fidgetShadow: "none",
            },
          },
        },
      },
      fidgetTrayContents: [],
      isEditable: false,
      timestamp: "2025-06-20T07:14:04.678Z",
    },
    "Funded Works": {
      name: "Funded Works",
      displayName: "Funded Works",
      layoutID: "0bbe52be-5c9e-4d87-ad76-bd4b114c790a",
      layoutDetails: {
        layoutConfig: {
          layout: [
            {
              w: 12,
              h: 10,
              x: 0,
              y: 0,
              i: "iframe:d06b525b-54ff-4074-bfa3-a39807e42738",
              minW: 2,
              maxW: 36,
              minH: 2,
              maxH: 36,
              moved: false,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false,
            },
          ],
        },
        layoutFidget: "grid",
      },
      theme: {
        id: "Homebase-Tab 3-Theme",
        name: "Homebase-Tab 3-Theme",
        properties: {
          font: "Inter",
          fontColor: "#000000",
          headingsFont: "Inter",
          headingsFontColor: "#000000",
          background: "#ffffff",
          backgroundHTML: "",
          musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804",
          fidgetBackground: "#ffffff",
          fidgetBorderWidth: "0px",
          fidgetBorderColor: "#eeeeee",
          fidgetShadow: "none",
          fidgetBorderRadius: "12px",
          gridSpacing: "0",
        },
      },
      fidgetInstanceDatums: {
        "iframe:d06b525b-54ff-4074-bfa3-a39807e42738": {
          id: "iframe:d06b525b-54ff-4074-bfa3-a39807e42738",
          fidgetType: "iframe",
          config: {
            editable: true,
            data: {},
            settings: {
              url: "https://nouns.world/explore",
              size: 1.2,
              cropOffsetX: 0,
              cropOffsetY: -4,
              isScrollable: false,
              showOnMobile: true,
              background: "var(--user-theme-fidget-background)",
              fidgetBorderWidth: "0",
              fidgetBorderColor: "rgba(238, 238, 238, 0)",
              fidgetShadow: "none",
            },
          },
        },
      },
      fidgetTrayContents: [],
      isEditable: false,
      timestamp: "2025-06-20T07:14:04.678Z",
    },
    "Places": {
      name: "Places",
      displayName: "Places",
      layoutID: "cdb57e20-254c-476f-aadc-bcce8bbfa772",
      layoutDetails: {
        layoutConfig: {
          layout: [
            {
              w: 12,
              h: 10,
              x: 0,
              y: 0,
              i: "iframe:8c9ce902-336e-4f11-ac2e-bf604da43b5d",
              minW: 2,
              maxW: 36,
              minH: 2,
              maxH: 36,
              moved: false,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              isBounded: false,
            },
          ],
        },
        layoutFidget: "grid",
      },
      theme: {
        id: "Homebase-Tab Places-Theme",
        name: "Homebase-Tab Places-Theme",
        properties: {
          background: "#ffffff",
          backgroundHTML: "",
          fidgetBackground: "#ffffff",
          fidgetBorderColor: "#eeeeee",
          fidgetBorderRadius: "0px",
          fidgetBorderWidth: "0px",
          fidgetShadow: "none",
          font: "Inter",
          fontColor: "#000000",
          gridSpacing: "0",
          headingsFont: "Inter",
          headingsFontColor: "#000000",
          musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804",
        },
      },
      fidgetInstanceDatums: {
        "iframe:8c9ce902-336e-4f11-ac2e-bf604da43b5d": {
          config: {
            data: {},
            editable: true,
            settings: {
              background: "var(--user-theme-fidget-background)",
              cropOffsetX: 0,
              cropOffsetY: 0,
              fidgetBorderColor: "rgba(238, 238, 238, 0)",
              fidgetBorderWidth: "0",
              fidgetShadow: "none",
              isScrollable: false,
              showOnMobile: true,
              url: "https://nounspot.com/",
            },
          },
          fidgetType: "iframe",
          id: "iframe:8c9ce902-336e-4f11-ac2e-bf604da43b5d",
        },
      },
      fidgetTrayContents: [],
      isEditable: false,
      timestamp: "2025-08-12T19:44:39.689Z",
    }
  },
  layout: {
    defaultLayoutFidget: "grid",
    gridSpacing: 16,
    theme: {
      background: "#ffffff",
      fidgetBackground: "#ffffff",
      font: "Inter",
      fontColor: "#000000"
    }
  }
};
