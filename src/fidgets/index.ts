// TO DO: Figure out how to do this importing dynamically
import Example from "./example";
import Frame from "./farcaster/Frame";
import Gallery from "./ui/gallery";
import TextFidget from "./ui/Text";
import IFrame from "./ui/IFrame";
import Profile from "./ui/profile";
import Channel from "./ui/channel";
import Grid from "./layout/Grid";
import NounishGovernance from "./community/nouns-dao/NounishGovernance";
import NounishAuctions from "./community/nouns-dao/NounishAuctions";
import Cast from "./farcaster/Cast";
import Feed from "./farcaster/Feed";
import Top8 from "./farcaster/Top8";
// import CreateCast from "./farcaster/CreateCast";
import Links from "./ui/Links";
import snapShot from "./snapshot/SnapShot";
import Swap from "./swap/Swap";
import rss from "./ui/rss";
import VideoFidget from "./ui/Video";
import marketData from "./token/marketData";
import Portfolio from "./token/Portfolio";
import ClankerManager from "./token/ClankerManager";
import Levr from "./token/Levr";
import Directory from "./token/Directory/Directory";
import EmpireBuilder from "./token/EmpireBuilder";
import chat from "./ui/chat";
import BuilderScore from "./farcaster/BuilderScore";
import MobileStack from "./layout/tabFullScreen";
import FramesFidget from "./framesV2/components/FramesFidget";
import NounsHome from "./nouns-home";
import Luma from "./ui/luma";
// import iframely from "./ui/iframely";

export const CompleteFidgets = {
  //
  example:
    process.env.NEXT_PUBLIC_VERCEL_ENV === "development" ? Example : undefined,
  profile:
    process.env.NEXT_PUBLIC_VERCEL_ENV === "development" ? Profile : undefined,
  channel: Channel,
  // Farcaster
  frame: Frame,
  // iframely: iframely,
  feed: Feed,
  cast: Cast,
  // createCast: CreateCast,
  // Basic UI elements
  gallery: Gallery,
  text: TextFidget,
  iframe: IFrame,
  // Nouns
  governance: NounishGovernance,
  nounishAuctions: NounishAuctions,
  nounsHome: NounsHome,
  links: Links,
  // zora: zoraEmbed, -> 500 server error -Frame ancestors block
  SnapShot: snapShot,
  Swap: Swap,
  Rss: rss,
  Luma: Luma,
  Video: VideoFidget,
  Market: marketData,
  Portfolio: Portfolio,
  ClankerManager: ClankerManager,
  Levr: Levr,
  Directory: Directory,
  EmpireBuilder: EmpireBuilder,
  Chat: chat,
  Top8: Top8,
  BuilderScore: BuilderScore,
  FramesV2: FramesFidget,
};

export const LayoutFidgets = {
  grid: Grid,
  tabFullScreen: MobileStack,
};
