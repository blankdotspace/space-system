import { SpaceConfig } from "@/app/(spaces)/Space";
import { INITIAL_SPACE_CONFIG_EMPTY } from "../../initialSpaceConfig";
import { Address } from "viem";
import { deepClone } from "@/common/lib/utils/deepClone";

export const createInitalProposalSpaceConfigForProposalId = (
  proposalId: string,
  proposerAddress: Address
): Omit<SpaceConfig, "isEditable"> => {
  const config = deepClone(INITIAL_SPACE_CONFIG_EMPTY);

  config.fidgetInstanceDatums = {
    "iframe:2f0a1c7b-da0c-474c-ad30-59915d0096b1": {
      config: {
        editable: true,
        data: {},
        settings: {
          url: `https://www.nouns.camp/proposals/${proposalId}?tab=description`,
          showOnMobile: true,
          customMobileDisplayName: "Proposal",
          background: "var(--user-theme-fidget-background)",
          fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
          fidgetBorderColor: "var(--user-theme-fidget-border-color)",
          fidgetShadow: "var(--user-theme-fidget-shadow)",
        },
      },
      fidgetType: "iframe",
      id: "iframe:2f0a1c7b-da0c-474c-ad30-59915d0096b1",
    },
    "iframe:10e88b10-b999-4ddc-a577-bd0eeb6bc76d": {
      config: {
        editable: true,
        data: {},
        settings: {
          url: "https://euphonious-kulfi-5e5a30.netlify.app/?id=" + proposalId,
          showOnMobile: true,
          customMobileDisplayName: "TLDR",
          background: "var(--user-theme-fidget-background)",
          fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
          fidgetBorderColor: "var(--user-theme-fidget-border-color)",
          fidgetShadow: "var(--user-theme-fidget-shadow)",
        },
      },
      fidgetType: "iframe",
      id: "iframe:10e88b10-b999-4ddc-a577-bd0eeb6bc76d",
    },
    "iframe:1afc071b-ce6b-4527-9419-f2e057a9fb0a": {
      config: {
        editable: true,
        data: {},
        settings: {
          url: `https://www.nouns.camp/proposals/${proposalId}?tab=activity`,
          showOnMobile: true,
          customMobileDisplayName: "Activity",
          background: "var(--user-theme-fidget-background)",
          fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
          fidgetBorderColor: "var(--user-theme-fidget-border-color)",
          fidgetShadow: "var(--user-theme-fidget-shadow)",
        },
      },
      fidgetType: "iframe",
      id: "iframe:1afc071b-ce6b-4527-9419-f2e057a9fb0a",
    },
    "Chat:ffb3cd56-3203-4b94-b842-adab9a7eabc9": {
      config: {
        editable: true,
        data: {},
        settings: {
          background: "var(--user-theme-fidget-background)",
          customMobileDisplayName: "Chat",
          fidgetBorderColor: "var(--user-theme-fidget-border-color)",
          fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
          fidgetShadow: "var(--user-theme-fidget-shadow)",
          roomName: `prop ${proposalId} chat`,
          roomOwnerAddress: proposerAddress,
          showOnMobile: true,
        },
      },
      fidgetType: "Chat",
      id: "Chat:ffb3cd56-3203-4b94-b842-adab9a7eabc9",
    },
  };

  config.layoutDetails = {
    layoutConfig: {
      layout: [
        {
          w: 4,
          h: 10,
          x: 0,
          y: 0,
          i: "iframe:2f0a1c7b-da0c-474c-ad30-59915d0096b1",
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
          x: 4,
          y: 0,
          i: "iframe:10e88b10-b999-4ddc-a577-bd0eeb6bc76d",
          minW: 2,
          maxW: 36,
          minH: 2,
          maxH: 36,
          moved: false,
          static: false,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
        },
        {
          w: 4,
          h: 10,
          x: 8,
          y: 0,
          i: "iframe:1afc071b-ce6b-4527-9419-f2e057a9fb0a",
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
          h: 4,
          x: 4,
          y: 6,
          i: "Chat:ffb3cd56-3203-4b94-b842-adab9a7eabc9",
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
    layoutFidget: "default-layout-fidget", // Assign a valid string value
  };

  config.theme = {
    id: "Homebase-Tab 10-Theme",
    name: "Homebase-Tab 10-Theme",
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
      fidgetBorderWidth: "1px",
      fidgetShadow: "none",
      font: "Inter",
      fontColor: "#000000",
      headingsFont: "Londrina Solid",
      headingsFontColor: "#000000",
      musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804",
      fidgetBorderRadius: "12px",
      gridSpacing: "16",
    },
  };

  return config;
};

export default createInitalProposalSpaceConfigForProposalId;
