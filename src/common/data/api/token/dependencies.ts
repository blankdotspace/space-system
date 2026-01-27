import neynar from "@/common/data/api/neynar";
import type { DirectoryDependencies } from "./types";

export const defaultDependencies: DirectoryDependencies = {
  fetchFn: fetch,
  neynarClient: neynar,
};

